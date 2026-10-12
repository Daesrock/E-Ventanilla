package dev.daesrock.eventanilla.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.*
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Rule
import org.junit.Test

class MainScreensTest {
    @get:Rule val compose = createComposeRule()

    private fun show(route: String, largeText: Boolean = false) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val gateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
                check(path in setOf("catalog/branches", "catalog/procedures") && body == null && token == null)
                return JSONObject().put("items", JSONArray())
            }
        }
        val vm = AccessCoordinator(AuthRepository(gateway), AuthResources(context))
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, if (largeText) 2f else density.fontScale)) {
                Box(if (largeText) Modifier.width(320.dp) else Modifier) {
                    EVentanillaTheme { EVentanillaApp(vm, initialRoute = route, catalogRepository = CatalogRepository(gateway)) }
                }
            }
        }
    }

    @Test fun appointmentTabsKeepHonestStatesAndTheExistingAccessFlow() {
        show("appointments")
        compose.onNodeWithText("Activas").performScrollTo().assertIsSelected()
        compose.onNodeWithText("Historial").performClick().assertIsSelected()
        compose.onNodeWithText("El historial estará disponible al habilitar las citas.").assertExists()
        compose.onNodeWithText("Activas").performClick()
        compose.onNodeWithText("Las citas aún no están habilitadas.").assertExists()
        compose.onNodeWithText("Preparar una cita").performScrollTo().performClick()
        compose.onNodeWithText("CURP o correo").assertExists()
    }

    @Test fun notificationPassDoesNotGenerateAFakeReservation() {
        show("notifications")
        compose.onNodeWithTag("appointment_pass_state").assertIsDisplayed()
        compose.onNodeWithText("El pase QR estará disponible cuando se habiliten las reservas.").assertExists()
        compose.onNodeWithText("Cita confirmada").assertDoesNotExist()
        compose.onNodeWithText("AGENDADA").assertDoesNotExist()
        compose.onNodeWithText("Iniciar sesión").performScrollTo().performClick()
        compose.onNodeWithText("CURP o correo").assertExists()
    }

    @Test fun largeTextCanReachBothAppointmentTabsAndTheFooter() {
        show("appointments", largeText = true)
        compose.onNodeWithText("Historial").performScrollTo().assertIsDisplayed().performClick()
        compose.onNodeWithText("El historial estará disponible al habilitar las citas.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Abrir avisos de privacidad de COESA").performScrollTo().assertIsDisplayed()
    }
}
