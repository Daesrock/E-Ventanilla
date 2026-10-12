package dev.daesrock.eventanilla.feature.catalog.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.daesrock.eventanilla.core.design.institutional.*
import dev.daesrock.eventanilla.feature.catalog.data.*

@Composable
internal fun catalogModel(repository: CatalogRepository, key: String): CatalogViewModel = viewModel(
    key = "catalog-$key",
    factory = object : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            require(modelClass.isAssignableFrom(CatalogViewModel::class.java))
            return CatalogViewModel(repository) as T
        }
    }
)

@Composable
internal fun CatalogLoading(state: CatalogState, retry: () -> Unit) {
    if (state.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
    state.error?.let {
        Text(it, color = MaterialTheme.colorScheme.error)
        TextButton(onClick = retry, modifier = Modifier.heightIn(min = 48.dp)) { Text("Reintentar") }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
internal fun MunicipalityFilter(names: List<String>, selected: String?, choose: (String?) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded, { expanded = it && names.isNotEmpty() }) {
        OutlinedTextField(
            value = selected ?: "Todos los municipios",
            onValueChange = {},
            readOnly = true,
            label = { Text("Municipio") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable).testTag("catalog_municipality"),
            colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = androidx.compose.ui.graphics.Color.White)
        )
        ExposedDropdownMenu(expanded, { expanded = false }, modifier = Modifier.heightIn(max = 320.dp)) {
            DropdownMenuItem(text = { Text("Todos los municipios") }, onClick = {
                choose(null)
                expanded = false
            })
            names.forEach { name ->
                DropdownMenuItem(text = { Text(name) }, onClick = {
                    choose(name)
                    expanded = false
                })
            }
        }
    }
}

@Composable
internal fun CatalogSearch(query: String, update: (String) -> Unit, branches: Boolean) {
    OutlinedTextField(
        query,
        update,
        label = { Text(if (branches) "Buscar sede" else "Buscar trámite") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = androidx.compose.ui.graphics.Color.White)
    )
}

@Composable
internal fun BranchCard(branch: CatalogItem, openDetail: () -> Unit) {
    Card(
        onClick = openDetail,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(branch.name, Modifier.semantics { heading() }, style = MaterialTheme.typography.titleMedium)
            branch.address?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            if (branch.address == null) {
                branch.municipality?.takeUnless { branch.name.contains(it, ignoreCase = true) }?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium)
                }
            }
            branch.officeHours?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            branch.phone?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
            BranchActions(branch)
            TextButton(onClick = openDetail, modifier = Modifier.heightIn(min = 48.dp)) { Text("Ver sede", color = MainActionColor) }
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
internal fun BranchActions(branch: CatalogItem) {
    val uriHandler = LocalUriHandler.current
    var failed by remember { mutableStateOf(false) }
    fun open(uri: String) {
        failed = runCatching { uriHandler.openUri(uri) }.isFailure
    }
    val map = branchMapUrl(branch.address)
    val phone = branchPhoneUrl(branch.phone)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        map?.let {
            OutlinedButton(onClick = {
                open(it)
            }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Cómo llegar", color = MainActionColor) }
        }
        phone?.let {
            OutlinedButton(onClick = { open(it) }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Llamar", color = MainActionColor) }
        }
    }
    if (failed) Text("No se pudo abrir una aplicación para esta acción.", color = MaterialTheme.colorScheme.error)
}

@Composable
internal fun DirectoryMapNotice() {
    WorkspaceCard {
        Icon(Icons.Outlined.Map, null, tint = MainActionColor, modifier = Modifier.size(32.dp))
        Text("Ubicación de las sedes", style = MaterialTheme.typography.titleMedium)
        Text("Abre «Cómo llegar» en la sede que quieras consultar.", style = MaterialTheme.typography.bodyMedium)
    }
}
