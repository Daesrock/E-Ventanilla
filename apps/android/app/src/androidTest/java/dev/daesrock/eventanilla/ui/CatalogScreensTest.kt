package dev.daesrock.eventanilla.ui

import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
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
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import dev.daesrock.eventanilla.feature.catalog.presentation.LocalBranchLocationSource
import dev.daesrock.eventanilla.feature.catalog.presentation.LocalBranchRoutingSource
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** API técnica aislada. No registra cuentas ni publica datos en el VPS. */
class CatalogScreensTest {
    @get:Rule val compose = createComposeRule()
    private var openedUrl: String? = null
    private class Gateway : ApiGateway {
        var fail = false
        var empty = false
        var missingDetail = false
        val requests = mutableListOf<String>()
        val branch = JSONObject().put("id", "technical-branch").put("name", "Sede técnica · Comitán")
            .put("address", JSONObject.NULL).put("sourceUrl", "https://coesa.chiapas.gob.mx/")
        val procedure = JSONObject().put("id", "technical-procedure").put("name", "Trámite técnico")
            .put("cost", JSONObject.NULL).put("requirements", JSONObject.NULL)
            .put("sourceUrl", "https://coesa.chiapas.gob.mx/")
        var branchItems = JSONArray().put(branch)
        override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
            check(body == null && token == null)
            requests.add(path)
            if (fail) throw ApiFailure(503, "Prueba de fallo")
            return when (path) {
                "catalog/branches" -> JSONObject().put("items", if (empty) JSONArray() else branchItems)
                "catalog/procedures" -> JSONObject().put("items", if (empty) JSONArray() else JSONArray().put(procedure))
                "catalog/branches/technical-branch" -> if (missingDetail) throw ApiFailure(404, "Prueba de ausencia") else branch
                "catalog/procedures/technical-procedure" -> procedure
                else -> error("Solicitud ajena al catálogo: $path")
            }
        }
    }
    private fun show(
        gateway: Gateway,
        route: String = "directory",
        enlarged: Boolean = false,
        locationSource: TestBranchLocationSource = TestBranchLocationSource()
    ) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val vm = AccessCoordinator(AuthRepository(gateway), AuthResources(context))
        val locationPermission = LocationPermissionTestOwner()
        val routingSource = TestBranchRoutingSource()
        val handler = object : UriHandler {
            override fun openUri(uri: String) {
                openedUrl = uri
            }
        }
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(
                LocalUriHandler provides handler,
                LocalBranchLocationSource provides locationSource,
                LocalBranchRoutingSource provides routingSource,
                LocalActivityResultRegistryOwner provides locationPermission,
                LocalDensity provides Density(density.density, if (enlarged) 2f else density.fontScale)
            ) {
                Box(if (enlarged) Modifier.width(320.dp) else Modifier) {
                    EVentanillaTheme { EVentanillaApp(vm, initialRoute = route, catalogRepository = CatalogRepository(gateway)) }
                }
            }
        }
    }
    private fun waitFor(text: String) {
        compose.waitUntil(10000) { compose.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty() }
    }

    @Test fun searchDetailAndBackPreserveDirectoryWithoutLogin() {
        val gateway = Gateway()
        show(gateway)
        waitFor("Sede técnica · Comitán")
        compose.onNodeWithText("Buscar sede").performTextInput("COMITAN")
        compose.onNodeWithText("Sede técnica · Comitán").performScrollTo().performClick()
        waitFor("Dirección por confirmar.")
        compose.onNodeWithText("Ver fuente oficial").performScrollTo().performClick()
        assertEquals("https://coesa.chiapas.gob.mx/", openedUrl)
        compose.onNodeWithContentDescription("Volver").performClick()
        waitFor("Buscar sede")
        compose.onNodeWithText("COMITAN").assertExists()
        compose.onNodeWithText("Buscar sede").performTextClearance()
        compose.onNodeWithText("Buscar sede").performTextInput("sin coincidencias")
        compose.onNodeWithText("Sin resultados").assertExists()
        assertEquals(listOf("catalog/branches", "catalog/branches/technical-branch"), gateway.requests)
    }

    @Test fun procedureUnknownCostDoesNotClaimFreeService() {
        show(Gateway(), "procedures")
        waitFor("Trámite técnico")
        compose.onNodeWithText("Trámite técnico").performScrollTo().performClick()
        waitFor("Requisitos y costos por confirmar.")
        compose.onNodeWithText("Requisitos y costos por confirmar.").assertExists()
        compose.onNodeWithText("Gratuito").assertDoesNotExist()
        compose.onNodeWithText("Ver fuente oficial").performScrollTo().assertIsDisplayed()
    }

    @Test fun connectionFailureAllowsRetryWithoutInventingInformation() {
        val gateway = Gateway().apply { fail = true }
        show(gateway)
        waitFor("Reintentar")
        compose.onNodeWithText("Sede técnica · Comitán").assertDoesNotExist()
        gateway.fail = false
        compose.onNodeWithText("Reintentar").performScrollTo().performClick()
        waitFor("Sede técnica · Comitán")
        compose.onNodeWithText("Sede técnica · Comitán").assertExists()
    }

    @Test fun emptyCatalogDoesNotReplaceMissingInformation() {
        show(Gateway().apply { empty = true })
        waitFor("Aún no hay información publicada.")
        compose.onNodeWithText("Aún no hay información publicada.").assertExists()
        compose.onNodeWithText("Sede técnica · Comitán").assertDoesNotExist()
    }

    @Test fun enlargedTextRemainsScrollableAndMissingDetailIsNotAConnectionError() {
        val gateway = Gateway().apply { missingDetail = true }
        show(gateway, enlarged = true)
        waitFor("Sede técnica · Comitán")
        compose.onNodeWithText("Sede técnica · Comitán").performScrollTo().assertIsDisplayed().performClick()
        waitFor("Esta información ya no está disponible.")
        compose.onNodeWithText("Esta información ya no está disponible.").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Reintentar").performScrollTo().assertIsDisplayed()
    }

    @Test fun municipalityFilterAndBranchActionsUseOnlyPublishedFields() {
        val gateway = Gateway()
        gateway.branch.put("municipality", "Comitán de Domínguez").put("address", "Dirección técnica # 2")
            .put("phone", "961.123.4567 ext. 12")
        val second = JSONObject().put("id", "second-branch").put("name", "Segunda sede técnica")
            .put("municipality", "Palenque").put("address", "Otra dirección técnica")
        gateway.branchItems.put(second)
        show(gateway)
        waitFor("Sede técnica · Comitán")
        compose.onNodeWithTag("catalog_municipality").performScrollTo().performClick()
        compose.onNodeWithText("Comitán de Domínguez").performClick()
        compose.onNodeWithText("Segunda sede técnica").assertDoesNotExist()
        compose.onNodeWithText("Cómo llegar").performScrollTo().performClick()
        assertEquals("https://www.google.com/maps/search/?api=1&query=Direcci%C3%B3n+t%C3%A9cnica+%23+2", openedUrl)
        compose.onNodeWithText("Llamar").performScrollTo().performClick()
        assertEquals("tel:+529611234567", openedUrl)
        compose.onNodeWithText("ABIERTO").assertDoesNotExist()
        compose.onNodeWithText("0.0 Km").assertDoesNotExist()
    }

    @Test fun selectingABranchDoesNotClaimItsProceduresAreConfirmed() {
        val gateway = Gateway()
        show(gateway, "procedures")
        waitFor("Elegir sede")
        compose.onNodeWithText("Elegir sede").performScrollTo().performClick()
        compose.onNodeWithText("Sede técnica · Comitán").performClick()
        compose.onNodeWithText("Disponibilidad de trámites por sede por confirmar.").assertExists()
        compose.onNodeWithText("Trámite técnico").performScrollTo().assertIsDisplayed()
        compose.onNodeWithTag("procedure_grid").assertExists()
        compose.onNodeWithText("Ver directorio").performScrollTo().performClick()
        compose.onNodeWithTag("rail_directory").assertIsSelected()
    }

    @Test fun largeTextKeepsTheFullProcedureNameClickable() {
        val name = "Trámite técnico de actualización de información para atención presencial"
        val gateway = Gateway()
        gateway.procedure.put("name", name)
        show(gateway, "procedures", enlarged = true)
        waitFor(name)
        compose.onNodeWithText(name).performScrollTo().assertIsDisplayed().performClick()
        waitFor("Requisitos y costos por confirmar.")
        compose.onNodeWithText(name).performScrollTo().assertIsDisplayed()
    }

    @Test fun nearbyOrderingRespectsTheChosenMunicipalityAndNeverSelectsABranchAutomatically() {
        val gateway = Gateway()
        gateway.branch.put("municipality", "Comitán de Domínguez").put("latitude", 0).put("longitude", 2)
        gateway.branchItems.put(
            JSONObject().put("id", "other-city").put("name", "Sede técnica de otro municipio")
                .put("municipality", "Palenque").put("latitude", 0).put("longitude", 0)
        )
        val location =
            TestBranchLocationSource(granted = true, point = dev.daesrock.eventanilla.feature.catalog.data.GeoPoint.from(0.0, 0.0))
        show(gateway, "procedures", locationSource = location)
        waitFor("Elegir sede")
        compose.onNodeWithTag("catalog_municipality").performScrollTo().performClick()
        compose.onNodeWithText("Comitán de Domínguez").performClick()
        compose.onNodeWithText("Elegir sede").performScrollTo().performClick()
        waitFor("Sedes cercanas")
        compose.onNodeWithText("Sede técnica de otro municipio").assertDoesNotExist()
        compose.onNodeWithText("Sede técnica · Comitán").assertIsDisplayed()
        compose.onNodeWithText("Disponibilidad de trámites por sede por confirmar.").assertDoesNotExist()
        compose.onNodeWithText("Sede técnica · Comitán").performClick()
        compose.onNodeWithText("Disponibilidad de trámites por sede por confirmar.").assertExists()
    }
}
