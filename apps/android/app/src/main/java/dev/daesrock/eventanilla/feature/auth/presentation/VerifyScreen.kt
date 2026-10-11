package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.app.AccessState
import dev.daesrock.eventanilla.core.data.AuthField
import dev.daesrock.eventanilla.core.data.DeliveryStatus
import kotlinx.coroutines.delay

@Composable
fun VerifyScreen(
    initialEmail: String,
    state: AccessState,
    submit: (String) -> Unit,
    resend: () -> Unit,
    refresh: () -> Unit = {},
    continueVerified: () -> Unit = {},
    retake: () -> Unit = refresh
) {
    val form = fields(state, "verify") { VerificationViewModel() }
    val send = { if (initialEmail.isNotBlank() && form.validate()) submit(form.value(AuthField.CODE)) }
    var tick by remember { mutableLongStateOf(System.nanoTime()) }
    LaunchedEffect(state.delivery) {
        while (true) {
            tick = System.nanoTime()
            delay(1000)
        }
    }
    val delivery = state.delivery
    val status = delivery?.visibleStatus(tick)
    val remaining = delivery?.resendSeconds(tick) ?: 0
    Form("Revisa tu correo") {
        if (initialEmail.isBlank()) {
            Text("Inicia sesión para retomar la verificación de tu correo.", style = MaterialTheme.typography.bodyLarge)
            Submit("Iniciar sesión", state.busy, retake)
        } else {
            val deliveryMessage = state.deliveryNotice?.let { "$it\n$initialEmail" } ?: when (status) {
                DeliveryStatus.PENDING -> "Preparando el envío a $initialEmail…"
                DeliveryStatus.ACCEPTED -> "Código enviado a $initialEmail."
                DeliveryStatus.FAILED -> "No pudimos enviar el código a $initialEmail."
                DeliveryStatus.EXPIRED -> "El código enviado a $initialEmail venció."
                DeliveryStatus.NOT_REQUESTED -> "Correo pendiente de verificar: $initialEmail."
                DeliveryStatus.VERIFIED -> "Correo verificado: $initialEmail."
                null -> "Comprobando el envío a $initialEmail…"
            }
            SelectionContainer {
                Text(
                    deliveryMessage,
                    Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                    style = MaterialTheme.typography.bodyLarge
                )
            }
            if (status == DeliveryStatus.VERIFIED) {
                Submit("Continuar", state.busy, continueVerified)
            } else {
                Input(
                    form,
                    AuthField.CODE,
                    "Código (8 dígitos)",
                    !state.busy,
                    KeyboardType.Number,
                    autofill = ContentType.SmsOtpCode,
                    done = send
                )
                Submit("Verificar correo", state.busy, send)
                TextButton(
                    onClick = resend,
                    enabled = !state.busy && !state.deliveryChecking && remaining == 0L && !state.trackingExpired,
                    modifier = Modifier.heightIn(min = 48.dp)
                ) {
                    val label = when {
                        remaining > 0 -> "Reenviar en $remaining s"
                        status == DeliveryStatus.NOT_REQUESTED -> "Enviar código"
                        else -> "Reenviar código"
                    }
                    Text(label)
                }
                if (state.trackingExpired) {
                    TextButton(
                        onClick = retake,
                        enabled = !state.busy && !state.deliveryChecking,
                        modifier = Modifier.heightIn(min = 48.dp)
                    ) { Text("Retomar verificación") }
                } else if (state.deliveryRefreshAvailable) {
                    TextButton(
                        onClick = refresh,
                        enabled = !state.busy && !state.deliveryChecking,
                        modifier = Modifier.heightIn(min = 48.dp)
                    ) { Text("Actualizar estado") }
                }
            }
        }
    }
}
