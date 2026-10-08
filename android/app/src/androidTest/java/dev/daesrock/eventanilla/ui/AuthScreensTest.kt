package dev.daesrock.eventanilla.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.data.AuthResources
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** Ejercita formularios reales, sin conexión, altas de ciudadanos ni envío de correos. */
class AuthScreensTest {
    @get:Rule val compose = createComposeRule()
    private val resources by lazy { AuthResources(InstrumentationRegistry.getInstrumentation().targetContext) }
    @Test fun loginOrderEmptySubmissionAndContextualVerification() {
        var requests = 0
        compose.setContent { EVentanillaTheme { LoginScreen(AccessState(), { _, _ -> requests++ }, {}, {}) } }
        compose.onNodeWithText("Completar verificación de correo").assertDoesNotExist()
        compose.onNodeWithText("Verificar correo").assertDoesNotExist()
        compose.onNodeWithContentDescription("Mostrar contraseña").assertExists()
        compose.onNode(hasText("Iniciar sesión") and hasClickAction()).performClick()
        compose.onNode(hasSetTextAction() and hasText("CURP o correo")).assertIsFocused()
        compose.onNodeWithText("Escribe tu CURP o correo.").assertIsDisplayed()
        assertEquals(0, requests)
    }
    @Test fun verificationOnlyAfterAuthenticatedPendingResponseAndNoAutomaticResend() {
        var route = ""
        compose.setContent { EVentanillaTheme {
            LoginScreen(AccessState(pendingVerificationEmail = "pending@invalid.test"), { _, _ -> }, { route = it }, {})
        } }
        compose.onNodeWithText("Verificar correo").performScrollTo().performClick()
        assertEquals("verify", route)
    }
    @Test fun serverFieldErrorsFocusAfterRequestCompletes() {
        var state by mutableStateOf(AccessState(busy = true))
        compose.setContent { EVentanillaTheme { LoginScreen(state, { _, _ -> }, {}, {}) } }
        compose.onNode(hasText("Iniciar sesión") and hasClickAction()).assertIsNotEnabled()
        compose.runOnIdle { state = AccessState(errorRevision = 1, fieldErrors = mapOf("password" to "Usa una contraseña diferente.")) }
        compose.onNode(hasSetTextAction() and hasText("Contraseña")).assertIsFocused()
        compose.onNodeWithText("Usa una contraseña diferente.").assertIsDisplayed()
        compose.onNode(hasText("Iniciar sesión") and hasClickAction()).assertIsEnabled()
    }
    @Test fun registrationRequiredSelectionAndOfflineAccentSearch() {
        var requests = 0
        compose.setContent { EVentanillaTheme { RegisterScreen(AccessState(), resources, { requests++ }, {}) } }
        compose.onNodeWithText("Continuar y verificar correo").performScrollTo().performClick()
        compose.onNode(hasSetTextAction() and hasText("Nombre(s)")).assertIsFocused()
        assertEquals(0, requests)
        compose.onNodeWithContentDescription("Municipio: sin seleccionar").performScrollTo().performClick()
        compose.onNode(hasSetTextAction() and hasText("Buscar municipio")).performTextInput("comitan")
        compose.onNodeWithText("Comitán de Domínguez").assertIsDisplayed().performClick()
        compose.onNodeWithContentDescription("Municipio: Comitán de Domínguez").assertExists()
    }
    @Test fun recoveryConfirmationAndDistinctVisibilityControls() {
        var requests = 0
        compose.setContent { EVentanillaTheme { ResetScreen(AccessState(), resources, { _, _ -> requests++ }) } }
        compose.onNodeWithContentDescription("Mostrar contraseña").assertExists()
        compose.onNodeWithContentDescription("Mostrar confirmación").assertExists()
        compose.onNode(hasSetTextAction() and hasText("Código de recuperación")).performTextInput("12345678")
        compose.onNode(hasSetTextAction() and hasText("Nueva contraseña")).performTextInput("una frase larga sin simbolos")
        compose.onNode(hasSetTextAction() and hasText("Confirmar contraseña")).performTextInput("otra frase larga sin simbolos")
        compose.onNodeWithText("Guardar contraseña").performScrollTo().performClick()
        compose.onNodeWithText("Las contraseñas no coinciden.").assertIsDisplayed()
        compose.onNode(hasSetTextAction() and hasText("Confirmar contraseña")).assertIsFocused()
        assertEquals(0, requests)
    }
    @Test fun registrationRemainsScrollableWithDoubleTextSize() {
        compose.setContent { EVentanillaTheme {
            val original = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(original.density, 2f)) {
                RegisterScreen(AccessState(), resources, {}, {})
            }
        } }
        compose.onNode(hasText("Inicia sesión") and hasClickAction()).performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Mostrar confirmación").performScrollTo().assertIsDisplayed().performClick()
        compose.onNodeWithContentDescription("Ocultar confirmación").assertIsDisplayed()
    }
    @Test fun verifyPrefillsEmailWithoutResendingAndAcceptsExplicitResend() {
        var resend = 0
        compose.setContent { EVentanillaTheme { VerifyScreen("pending@invalid.test", AccessState(), { _, _ -> }, { resend++ }) } }
        compose.waitForIdle()
        compose.onNode(hasSetTextAction() and hasText("Correo del registro")).assertTextContains("pending@invalid.test")
        assertEquals(0, resend)
        compose.onNodeWithText("Reenviar código").performClick()
        assertEquals(1, resend)
    }
}
