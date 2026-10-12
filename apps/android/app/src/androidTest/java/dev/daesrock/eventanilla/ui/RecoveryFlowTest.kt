package dev.daesrock.eventanilla.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.*
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** Recuperación completa con servicio sustituido; no envía correos ni modifica cuentas. */
class RecoveryFlowTest {
    @get:Rule val compose = createComposeRule()
    private class Gateway : ApiGateway {
        val calls = mutableListOf<String>()
        var offline = false
        var expired = false
        var currentPassword: String? = null
        var pendingVerification: CompletableDeferred<Unit>? = null
        override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
            calls.add(path)
            return when (path) {
                "auth/forgot-password" -> JSONObject().put("message", "Respuesta genérica")
                "auth/verify-reset-code" -> {
                    pendingVerification?.await()
                    if (offline) throw IOException("isolated-offline")
                    if (body!!.getString("code") != "00001234") {
                        throw ApiFailure(
                            400,
                            "Revisa los campos indicados.",
                            fieldErrors = mapOf("code" to "Código incorrecto.")
                        )
                    }
                    JSONObject().put("expiresAt", "2099-01-01T00:00:00Z")
                }
                "auth/reset-password" -> {
                    assertEquals("00001234", body!!.getString("code"))
                    assertEquals("fixture@example.invalid", body.getString("identifier"))
                    if (expired) throw ApiFailure(400, "Revisa los campos indicados.", fieldErrors = mapOf("code" to "El código venció."))
                    if (body.getString("password") == currentPassword) {
                        throw ApiFailure(
                            400,
                            "Revisa los campos indicados.",
                            fieldErrors = mapOf("password" to "La nueva contraseña debe ser diferente de la actual.")
                        )
                    }
                    JSONObject().put("message", "Contraseña actualizada.")
                }
                else -> error("Solicitud inesperada: $path")
            }
        }
    }
    private fun show(gateway: Gateway, initialRoute: String = "forgot"): AccessCoordinator {
        val vm = AccessCoordinator(AuthRepository(gateway), AuthResources(InstrumentationRegistry.getInstrumentation().targetContext))
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm, initialRoute, catalogRepository = CatalogRepository(gateway)) } }
        return vm
    }
    private fun requestCode() {
        compose.onNode(hasSetTextAction() and hasText("CURP o correo")).performTextInput("fixture@example.invalid")
        compose.onNodeWithText("Solicitar código").performClick()
        compose.onNodeWithText("Introduce el código").assertIsDisplayed()
    }
    private fun validateCode() {
        compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)")).performTextReplacement("00001234")
        compose.onNodeWithText("Continuar").performClick()
        compose.onNode(hasSetTextAction() and hasText("Nueva contraseña")).assertIsDisplayed()
    }
    private fun password(value: String = "ClaveDePrueba🪻") {
        compose.onNode(hasSetTextAction() and hasText("Nueva contraseña")).performTextReplacement(value)
        compose.onNode(hasSetTextAction() and hasText("Confirmar contraseña")).performTextReplacement(value)
        compose.onNodeWithText("Guardar contraseña").performScrollTo().performClick()
    }

    @Test fun currentPasswordErrorKeepsTheValidatedCodeAndAllowsCorrection() {
        val gateway = Gateway().apply { currentPassword = "ClaveDePrueba🪻" }
        val vm = show(gateway)
        requestCode()
        validateCode()
        password()
        compose.onNodeWithText("La nueva contraseña debe ser diferente de la actual.").performScrollTo().assertIsDisplayed()
        compose.onNode(hasSetTextAction() and hasText("Nueva contraseña")).assertIsFocused()
        assertTrue(vm.state.value.recoveryCodeVerified)
        compose.onNodeWithText("Introduce el código").assertDoesNotExist()
        password("OtraClaveNueva🪻")
        compose.waitUntil(5000) { !vm.state.value.busy && vm.state.value.message == "Contraseña actualizada." }
        assertEquals(1, gateway.calls.count { it == "auth/verify-reset-code" })
        assertEquals(2, gateway.calls.count { it == "auth/reset-password" })
        assertFalse(vm.state.value.recoveryCodeVerified)
    }

    @Test fun validatesCodeBeforeShowingPasswordAndCompletesWithoutLogin() {
        val gateway = Gateway()
        val vm = show(gateway)
        requestCode()
        compose.onNodeWithText("Nueva contraseña").assertDoesNotExist()
        val code = compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)"))
        code.performTextInput("99999999")
        compose.onNodeWithText("Continuar").performClick()
        compose.onNodeWithText("Código incorrecto.").assertIsDisplayed()
        code.assertIsFocused()
        compose.onNodeWithText("Nueva contraseña").assertDoesNotExist()
        validateCode()
        compose.onNodeWithText("Código (8 dígitos)").assertDoesNotExist()
        password()
        try {
            compose.waitUntil(5000) { !vm.state.value.busy && vm.state.value.message == "Contraseña actualizada." }
        } catch (error: Exception) {
            throw AssertionError("Recuperación incompleta: ${gateway.calls}; ${vm.state.value}\n${compose.onRoot().printToString()}", error)
        }
        compose.onNode(hasText("Iniciar sesión") and hasClickAction()).performScrollTo().assertIsDisplayed()
        assertFalse(vm.state.value.recoveryCodeVerified)
        assertEquals(
            listOf("auth/forgot-password", "auth/verify-reset-code", "auth/verify-reset-code", "auth/reset-password"),
            gateway.calls
        )
    }

    @Test fun networkFailureKeepsCodeScreenAndBackingOutRequiresValidationAgain() {
        val gateway = Gateway()
        val vm = show(gateway)
        requestCode()
        gateway.offline = true
        compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)")).performTextInput("00001234")
        compose.onNodeWithText("Continuar").performClick()
        compose.onNodeWithText("Introduce el código").assertIsDisplayed()
        assertFalse(vm.state.value.recoveryCodeVerified)
        gateway.offline = false
        validateCode()
        compose.onNodeWithContentDescription("Volver").performClick()
        compose.onNodeWithText("Introduce el código").assertIsDisplayed()
        assertFalse(vm.state.value.recoveryCodeVerified)
        assertEquals(0, gateway.calls.count { it == "auth/reset-password" })
    }

    @Test fun expiryDuringPasswordEntryReturnsToCodeWithoutChangingPassword() {
        val gateway = Gateway()
        val vm = show(gateway)
        requestCode()
        validateCode()
        gateway.expired = true
        password()
        compose.onNodeWithText("Introduce el código").assertIsDisplayed()
        compose.onNodeWithText("El código venció.").assertIsDisplayed()
        assertFalse(vm.state.value.recoveryCodeVerified)
    }

    @Test fun openingPasswordRouteDirectlyDoesNotBypassCodeValidation() {
        val gateway = Gateway()
        show(gateway, "reset")
        compose.onNodeWithText("Introduce el código").assertIsDisplayed()
        compose.onNodeWithText("Nueva contraseña").assertDoesNotExist()
        assertTrue(gateway.calls.isEmpty())
    }

    @Test fun leavingWhileCodeIsCheckingDoesNotNavigateAfterTheResponseArrives() {
        val gateway = Gateway()
        val vm = show(gateway)
        requestCode()
        val pending = CompletableDeferred<Unit>()
        gateway.pendingVerification = pending
        compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)")).performTextInput("00001234")
        compose.onNodeWithText("Continuar").performClick()
        compose.onNodeWithContentDescription("Volver").performClick()
        compose.onNodeWithText("Solicitar código").assertIsDisplayed()
        compose.runOnIdle { pending.complete(Unit) }
        compose.waitUntil(5000) { !vm.state.value.busy }
        compose.onNodeWithText("Solicitar código").assertIsDisplayed()
        compose.onNodeWithText("Nueva contraseña").assertDoesNotExist()
        assertFalse(vm.state.value.recoveryCodeVerified)
    }
}
