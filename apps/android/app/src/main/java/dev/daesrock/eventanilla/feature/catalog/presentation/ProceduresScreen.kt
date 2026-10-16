package dev.daesrock.eventanilla.feature.catalog.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.daesrock.eventanilla.core.design.institutional.*
import dev.daesrock.eventanilla.feature.catalog.data.*

@Composable
internal fun ProceduresScreen(
    repository: CatalogRepository,
    open: (String) -> Unit,
    name: String?,
    profile: () -> Unit,
    directory: () -> Unit
) {
    val model = catalogModel(repository, "procedures")
    val state by model.state.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(model) { model.loadOnce("procedures") }
    Column(
        Modifier.fillMaxWidth().background(WorkspaceBackground).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ProfileGreeting(name, profile)
        SectionBanner("Trámites y servicios")
        ProcedureBranchSelector(repository, directory)
        SectionHeading("Catálogo de trámites")
        CatalogSearch(query, { query = it }, branches = false)
        CatalogLoading(state) { model.load("procedures") }
        if (!state.loading && state.error == null) {
            val matches = filterCatalog(state.items, query)
            if (matches.isEmpty()) Text(if (state.items.isEmpty()) "Aún no hay información publicada." else "Sin resultados")
            ProcedureGrid(matches, open)
        }
    }
}

@Composable
private fun ProcedureBranchSelector(repository: CatalogRepository, directory: () -> Unit) {
    val model = catalogModel(repository, "branches")
    val state by model.state.collectAsStateWithLifecycle()
    var municipality by rememberSaveable { mutableStateOf<String?>(null) }
    var branchId by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(model) { model.loadOnce("branches") }
    val branches = state.items.filter { municipality == null || it.municipality == municipality }
    val picker = rememberBranchPickerLocation(branches, repository)
    val selected = branches.find { it.id == branchId }
    MunicipalityFilter(branchMunicipalities(state.items), municipality, {
        municipality = it
        branchId = null
    })
    WorkspaceCard {
        Icon(Icons.Outlined.Place, null, tint = MainActionColor, modifier = Modifier.size(32.dp))
        Text(selected?.name ?: "Sede de atención", style = MaterialTheme.typography.titleMedium)
        selected?.address?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
        if (selected != null) {
            BranchActions(selected)
            Text("Disponibilidad de trámites por sede por confirmar.", style = MaterialTheme.typography.bodySmall)
        }
        CatalogLoading(state) { model.load("branches") }
        if (!state.loading && state.error == null) {
            OutlinedButton(onClick = picker.open, enabled = branches.isNotEmpty(), modifier = Modifier.heightIn(min = 48.dp)) {
                Text(if (selected == null) "Elegir sede" else "Cambiar sede", color = MainActionColor)
            }
        }
        TextButton(onClick = directory, modifier = Modifier.heightIn(min = 48.dp)) { Text("Ver directorio", color = MainActionColor) }
    }
    if (picker.visible) {
        BranchPickerDialog(branches, picker) { branch ->
            branchId = branch.id
            picker.close()
        }
    }
}

/** Filas de altura flexible: los nombres completos nunca se cortan ni se truncan. */
@Composable
private fun ProcedureGrid(items: List<CatalogItem>, open: (String) -> Unit) {
    val largeText = LocalDensity.current.fontScale > 1.3f
    BoxWithConstraints(Modifier.fillMaxWidth().testTag("procedure_grid")) {
        val columns = if (maxWidth < 280.dp || largeText) 1 else 2
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items.chunked(columns).forEach { row ->
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { procedure ->
                        key(procedure.id) {
                            Card(
                                onClick = { open(procedure.id) },
                                modifier = Modifier.weight(1f).fillMaxHeight().heightIn(min = 128.dp),
                                colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color.White)
                            ) {
                                Column(
                                    Modifier.fillMaxWidth().padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    horizontalAlignment = Alignment.Start
                                ) {
                                    Icon(Icons.AutoMirrored.Outlined.Article, null, tint = MainActionColor, modifier = Modifier.size(30.dp))
                                    Text(procedure.name, Modifier.semantics { heading() }, style = MaterialTheme.typography.bodyLarge)
                                }
                            }
                        }
                    }
                    if (row.size < columns) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}
