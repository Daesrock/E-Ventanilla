package dev.daesrock.eventanilla.ui

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.data.DeliveryStatus
import dev.daesrock.eventanilla.core.data.VerificationDelivery
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.feature.auth.presentation.*
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** Ejercita formularios reales, sin conexión, altas de ciudadanos ni envío de correos. */
class AuthScreensTest {
    @get:Rule val compose = createComposeRule()
    private val resources by lazy { AuthResources(InstrumentationRegistry.getInstrumentation().targetContext) }

    @Test fun registrationSeparatesSurnamesAndMaternalSurnameIsOptional() {
        compose.setContent { EVentanillaTheme { RegisterScreen(AccessState(), resources, {}, {}) } }
        compose.onNode(hasSetTextAction() and hasText("Apellido materno", substring = true)).performScrollTo().assertIsDisplayed()
        compose.onNode(hasSetTextAction() and hasText("Nombre(s)")).performScrollTo().performTextInput("Fixture")
        compose.onNodeWithText("Apellidos").assertDoesNotExist()
        compose.onNodeWithText("Continuar y verificar correo").performScrollTo().performClick()
        val paternal = compose.onNode(hasSetTextAction() and hasText("Apellido paterno"))
        paternal.assertIsFocused().performTextInput("de la Cruz")
        compose.onNodeWithText("Continuar y verificar correo").performScrollTo().performClick()
        compose.onNode(hasSetTextAction() and hasText("CURP")).assertIsFocused()
    }

    @Test fun curpAndPhoneRejectInvalidEditsWithoutChangingThePreviousValue() {
        compose.setContent { EVentanillaTheme { RegisterScreen(AccessState(), resources, {}, {}) } }
        val curp = compose.onNode(hasSetTextAction() and hasText("CURP"))
        curp.performScrollTo().performTextReplacement("abcd010101hcsxyz01")
        curp.assertTextContains("ABCD010101HCSXYZ01")
        curp.performTextInput("9")
        curp.assertTextContains("ABCD010101HCSXYZ01")
        curp.performTextReplacement("CURP con espacios")
        curp.assertTextContains("ABCD010101HCSXYZ01")
        val phone = compose.onNode(hasSetTextAction() and hasText("Teléfono (opcional)"))
        phone.performScrollTo().performTextReplacement("0123456789")
        phone.performTextInput("0")
        phone.assertTextContains("0123456789")
        phone.performTextReplacement("01234abc89")
        phone.assertTextContains("0123456789")
        phone.performTextReplacement("１２３４５６７８９０")
        phone.assertTextContains("0123456789")
    }

