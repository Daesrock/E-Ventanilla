package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.app.AccessState
import dev.daesrock.eventanilla.core.data.AuthField

@Composable
fun LoginScreen(state: AccessState, submit: (String, String) -> Unit, go: (String) -> Unit, edit: () -> Unit) {
    val form = fields(state, "login") { LoginViewModel() }
    val send = { if (form.validate()) submit(form.value(AuthField.IDENTIFIER), form.value(AuthField.PASSWORD)) }
    Form("Iniciar sesión") {
        Input(form, AuthField.IDENTIFIER, "CURP o correo", !state.busy, autofill = ContentType.Username, edit = edit)
        Input(form, AuthField.PASSWORD, "Contraseña", !state.busy, secret = true, autofill = ContentType.Password, done = send, edit = edit)
        TextButton(onClick = {
            go("forgot")
        }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) { Text("Olvidé mi contraseña") }
        Submit("Iniciar sesión", state.busy, send)
        state.pendingVerificationEmail?.let {
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Tu correo está pendiente de verificación.")
                    TextButton(onClick = {
                        go("verify")
                    }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) { Text("Verificar correo") }
                }
            }
        }
        AccountLink("¿No tienes una cuenta?", "Regístrate", state.busy) { go("register") }
    }
}
