package dev.daesrock.eventanilla.devtools

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.data.DeliveryStatus
import dev.daesrock.eventanilla.core.data.VerificationDelivery
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.feature.auth.presentation.*

/** Vistas de Android Studio sin API, cuentas ni correo. */
@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
fun LoginTemplate() = EVentanillaTheme { LoginScreen(AccessState(), { _, _ -> }, {}, {}) }

@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
fun RegistrationTemplate() {
    val context = LocalContext.current
    val resources = remember { AuthResources(context) }
    EVentanillaTheme { RegisterScreen(AccessState(), resources, {}, {}) }
}

@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
fun VerificationTemplate() = EVentanillaTheme {
    VerifyScreen(
        "[correo]",
        AccessState(delivery = VerificationDelivery(DeliveryStatus.ACCEPTED, System.currentTimeMillis())),
        {},
        {}
    )
}

@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
fun RecoveryTemplate() = EVentanillaTheme { ForgotScreen(AccessState(), {}) }

@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
fun RecoveryCodeTemplate() = EVentanillaTheme { RecoveryCodeScreen(AccessState(), {}, {}) }

@Preview(showBackground = true, widthDp = 393, heightDp = 852)
@Composable
fun ResetTemplate() {
    val context = LocalContext.current
    val resources = remember { AuthResources(context) }
    EVentanillaTheme { ResetScreen(AccessState(), resources, {}) }
}