    @Test fun verificationCodeKeepsInitialZeroesAndRejectsLettersAndExtraDigits() {
        compose.setContent { EVentanillaTheme { VerifyScreen("fixture@invalid.test", AccessState(), {}, {}) } }
        val code = compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)"))
        code.performTextReplacement("00001234")
        code.performTextInput("5")
        code.assertTextContains("00001234")
        code.performTextReplacement("0000x234")
        code.assertTextContains("00001234")
    }

    @Test fun loginOrderEmptySubmissionAndContextualVerification() {
        var requests = 0
        compose.setContent { EVentanillaTheme { LoginScreen(AccessState(), { _, _ -> requests++ }, {}, {}) } }
        compose.onNodeWithText("Completar verificación de correo").assertDoesNotExist()
        compose.onNodeWithText("Verificar correo").assertDoesNotExist()
        compose.onNodeWithText("Usa tu CURP o correo electrónico y la contraseña de tu cuenta.").assertDoesNotExist()
        compose.onNodeWithContentDescription("Mostrar contraseña").assertExists()
        compose.onNode(hasText("Iniciar sesión") and hasClickAction()).performClick()
        compose.onNode(hasSetTextAction() and hasText("CURP o correo")).assertIsFocused()
        compose.onNodeWithText("Escribe tu CURP o correo.").assertIsDisplayed()
        assertEquals(0, requests)
    }

    @Test fun verificationOnlyAfterAuthenticatedPendingResponseAndNoAutomaticResend() {
        var route = ""
        compose.setContent {
            EVentanillaTheme {
                LoginScreen(AccessState(pendingVerificationEmail = "pending@invalid.test"), { _, _ -> }, { route = it }, {})
            }
        }
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
        compose.onNodeWithText("Fuente: INEGI · Agosto de 2026").assertDoesNotExist()
        compose.onNode(hasSetTextAction() and hasText("Buscar municipio")).performTextInput("comitan")
        compose.onNodeWithText("Comitán de Domínguez").assertIsDisplayed().performClick()
        compose.onNodeWithContentDescription("Municipio: Comitán de Domínguez").assertExists()
    }

    @Test fun recoveryConfirmationAndDistinctVisibilityControls() {
        var requests = 0
        compose.setContent { EVentanillaTheme { ResetScreen(AccessState(), resources, { requests++ }) } }
        compose.onNodeWithContentDescription("Mostrar contraseña").assertExists()
        compose.onNodeWithContentDescription("Mostrar confirmación").assertExists()
        compose.onNodeWithText("Código (8 dígitos)").assertDoesNotExist()
        compose.onNode(hasSetTextAction() and hasText("Nueva contraseña")).performTextInput("ClaveDePrueba🪻")
        compose.onNode(hasSetTextAction() and hasText("Confirmar contraseña")).performTextInput("OtraClaveDePrueba🪻")
        compose.onNodeWithText("Guardar contraseña").performScrollTo().performClick()
        compose.onNodeWithText("Las contraseñas no coinciden.").assertIsDisplayed()
        compose.onNode(hasSetTextAction() and hasText("Confirmar contraseña")).assertIsFocused()
        assertEquals(0, requests)
    }

    @Test fun registrationRemainsScrollableWithDoubleTextSize() {
        compose.setContent {
            EVentanillaTheme {
                val original = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides Density(original.density, 2f)) {
                    RegisterScreen(AccessState(), resources, {}, {})
                }
            }
        }
        compose.onNode(hasText("Inicia sesión") and hasClickAction()).performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Mostrar confirmación").performScrollTo().assertIsDisplayed().performClick()
        compose.onNodeWithContentDescription("Ocultar confirmación").assertIsDisplayed()
    }

    @Test fun verificationDestinationIsNotEditableAndOpeningDoesNotSendMail() {
        var resend = 0
        var submitted = ""
        compose.setContent {
            EVentanillaTheme {
                VerifyScreen(
                    "pending@invalid.test",
                    AccessState(delivery = VerificationDelivery(DeliveryStatus.ACCEPTED, System.currentTimeMillis())),
                    {
                        submitted = it
                    },
                    { resend++ }
                )
            }
        }
        compose.waitForIdle()
        compose.onNodeWithText("Código enviado a pending@invalid.test.").assertIsDisplayed()
        compose.onNodeWithText("Correo del registro").assertDoesNotExist()
        compose.onNodeWithText("Destino del código").assertDoesNotExist()
        compose.onNodeWithText("Verificar más tarde").assertDoesNotExist()
        assertEquals(0, resend)
        compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)")).performTextInput("00001234")
        compose.onNode(hasText("Verificar correo") and hasClickAction()).performScrollTo().performClick()
        assertEquals("00001234", submitted)
        compose.onNodeWithText("Reenviar código").performClick()
        assertEquals(1, resend)
    }

    @Test fun longPasswordShowsFieldErrorWithoutIndicatorsOrTruncation() {
        compose.setContent { EVentanillaTheme { ResetScreen(AccessState(), resources, {}) } }
        compose.onNodeWithText("Longitud válida · mínimo 12 caracteres").assertDoesNotExist()
        compose.onNodeWithText("Sin espacios").assertDoesNotExist()
        compose.onNodeWithText("No es una contraseña común").assertDoesNotExist()
        val password = compose.onNode(hasSetTextAction() and hasText("Nueva contraseña"))
        password.performTextInput("z".repeat(12))
        password.performTextReplacement("z".repeat(21))
        compose.onNode(hasSetTextAction() and hasText("Confirmar contraseña")).performClick()
        compose.onNodeWithText("La contraseña es demasiado larga.").assertIsDisplayed()
        compose.onNodeWithContentDescription("Mostrar contraseña").performClick()
        password.assertTextContains("z".repeat(21))
        compose.onNodeWithText("Usa como máximo 20 caracteres.").assertDoesNotExist()
    }

    @Test fun verificationShowsDifferentDeliveryStatesAndCooldownWithoutAutomaticActions() {
        val now = System.currentTimeMillis()
        var state by mutableStateOf(AccessState(delivery = VerificationDelivery(DeliveryStatus.PENDING, now, now + 600000, now + 60000)))
        var resend = 0
        compose.setContent { EVentanillaTheme { VerifyScreen("pending@invalid.test", state, {}, { resend++ }) } }
        compose.onNodeWithText("Preparando el envío a pending@invalid.test…").assertIsDisplayed()
        compose.onNode(hasText("Reenviar en", substring = true) and hasClickAction()).assertIsNotEnabled()
        compose.runOnIdle { state = state.copy(delivery = VerificationDelivery(DeliveryStatus.FAILED, now)) }
        compose.onNodeWithText("No pudimos enviar el código a pending@invalid.test.").assertIsDisplayed()
        compose.runOnIdle { state = state.copy(delivery = VerificationDelivery(DeliveryStatus.EXPIRED, now)) }
        compose.onNodeWithText("El código enviado a pending@invalid.test venció.").assertIsDisplayed()
        compose.runOnIdle {
            state =
                state.copy(
                    deliveryNotice = "No pudimos comprobar el envío. Revisa tu conexión y actualiza el estado.",
                    deliveryRefreshAvailable = true
                )
        }
        compose.onNodeWithText("Actualizar estado").performScrollTo().assertIsDisplayed()
        assertEquals(0, resend)
    }
}
