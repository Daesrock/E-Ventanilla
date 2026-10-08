package dev.daesrock.eventanilla.ui

import android.graphics.Bitmap
import android.os.SystemClock
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import java.io.File

/** Capturas de los formularios de producción vacíos, sin cuentas ni solicitudes. */
class EmptyAuthCapturesTest {
    @get:Rule val compose = createComposeRule()
    private fun show(route: String) {
        compose.setContent { EVentanillaTheme { EVentanillaApp(initialRoute = route) } }
        compose.waitForIdle()
        compose.onNodeWithContentDescription("Notificaciones").assertDoesNotExist()
        compose.onNodeWithContentDescription("Volver").assertExists()
    }
    private fun capture(name: String) {
        compose.waitForIdle()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        instrumentation.waitForIdleSync()
        // Espera a que el compositor presente el último desplazamiento antes de capturar.
        SystemClock.sleep(300)
        // La conexión de accesibilidad puede tardar al iniciarse en la primera captura.
        compose.waitUntil(timeoutMillis = 5000) {
            instrumentation.uiAutomation.rootInActiveWindow?.packageName == instrumentation.targetContext.packageName
        }
        val directory = File(instrumentation.targetContext.getExternalFilesDir(null), "auth-captures").apply { mkdirs() }
        val bitmap = checkNotNull(instrumentation.uiAutomation.takeScreenshot())
        File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }
    @Test fun login() { show("login"); capture("01-iniciar-sesion") }
    @Test fun registration() {
        show("register"); capture("02-registro-datos")
        compose.onNodeWithContentDescription("Mostrar confirmación").performScrollTo()
        capture("03-registro-acceso")
        compose.onNode(hasText("Inicia sesión") and hasClickAction()).performScrollTo()
        capture("04-registro-opcionales")
    }
    @Test fun verification() { show("verify"); capture("05-verificacion") }
    @Test fun recovery() { show("forgot"); capture("06-recuperacion") }
    @Test fun reset() { show("reset"); capture("07-nueva-contrasena") }
}
