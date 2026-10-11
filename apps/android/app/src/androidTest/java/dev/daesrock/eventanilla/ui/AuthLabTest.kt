package dev.daesrock.eventanilla.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.devtools.AuthLab
import dev.daesrock.eventanilla.feature.auth.presentation.*
import org.junit.Rule
import org.junit.Test

class AuthLabTest {
    @get:Rule val compose = createComposeRule()

    @Test fun opensVerificationDirectlyAndSimulatesWithoutAnAccount() {
        compose.setContent { EVentanillaTheme { AuthLab("verify", "failed") } }
        compose.onNodeWithText("PRUEBA LOCAL · Sin envíos ni cuentas reales").assertIsDisplayed()
        compose.onNodeWithText("No pudimos enviar el código a [correo].").assertIsDisplayed()
        compose.onNodeWithText("Reenviar código").performScrollTo().performClick()
        compose.onNodeWithText("Preparando el envío a [correo]…").assertIsDisplayed()
        compose.onNodeWithText("Actualizar estado").performScrollTo().performClick()
        compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)")).performScrollTo().performTextInput("00001234")
        compose.onNode(hasText("Verificar correo") and hasClickAction()).performScrollTo().performClick()
        compose.onNodeWithText("Correo verificado: [correo].").assertIsDisplayed()
        compose.onNodeWithText("Verificar más tarde").assertDoesNotExist()
        compose.onNodeWithText("Reiniciar").performClick()
        compose.onNodeWithText("No pudimos enviar el código a [correo].").assertIsDisplayed()
    }

    @Test fun choosesAFormWithoutRegistrationAndCanReturnToTemplates() {
        compose.setContent { EVentanillaTheme { AuthLab() } }
        compose.onNode(hasText("Restablecer contraseña") and hasClickAction()).performScrollTo().performClick()
        compose.onNode(hasText("Nueva contraseña") and !hasSetTextAction()).assertIsDisplayed()
        compose.onNodeWithText("Longitud válida · mínimo 12 caracteres").assertDoesNotExist()
        compose.onNodeWithContentDescription("Volver").performClick()
        compose.onNodeWithText("Abre una plantilla").assertIsDisplayed()
    }
}
