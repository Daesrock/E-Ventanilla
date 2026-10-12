package dev.daesrock.eventanilla.ui

import android.graphics.Bitmap
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.platform.UriHandler
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.*
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import dev.daesrock.eventanilla.core.design.institutional.PRIVACY_URL
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import java.io.File
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** Usa la interfaz de producción con una API aislada que rechaza toda solicitud. */
class InstitutionalUiTest {
    @get:Rule val compose = createComposeRule()
    private var openedUrl: String? = null
    private fun show(menu: Boolean = false, width: Int? = null, height: Int? = null, fontScale: Float = 1f) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val gateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject =
                error("No se permite red en esta prueba: $path")
        }
        val vm = AccessCoordinator(AuthRepository(gateway), AuthResources(context))
        val uriHandler = object : UriHandler {
            override fun openUri(uri: String) {
                openedUrl = uri
            }
        }
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalUriHandler provides uriHandler, LocalDensity provides Density(density.density, fontScale)) {
                EVentanillaTheme {
                    Box(
                        Modifier.then(
                            if (width !=
                                null
                            ) {
                                Modifier.width(width.dp)
                            } else {
                                Modifier
                            }
                        ).then(if (height != null) Modifier.height(height.dp) else Modifier)
                    ) {
                        EVentanillaApp(vm, initialMenuOpen = menu, catalogRepository = CatalogRepository(gateway))
                    }
                }
            }
        }
    }
    private fun capture(name: String) {
        compose.waitForIdle()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "ui-captures").apply { mkdirs() }
        val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()
        File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun minimalHomeAndFooterPrivacyAction() {
        show()
        compose.onNodeWithTag("rail_home").assertIsDisplayed()
        compose.onNodeWithText("ATENCIÓN PRESENCIAL").assertDoesNotExist()
        compose.onNodeWithTag("rail_home").assertIsSelected()
        compose.onNodeWithTag("institutional_footer").assertIsNotDisplayed()
        capture("01-inicio")
        compose.onNodeWithContentDescription("Abrir avisos de privacidad de COESA").performScrollTo().assertIsDisplayed().performClick()
        assertEquals(PRIVACY_URL, openedUrl)
        capture("02-footer")
    }

    @Test fun menuOpensClosesAndKeepsActiveDestination() {
        show(menu = true)
        compose.onNodeWithText("Navegación principal").assertIsDisplayed()
        capture("03-menu")
        compose.onNodeWithText("Directorio").performClick()
        compose.onNodeWithText("Directorio de sedes").assertIsDisplayed()
        compose.onNodeWithTag("rail_directory").assertIsSelected()
        compose.onNodeWithContentDescription("Abrir menú").performClick()
        compose.onNodeWithText("Directorio").assertIsSelected()
        compose.onNodeWithContentDescription("Cerrar menú lateral").performClick()
        compose.onNodeWithTag("rail_directory").assertIsDisplayed()
    }

    @Test fun headerHasNoSectionSearchAndMenuStillNavigates() {
        show()
        compose.onNodeWithContentDescription("Buscar sección").assertDoesNotExist()
        compose.onNodeWithContentDescription("Abrir menú").performClick()
        compose.onNodeWithText("Trámites y servicios").performClick()
        compose.onNodeWithTag("rail_procedures").assertIsSelected()
        compose.onNodeWithText("Buscar trámite").performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Buscar sección").assertDoesNotExist()
    }

    @Test fun allMainDestinationsKeepFooterAndAccessibleRail() {
        show()
        mainDestinations.forEach { item ->
            compose.onNodeWithTag("rail_${item.route}").performScrollTo().performClick()
            compose.onNodeWithTag("rail_${item.route}").assertIsSelected()
            val bounds = compose.onNodeWithTag("rail_${item.route}").fetchSemanticsNode().boundsInRoot
            assertTrue(bounds.width >= 48 * InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density)
            compose.onNodeWithContentDescription("Abrir avisos de privacidad de COESA").performScrollTo().assertHasClickAction()
        }
    }

    @Test fun narrowScreenAndLargeTextRemainScrollable() {
        show(width = 320, fontScale = 2f)
        compose.onNodeWithContentDescription("Buscar sección").assertDoesNotExist()
        compose.onNodeWithTag("rail_profile").performClick()
        compose.onNodeWithText("Crear cuenta").performScrollTo().assertIsDisplayed()
        compose.onNodeWithContentDescription("Abrir avisos de privacidad de COESA").performScrollTo().assertIsDisplayed()
        capture("05-texto-ampliado")
        compose.onNodeWithContentDescription("Abrir menú").performClick()
        compose.onNodeWithText("Mi perfil").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Cerrar menú").performClick()
    }

    @Test fun shortLandscapeViewportCanReachFooter() {
        show(width = 390, height = 300)
        compose.onNodeWithContentDescription("Abrir avisos de privacidad de COESA").performScrollTo().assertIsDisplayed()
        capture("06-altura-reducida")
    }
}
