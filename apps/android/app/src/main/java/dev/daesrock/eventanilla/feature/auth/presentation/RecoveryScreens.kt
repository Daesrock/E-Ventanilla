package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.*
import dev.daesrock.eventanilla.app.AccessState
import dev.daesrock.eventanilla.core.data.AuthField
import dev.daesrock.eventanilla.core.data.AuthResources

@Composable
fun ForgotScreen(state: AccessState, submit: (String) -> Unit) {
    val form = fields(state, "forgot") { ForgotPasswordViewModel() }
    val send = { if (form.validate()) submit(form.value(AuthField.IDENTIFIER)) }
    Form("Recuperar contraseña") {
        Input(form, AuthField.IDENTIFIER, "CURP o correo", !state.busy, autofill = ContentType.Username, done = send)
        Submit("Solicitar código", state.busy, send)
    }
}

@Composable
fun RecoveryCodeScreen(state: AccessState, submit: (String) -> Unit, requestNew: () -> Unit) {
    val form = fields(state, "reset-code") { VerificationViewModel() }
    val send = { if (form.validate()) submit(form.value(AuthField.CODE)) }
    Form("Introduce el código", "Si existe una cuenta con ese correo o CURP, enviaremos un código al correo registrado.") {
        Input(
            form,
            AuthField.CODE,
            "Código (8 dígitos)",
            !state.busy,
            KeyboardType.NumberPassword,
            autofill = ContentType.SmsOtpCode,
            done = send
        )
        Submit("Continuar", state.busy, send)
        TextButton(onClick = requestNew, enabled = !state.busy) { Text("Solicitar otro código") }
    }
}

@Composable
fun ResetScreen(state: AccessState, resources: AuthResources, submit: (String) -> Unit) {
    val form = fields(state, "reset") { ResetPasswordViewModel(resources.blockedPasswords) }
    val send = { if (form.validate()) submit(form.value(AuthField.PASSWORD)) }
    Form("Nueva contraseña") {
        Input(form, AuthField.PASSWORD, "Nueva contraseña", !state.busy, secret = true, autofill = ContentType.NewPassword)
        Input(
            form,
            AuthField.CONFIRMATION,
            "Confirmar contraseña",
            !state.busy,
            secret = true,
            confirmation = true,
            autofill = ContentType.NewPassword,
            done = send
        )
        Submit("Guardar contraseña", state.busy, send)
    }
}
