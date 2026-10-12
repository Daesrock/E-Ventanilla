package dev.daesrock.eventanilla.feature.notifications.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.core.design.institutional.*

@Composable
fun NotificationsScreen(name: String?, openProfile: () -> Unit, signIn: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().background(WorkspaceBackground).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ProfileGreeting(name, openProfile)
        SectionHeading("Próxima cita")
        WorkspaceCard(Modifier.testTag("appointment_pass_state")) {
            Icon(Icons.Outlined.ConfirmationNumber, null, tint = MainActionColor, modifier = Modifier.size(48.dp))
            Text("El pase QR estará disponible cuando se habiliten las reservas.", style = MaterialTheme.typography.bodyMedium)
        }
        SectionHeading("Notificaciones")
        WorkspaceCard {
            Icon(Icons.Outlined.NotificationsNone, null, tint = MainActionColor, modifier = Modifier.size(32.dp))
            Text("Los avisos de citas estarán disponibles al habilitar la agenda.", style = MaterialTheme.typography.bodyMedium)
            if (name == null) {
                OutlinedButton(onClick = signIn, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text("Iniciar sesión", color = MainActionColor)
                }
            }
        }
    }
}
