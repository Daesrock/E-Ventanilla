package dev.daesrock.eventanilla.feature.appointments.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.EventNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.core.design.institutional.*

/** Presentación de la agenda. La reserva seguirá pendiente de las reglas de atención. */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun AppointmentsScreen(name: String?, busy: Boolean, openProfile: () -> Unit, prepare: () -> Unit) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    Column(
        Modifier.fillMaxWidth().background(WorkspaceBackground).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ProfileGreeting(name, openProfile)
        SectionHeading("Mis citas")
        WorkspaceCard {
            Text("Agendar una cita", style = MaterialTheme.typography.titleMedium)
            AppointmentSteps()
            Button(
                onClick = prepare,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MainActionColor)
            ) { Text("Preparar una cita") }
        }
        PrimaryTabRow(selectedTabIndex = tab, containerColor = WorkspaceBackground, contentColor = MainActionColor) {
            listOf("Activas", "Historial").forEachIndexed { index, title ->
                Tab(selected = tab == index, onClick = { tab = index }, text = { Text(title) }, modifier = Modifier.heightIn(min = 48.dp))
            }
        }
        WorkspaceCard(Modifier.testTag("appointments_state")) {
            Icon(Icons.AutoMirrored.Outlined.EventNote, null, tint = MainActionColor, modifier = Modifier.size(36.dp))
            Text(
                if (tab == 0) "Las citas aún no están habilitadas." else "El historial estará disponible al habilitar las citas.",
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}

@Composable
private fun AppointmentSteps() {
    // Una columna también se adapta a teléfonos estrechos y texto ampliado.
    listOf("Sede", "Trámite", "Fecha y hora").forEachIndexed { index, title ->
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Surface(color = androidx.compose.ui.graphics.Color(0xFFE5F5F2), shape = MaterialTheme.shapes.small) {
                Text("${index + 1}", Modifier.padding(horizontal = 10.dp, vertical = 6.dp), color = MainActionColor)
            }
            Text(title, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
