package dev.daesrock.eventanilla.ui

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.ApiFailure
import dev.daesrock.eventanilla.core.data.ApiGateway
import dev.daesrock.eventanilla.core.data.AuthRepository
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.feature.auth.presentation.*
import java.io.IOException
import java.time.Instant
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** Servicios sustituidos en memoria; no realiza solicitudes a la API ni crea ciudadanos. */
class AccessFlowTest {
    @get:Rule val compose = createComposeRule()
    private class Gateway : ApiGateway {
        val calls = mutableListOf<Pair<String, String?>>()
        val session = "s".repeat(43)
        var verified = false
        var offline = false
        var pending = false
        var expiredTracking = false
        fun receipt() =
            JSONObject().put("trackingToken", "isolated-tracking").put("trackingExpiresAt", Instant.now().plusSeconds(1800).toString())
        fun user() = JSONObject().put("firstName", "fixture").put("lastName", "fixture").put("curp", "fixture")
            .put("email", "fixture@invalid.test").put("municipality", "fixture").put("emailVerified", verified)
        override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
            calls.add(path to token)
            return when (path) {
                "auth/register", "auth/login" -> {
                    if (path == "auth/login") assertTrue(body!!.getBoolean("allowPendingVerification"))
                    JSONObject().put(
                        "token",
                        session
                    ).put("user", user()).put("email", "fixture@invalid.test").put("verification", receipt())
                }
                "auth/verification-context" -> {
                    assertEquals(session, token)
                    expiredTracking = false
                    JSONObject().put("email", "fixture@invalid.test").put("emailVerified", verified).put("verification", receipt())
                }
                "auth/verification-status" -> {
                    if (offline)throw IOException("isolated-network-error")
                    if (expiredTracking)throw ApiFailure(401, "Seguimiento vencido", "VERIFICATION_TRACKING_EXPIRED")
                    assertEquals("isolated-tracking", token)
                    JSONObject().put(
                        "status",
                        if (verified) {
                            "verified"
                        } else if (pending) {
                            "pending"
                        } else {
                            "accepted"
                        }
                    ).put("serverTime", Instant.now().toString())
                        .put("codeExpiresAt", Instant.now().plusSeconds(600).toString()).put("resendAvailableAt", Instant.now().toString())
                }
                "auth/appointment-access" -> {
                    assertEquals(session, token)
                    if (!verified) {
                        throw ApiFailure(
                            403,
                            "Verifica tu correo",
                            "EMAIL_VERIFICATION_REQUIRED",
                            email = "fixture@invalid.test",
                            verification = dev.daesrock.eventanilla.core.data.VerificationReceipt("isolated-tracking")
                        )
                    }
                    JSONObject().put("allowed", true)
                }
                "auth/verify-email" -> {
                    assertEquals("00001234", body!!.getString("code"))
                    verified = true
                    JSONObject().put("user", user()).put("message", "Correo verificado.")
                }
                "auth/resend-verification" -> JSONObject().put("message", "Solicitud recibida.")
                else -> error("Unexpected isolated route: $path")
            }
        }
    }
    private fun model(gateway: Gateway) =
        AccessCoordinator(AuthRepository(gateway), AuthResources(InstrumentationRegistry.getInstrumentation().targetContext))
    private fun registered(vm: AccessCoordinator) {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            vm.register(
                dev.daesrock.eventanilla.core.data.RegistrationRequest(
                    firstName = "fixture",
                    paternalLastName = "fixture",
                    maternalLastName = null,
                    curp = "fixture",
                    municipalityCode = "07001",
                    email = "fixture@invalid.test",
                    password = "fixture"
                )
            ) {
            }
        }
    }

    @Test fun registrationCreatesSessionAndLeavingKeepsPublicInformationAvailable() {
        val gateway = Gateway()
        val vm = model(gateway)
        registered(vm)
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm) } }
        compose.onNodeWithTag("rail_home").assertIsSelected().assertIsDisplayed()
        assertNotNull(vm.state.value.citizen)
        assertFalse(vm.state.value.citizen!!.emailVerified)
        compose.onNodeWithTag("rail_profile").performScrollTo().performClick()
        compose.onNodeWithText("Verificar correo").performScrollTo().performClick()
        compose.onNodeWithText("Revisa tu correo").assertIsDisplayed()
        compose.onNodeWithText("Verificar más tarde").assertDoesNotExist()
        compose.onNodeWithContentDescription("Volver").performClick()
        compose.onNodeWithText("Correo pendiente de verificación").assertIsDisplayed()
        assertTrue(
            InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(
                android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
            )
        )
        compose.waitUntil(5000) {
            compose.onAllNodes(hasTestTag("rail_home") and isSelected()).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithTag("rail_home").performScrollTo().assertIsSelected().assertIsDisplayed()
        compose.onNodeWithTag("rail_directory").performScrollTo().performClick()
        compose.onNodeWithText("Directorio de sedes").assertIsDisplayed()
        assertEquals(1, gateway.calls.count { it.first == "auth/register" })
        assertEquals(0, gateway.calls.count { it.first == "auth/resend-verification" })
        vm.stopVerificationPolling()
    }

    @Test fun expiredTrackingCanBeRetakenWithoutResendingOrReplacingTheSession() {
        val gateway = Gateway()
        val vm = model(gateway)
        registered(vm)
        gateway.expiredTracking = true
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm, initialRoute = "verify") } }
        compose.waitUntil(5000) { vm.state.value.trackingExpired && !vm.state.value.deliveryChecking }
        assertNotNull(vm.state.value.citizen)
        compose.onNodeWithText("Retomar verificación").performScrollTo().performClick()
        compose.waitUntil(5000) { vm.state.value.delivery != null }
        assertEquals(1, gateway.calls.count { it.first == "auth/verification-context" })
        assertEquals(0, gateway.calls.count { it.first == "auth/resend-verification" })
        assertEquals(0, gateway.calls.count { it.first == "auth/login" })
        vm.stopVerificationPolling()
    }

    @Test fun leavingVerificationStopsPendingPolling() {
        val gateway = Gateway()
        val vm = model(gateway)
        registered(vm)
        gateway.pending = true
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm) } }
        compose.onNodeWithTag("rail_profile").performScrollTo().performClick()
        compose.onNodeWithText("Verificar correo").performScrollTo().performClick()
        compose.waitUntil(5000) { vm.state.value.delivery != null }
        compose.onNodeWithContentDescription("Volver").performClick()
        compose.onNodeWithText("Correo pendiente de verificación").assertIsDisplayed()
        val calls = gateway.calls.count { it.first == "auth/verification-status" }
        android.os.SystemClock.sleep(3200)
        assertEquals(calls, gateway.calls.count { it.first == "auth/verification-status" })
        assertFalse(vm.state.value.deliveryChecking)
        assertEquals(0, gateway.calls.count { it.first == "auth/resend-verification" })
    }

    @Test fun pendingSessionVerifiesAndResumesAppointmentWithSameSession() {
        val gateway = Gateway()
        val vm = model(gateway)
        registered(vm)
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm, initialRoute = "appointments") } }
        compose.onNodeWithText("Preparar una cita").performClick()
        compose.onNodeWithText("Revisa tu correo").assertIsDisplayed()
        compose.waitUntil(5000) { vm.state.value.delivery != null }
        compose.onNode(hasSetTextAction() and hasText("Código (8 dígitos)")).performTextInput("00001234")
        compose.onNode(hasText("Verificar correo") and hasClickAction()).performScrollTo().performClick()
        compose.onNodeWithText("Preparar una cita").assertIsDisplayed()
        assertTrue(vm.state.value.citizen!!.emailVerified)
        val accesses = gateway.calls.filter { it.first == "auth/appointment-access" }
        assertEquals(2, accesses.size)
        assertTrue(accesses.all { it.second == gateway.session })
        assertEquals(0, gateway.calls.count { it.first == "auth/login" })
        assertEquals(0, gateway.calls.count { it.first == "auth/resend-verification" })
        vm.stopVerificationPolling()
    }

    @Test fun anonymousAppointmentRequiresLoginBeforeVerification() {
        val gateway = Gateway()
        val vm = model(gateway)
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm, initialRoute = "appointments") } }
        compose.onNodeWithText("Preparar una cita").performClick()
        compose.onNode(hasSetTextAction() and hasText("CURP o correo")).assertIsDisplayed().performTextInput("fixture@invalid.test")
        compose.onNode(hasSetTextAction() and hasText("Contraseña")).performTextInput("ClaveDePrueba🪻")
        compose.onNode(hasText("Iniciar sesión") and hasClickAction()).performClick()
        compose.onNodeWithText("Revisa tu correo").assertIsDisplayed()
        assertEquals(1, gateway.calls.count { it.first == "auth/login" })
        assertEquals(0, gateway.calls.count { it.first == "auth/resend-verification" })
        vm.stopVerificationPolling()
    }

    @Test fun networkFailureOnlyChangesDeliveryNoticeAndRefreshDoesNotSendEmail() {
        val gateway = Gateway()
        val vm = model(gateway)
        registered(vm)
        gateway.offline = true
        compose.setContent { EVentanillaTheme { EVentanillaApp(vm, initialRoute = "verify") } }
        compose.waitUntil(5000) { vm.state.value.deliveryRefreshAvailable }
        compose.onNodeWithText(
            "No pudimos comprobar el envío. Revisa tu conexión y actualiza el estado.",
            substring = true
        ).assertIsDisplayed()
        assertNotNull(vm.state.value.citizen)
        compose.runOnIdle { gateway.offline = false }
        compose.onNodeWithText("Actualizar estado").performScrollTo().performClick()
        compose.waitUntil(5000) { vm.state.value.delivery != null }
        assertEquals(0, gateway.calls.count { it.first == "auth/resend-verification" })
        vm.stopVerificationPolling()
    }
}
