package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import dev.daesrock.eventanilla.core.data.AuthField
import dev.daesrock.eventanilla.core.data.AuthValidation
import dev.daesrock.eventanilla.core.data.Municipality
import kotlinx.coroutines.launch

@Composable
@OptIn(ExperimentalMaterial3Api::class)
internal fun MunicipalityField(form: Fields, municipalities: List<Municipality>, enabled: Boolean) {
    var open by remember { mutableStateOf(false) }
    val selected = municipalities.find { it.code == form.value(AuthField.MUNICIPALITY) }
    val error = form.error(AuthField.MUNICIPALITY) ?: form.remote[AuthField.MUNICIPALITY]
    val bring = remember { BringIntoViewRequester() }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxWidth()) {
        ExposedDropdownMenuBox(expanded = open, onExpandedChange = { if (enabled) open = it }) {
            OutlinedTextField(
                value = selected?.name ?: "Selecciona tu municipio", onValueChange = {}, readOnly = true,
                enabled = enabled, label = { Text("Municipio") }, isError = error != null, maxLines = 3,
                trailingIcon = { Icon(Icons.Default.ExpandMore, null) },
                modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled)
                    .fillMaxWidth().heightIn(min = 56.dp).focusRequester(form.focus.getValue(AuthField.MUNICIPALITY))
                    .bringIntoViewRequester(bring).onFocusChanged { if (it.isFocused) scope.launch { bring.bringIntoView() } }
                    .semantics {
                        contentDescription = "Municipio: ${selected?.name ?: "sin seleccionar"}"
                        if (error != null) error(error)
                    }
            )
        }
        if (error !=
            null
        ) {
            Text(
                error,
                Modifier.padding(start = 16.dp, top = 4.dp).semantics {
                    liveRegion = LiveRegionMode.Polite
                },
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
    if (open) {
        MunicipalityDialog(municipalities, selected?.code, {
            open = false
            form.touched[AuthField.MUNICIPALITY] = true
        }) {
            form.set(AuthField.MUNICIPALITY, it.code)
            form.remote.remove(AuthField.MUNICIPALITY)
            open = false
        }
    }
}

@Composable
internal fun MunicipalityDialog(
    municipalities: List<Municipality>,
    selected: String?,
    dismiss: () -> Unit,
    choose: (Municipality) -> Unit
) {
    var query by remember { mutableStateOf("") }
    val filtered =
        remember(query, municipalities) { municipalities.filter { AuthValidation.search(it.name).contains(AuthValidation.search(query)) } }
    Dialog(onDismissRequest = dismiss) {
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
            Column(
                Modifier.fillMaxWidth().heightIn(max = 580.dp).imePadding().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Municipio de Chiapas", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(
                    query,
                    { query = it },
                    label = { Text("Buscar municipio") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(autoCorrectEnabled = false)
                )
                Text(
                    "${filtered.size} resultados",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.semantics {
                        liveRegion =
                            LiveRegionMode.Polite
                    }
                )
                LazyColumn(Modifier.weight(1f, fill = false)) {
                    items(filtered, key = { it.code }) { item ->
                        TextButton(
                            onClick = { choose(item) },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                                .semantics {
                                    role = Role.RadioButton
                                    this.selected = item.code == selected
                                }
                        ) {
                            Text(item.name, Modifier.fillMaxWidth(), style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                    if (filtered.isEmpty()) item { Text("No se encontraron municipios.", Modifier.padding(12.dp)) }
                }
                TextButton(onClick = dismiss, modifier = Modifier.heightIn(min = 48.dp)) { Text("Cerrar") }
            }
        }
    }
}
