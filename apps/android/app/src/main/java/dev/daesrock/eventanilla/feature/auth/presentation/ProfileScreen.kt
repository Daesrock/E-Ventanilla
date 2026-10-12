package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.core.data.Citizen

@Composable
fun ProfileScreen(citizen: Citizen, busy: Boolean, logout: () -> Unit, verify: () -> Unit = {}, scrollable: Boolean = true) {
    Form("Mi perfil", citizen.fullName, scrollable = scrollable) {
        listOf(
            "CURP" to citizen.curp,
            "Correo electrónico" to citizen.email,
            "Municipio" to citizen.municipality,
            "Teléfono" to citizen.phone,
            "RFC" to citizen.rfc
        ).forEach { (label, value) ->
            if (value != null) {
                Text(label, style = MaterialTheme.typography.labelMedium, color = AuthGreen)
                Text(value, style = MaterialTheme.typography.bodyLarge)
                HorizontalDivider()
            }
        }
        if (!citizen.emailVerified) {
            TextButton(onClick = verify, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Verificar correo")
            }
        }
        OutlinedButton(onClick = logout, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
            Text("Cerrar sesión")
        }
    }
}
