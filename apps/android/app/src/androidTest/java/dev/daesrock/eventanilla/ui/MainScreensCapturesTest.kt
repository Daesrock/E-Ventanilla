package dev.daesrock.eventanilla.ui

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.*
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import java.io.File
import org.json.JSONObject
import org.junit.Rule
import org.junit.Test

/** Capturas con lecturas del catálogo público del VPS. Nunca accede a ciudadanos. */
class MainScreensCapturesTest {
    @get:Rule val compose = createComposeRule()

    private fun capture(name: String) {
        compose.waitForIdle()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "main-screen-captures").apply { mkdirs() }
        val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()
        File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun capturesTheFourPublicScreenLayouts() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val authGateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject =
                error("No se permite acceder a cuentas en esta revisión visual.")
        }
        val client = ApiClient()
        val readOnlyGateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
                check(path.startsWith("catalog/") && body == null && token == null)
                return client.request(path)
            }
        }
        val vm = AccessCoordinator(AuthRepository(authGateway), AuthResources(context))
        compose.setContent {
            EVentanillaTheme { EVentanillaApp(vm, initialRoute = "directory", catalogRepository = CatalogRepository(readOnlyGateway)) }
        }
        compose.waitUntil(25000) { compose.onAllNodesWithText("VUGE · Tuxtla Gutiérrez").fetchSemanticsNodes().isNotEmpty() }
        capture("01-directorio")
        compose.onNodeWithText("VUGE · Tuxtla Gutiérrez").performScrollTo()
        capture("02-tarjeta-sede")
        compose.onNodeWithTag("rail_procedures").performScrollTo().performClick()
        compose.waitUntil(25000) { compose.onAllNodesWithTag("procedure_grid").fetchSemanticsNodes().isNotEmpty() }
        capture("03-tramites")
        compose.onNodeWithText("Catálogo de trámites").performScrollTo()
        capture("04-cuadricula")
        compose.onNodeWithTag("rail_appointments").performScrollTo().performClick()
        capture("05-citas")
        compose.onNodeWithText("Historial").performScrollTo().performClick()
        capture("06-historial")
        compose.onNodeWithTag("rail_notifications").performScrollTo().performClick()
        capture("07-notificaciones")
        compose.onNodeWithContentDescription("Abrir menú").performClick()
        capture("08-menu")
    }
}
