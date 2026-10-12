package dev.daesrock.eventanilla.feature.catalog.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.daesrock.eventanilla.core.design.institutional.*
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository

@Composable
fun CatalogDetailScreen(path: String, id: String, repository: CatalogRepository) {
    val model = catalogModel(repository, "$path/$id")
    val state by model.state.collectAsStateWithLifecycle()
    val uriHandler = LocalUriHandler.current
    LaunchedEffect(model) { model.loadOnce(path, id) }
    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        CatalogLoading(state) { model.load(path, id) }
        state.detail?.let { item ->
            SectionHeading(item.name)
            if (path == "branches") {
                CatalogField("Dirección", item.address)
                CatalogField("Teléfono", item.phone)
                CatalogField("Correo electrónico", item.email)
                CatalogField("Horario de atención", item.officeHours)
                if (item.address == null) Text("Dirección por confirmar.")
                BranchActions(item)
                Text("Los servicios disponibles en esta sede están por confirmar.")
            } else {
                item.description?.let { Text(it) }
                CatalogField("Requisitos", item.requirements)
                CatalogField("Costo", item.cost?.let { "$it MXN" })
                val pending = when {
                    item.requirements == null && item.cost == null -> "Requisitos y costos por confirmar."
                    item.requirements == null -> "Requisitos por confirmar."
                    item.cost == null -> "Costo por confirmar."
                    else -> null
                }
                pending?.let { Text(it) }
                Text("La disponibilidad por sede está por confirmar.")
            }
            item.sourceUrl?.takeIf { it.startsWith("https://coesa.chiapas.gob.mx/") }?.let { source ->
                TextButton(onClick = {
                    uriHandler.openUri(source)
                }, modifier = Modifier.heightIn(min = 48.dp)) { Text("Ver fuente oficial") }
            }
        }
    }
}

@Composable
private fun CatalogField(label: String, value: String?) {
    if (value != null) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MainActionColor)
            Text(value, style = MaterialTheme.typography.bodyLarge)
        }
    }
}
