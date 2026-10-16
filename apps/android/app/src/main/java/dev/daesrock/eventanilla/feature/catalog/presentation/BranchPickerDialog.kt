package dev.daesrock.eventanilla.feature.catalog.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.feature.catalog.data.*

@Composable
internal fun BranchPickerDialog(branches: List<CatalogItem>, picker: BranchPickerLocation, choose: (CatalogItem) -> Unit) {
    val choices = remember(branches, picker.routes) { orderBranchesByRoute(branches, picker.routes) }
    val nearby = choices.any { it.route != null }
    val uri = LocalUriHandler.current
    AlertDialog(
        onDismissRequest = picker.close,
        modifier = Modifier.testTag("branch_picker"),
        title = { Text(if (nearby) "Sedes cercanas" else "Elige una sede") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (picker.locating) {
                    LinearProgressIndicator(Modifier.fillMaxWidth().testTag("branch_location_progress"))
                    Text("Buscando sedes cercanas…")
                } else {
                    if (nearby) Text("Recorrido en automóvil · tiempo estimado", style = MaterialTheme.typography.bodySmall)
                    if (picker.routingUnavailable) {
                        Text(
                            "No pudimos calcular los recorridos. Puedes elegir una sede.",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    LazyColumn(Modifier.heightIn(max = 320.dp).testTag("branch_choices")) {
                        items(choices, key = { it.branch.id }) { choice ->
                            TextButton(
                                onClick = { choose(choice.branch) },
                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("branch_choice_${choice.branch.id}"),
                                shape = RectangleShape
                            ) {
                                Column(Modifier.fillMaxWidth()) {
                                    Text(choice.branch.name)
                                    choice.route?.let { Text(branchRouteLabel(it), style = MaterialTheme.typography.bodySmall) }
                                }
                            }
                        }
                    }
                    if (nearby) {
                        TextButton(onClick = {
                            uri.openUri("https://www.openstreetmap.org/copyright")
                        }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text("© colaboradores de OpenStreetMap", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = picker.close) { Text("Cerrar") } }
    )
}
