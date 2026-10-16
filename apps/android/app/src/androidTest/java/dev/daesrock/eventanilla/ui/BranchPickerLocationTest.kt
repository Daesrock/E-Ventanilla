package dev.daesrock.eventanilla.ui

import android.Manifest
import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.activity.result.ActivityResultRegistry
import androidx.activity.result.ActivityResultRegistryOwner
import androidx.activity.result.contract.ActivityResultContract
import androidx.compose.material3.*
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.core.app.ActivityOptionsCompat
import androidx.lifecycle.Lifecycle
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import dev.daesrock.eventanilla.feature.catalog.data.*
import dev.daesrock.eventanilla.feature.catalog.location.BranchLocationSource
import dev.daesrock.eventanilla.feature.catalog.presentation.*
import kotlinx.coroutines.delay
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test

/** Resultados técnicos del permiso; no cambian permisos ni ubicación del teléfono. */
internal class LocationPermissionTestOwner(var grant: Boolean = false, val result: (Boolean) -> Unit = {}) : ActivityResultRegistryOwner {
    var requests = 0
    var requestedPermission: String? = null
    override val activityResultRegistry = object : ActivityResultRegistry() {
        override fun <I, O> onLaunch(requestCode: Int, contract: ActivityResultContract<I, O>, input: I, options: ActivityOptionsCompat?) {
            requests++
            requestedPermission = input as String
            result(grant)
            dispatchResult(requestCode, grant)
        }
    }
}

internal class TestBranchLocationSource(var granted: Boolean = false, val point: GeoPoint? = null) : BranchLocationSource {
    var requests = 0

    @Volatile var active = false
    var delayMillis = 0L
    var fail = false
    override fun hasPermission() = granted
    override suspend fun currentLocation(): GeoPoint? {
        requests++
        active = true
        return try {
            delay(delayMillis)
            if (fail) error("Fallo técnico aislado")
            point
        } finally {
            active = false
        }
    }
}

internal class TestBranchRoutingSource : BranchRoutingSource {
    var requests = 0
    var branchIds: List<String> = emptyList()
    var unavailable = false
    var delayMillis = 0L

    @Volatile var active = false
    override suspend fun routes(origin: GeoPoint, branchIds: List<String>): List<BranchRoute>? {
        requests++
        this.branchIds = branchIds
        active = true
        return try {
            delay(delayMillis)
            if (unavailable) {
                null
            } else {
                branchIds.map {
                    BranchRoute(
                        it,
                        if (it ==
                            "near"
                        ) {
                            3000.0
                        } else {
                            1000.0
                        },
                        if (it == "far") 240.0 else 120.0
                    )
                }
            }
        } finally {
            active = false
        }
    }
}

class BranchPickerLocationTest {
    @get:Rule val compose = createAndroidComposeRule<ComponentActivity>()
    private val origin = requireNotNull(GeoPoint.from(0.0, 0.0))
    private val branches = listOf(
        CatalogItem("far", "Sede técnica lejana", coordinates = GeoPoint.from(0.0, 2.0)),
        CatalogItem("near", "Sede técnica cercana", coordinates = GeoPoint.from(0.0, 1.0)),
        CatalogItem("unknown", "Sede técnica sin punto")
    )
    private var selected: String? = null

    private fun show(
        source: TestBranchLocationSource,
        permission: LocationPermissionTestOwner,
        items: List<CatalogItem> = branches,
        routing: TestBranchRoutingSource = TestBranchRoutingSource()
    ) {
        compose.setContent {
            CompositionLocalProvider(LocalBranchLocationSource provides source, LocalActivityResultRegistryOwner provides permission) {
                EVentanillaTheme {
                    val picker = rememberBranchPickerLocation(items, routing)
                    Button(onClick = picker.open) { Text("Elegir sede") }
                    if (picker.visible) {
                        BranchPickerDialog(items, picker) {
                            selected = it.id
                            picker.close()
                        }
                    }
                }
            }
        }
    }

    private fun waitForChoices() {
        compose.waitUntil(12_000) { compose.onAllNodesWithTag("branch_choices").fetchSemanticsNodes().isNotEmpty() }
    }

    private fun assertBefore(first: String, second: String) {
        val firstBounds = compose.onNodeWithTag("branch_choice_$first").fetchSemanticsNode().boundsInRoot
        val secondBounds = compose.onNodeWithTag("branch_choice_$second").fetchSemanticsNode().boundsInRoot
        assertTrue(firstBounds.top < secondBounds.top)
    }

    @Test fun permissionIsRequestedOnlyOnClickAndDenialKeepsTheOriginalList() {
        val source = TestBranchLocationSource()
        val permission = LocationPermissionTestOwner()
        show(source, permission)
        compose.waitForIdle()
        assertEquals(0, permission.requests)
        assertEquals(0, source.requests)
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertEquals(Manifest.permission.ACCESS_COARSE_LOCATION, permission.requestedPermission)
        assertEquals(1, permission.requests)
        assertEquals(0, source.requests)
        assertBefore("far", "near")
        compose.onNodeWithText("Sedes cercanas").assertDoesNotExist()
        compose.onNodeWithTag("branch_choice_near").performClick()
        assertEquals("near", selected)
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertEquals(1, permission.requests)
        assertEquals(0, source.requests)
        assertBefore("far", "near")
    }

    @Test fun acceptingOrdersKnownPointsAndKeepsUnknownBranchesSelectable() {
        val source = TestBranchLocationSource(point = origin)
        val permission = LocationPermissionTestOwner(grant = true) { source.granted = it }
        show(source, permission)
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertEquals(1, permission.requests)
        assertEquals(1, source.requests)
        assertNull(selected)
        compose.onNodeWithText("Sedes cercanas").assertIsDisplayed()
        compose.onNodeWithText("Recorrido en automóvil · tiempo estimado").assertExists()
        compose.onNodeWithText("3 km · 2 min aprox.").assertExists()
        compose.onNodeWithText("© colaboradores de OpenStreetMap").assertExists()
        assertBefore("near", "far")
        assertBefore("far", "unknown")
        compose.onNodeWithTag("branch_choice_unknown").performClick()
        assertEquals("unknown", selected)
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertEquals(1, permission.requests)
        assertEquals(2, source.requests)
    }

    @Test fun existingPermissionDoesNotShowAnotherPermissionRequest() {
        val source = TestBranchLocationSource(granted = true, point = origin)
        val permission = LocationPermissionTestOwner()
        show(source, permission)
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertEquals(0, permission.requests)
        assertEquals(1, source.requests)
        assertBefore("near", "far")
    }

    @Test fun unavailableLocationFallsBackWithoutInventingDistances() {
        val source = TestBranchLocationSource(granted = true)
        show(source, LocationPermissionTestOwner())
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertBefore("far", "near")
        compose.onNodeWithText("Elige una sede").assertIsDisplayed()
        compose.onNodeWithText("Recorrido en automóvil · tiempo estimado").assertDoesNotExist()
    }

    @Test fun absentBranchCoordinatesKeepTheOriginalListEvenWithCitizenLocation() {
        val source = TestBranchLocationSource(point = origin)
        val permission = LocationPermissionTestOwner()
        show(
            source,
            permission,
            branches.map {
                it.copy(coordinates = null)
            }
        )
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertBefore("far", "near")
        compose.onNodeWithText("Sedes cercanas").assertDoesNotExist()
        assertEquals(0, permission.requests)
        assertEquals(0, source.requests)
    }

    @Test fun closingThePickerCancelsTheReading() {
        val source = TestBranchLocationSource(granted = true, point = origin).apply { delayMillis = 60_000 }
        show(source, LocationPermissionTestOwner())
        compose.onNodeWithText("Elegir sede").performClick()
        compose.waitUntil(3000) { source.active }
        compose.onNodeWithTag("branch_location_progress").assertExists()
        compose.onNodeWithText("Cerrar").performClick()
        compose.waitUntil(3000) { !source.active }
        compose.onNodeWithTag("branch_picker").assertDoesNotExist()
        assertNull(selected)
    }

    @Test fun movingToBackgroundCancelsTheReadingWithoutRestartingOnReturn() {
        val source = TestBranchLocationSource(granted = true, point = origin).apply { delayMillis = 60_000 }
        show(source, LocationPermissionTestOwner())
        compose.onNodeWithText("Elegir sede").performClick()
        compose.waitUntil(3000) { source.active }
        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        compose.waitUntil(3000) { !source.active }
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
        waitForChoices()
        assertEquals(1, source.requests)
        assertBefore("far", "near")
    }

    @Test fun slowLocationHasABoundedWaitAndReturnsToTheExistingList() {
        val source = TestBranchLocationSource(granted = true, point = origin).apply { delayMillis = 60_000 }
        show(source, LocationPermissionTestOwner())
        compose.onNodeWithText("Elegir sede").performClick()
        compose.waitUntil(3000) { source.active }
        // Los efectos de Compose usan el reloj de pruebas: avanzamos el límite de la consulta.
        compose.mainClock.advanceTimeBy(8_100)
        waitForChoices()
        assertFalse(source.active)
        assertBefore("far", "near")
        compose.onNodeWithText("Sedes cercanas").assertDoesNotExist()
    }

    @Test fun providerFailureDoesNotBlockSelectingABranch() {
        val source = TestBranchLocationSource(granted = true).apply { fail = true }
        show(source, LocationPermissionTestOwner())
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        compose.onNodeWithTag("branch_choice_far").performClick()
        assertEquals("far", selected)
    }

    @Test fun unavailableRoutingKeepsTheManualListWithoutStraightLineEstimates() {
        val routing = TestBranchRoutingSource().apply { unavailable = true }
        show(TestBranchLocationSource(granted = true, point = origin), LocationPermissionTestOwner(), routing = routing)
        compose.onNodeWithText("Elegir sede").performClick()
        waitForChoices()
        assertBefore("far", "near")
        compose.onNodeWithText("Sedes cercanas").assertDoesNotExist()
        compose.onNodeWithText("No pudimos calcular los recorridos. Puedes elegir una sede.").assertExists()
        assertEquals(listOf("far", "near"), routing.branchIds)
    }

    @Test fun closingCancelsAPendingRoadRequest() {
        val routing = TestBranchRoutingSource().apply { delayMillis = 60_000 }
        show(TestBranchLocationSource(granted = true, point = origin), LocationPermissionTestOwner(), routing = routing)
        compose.onNodeWithText("Elegir sede").performClick()
        compose.waitUntil(3000) { routing.active }
        compose.onNodeWithText("Cerrar").performClick()
        compose.waitUntil(3000) { !routing.active }
        assertNull(selected)
    }

    @Test fun movingToBackgroundCancelsAPendingRoadRequest() {
        val routing = TestBranchRoutingSource().apply { delayMillis = 60_000 }
        show(TestBranchLocationSource(granted = true, point = origin), LocationPermissionTestOwner(), routing = routing)
        compose.onNodeWithText("Elegir sede").performClick()
        compose.waitUntil(3000) { routing.active }
        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        compose.waitUntil(3000) { !routing.active }
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
        waitForChoices()
        assertEquals(1, routing.requests)
        assertBefore("far", "near")
    }

    @Test fun slowRoadRequestReturnsToTheManualListWithinItsTimeLimit() {
        val routing = TestBranchRoutingSource().apply { delayMillis = 60_000 }
        show(TestBranchLocationSource(granted = true, point = origin), LocationPermissionTestOwner(), routing = routing)
        compose.onNodeWithText("Elegir sede").performClick()
        compose.waitUntil(3000) { routing.active }
        compose.mainClock.advanceTimeBy(6_100)
        waitForChoices()
        assertFalse(routing.active)
        assertBefore("far", "near")
        compose.onNodeWithText("No pudimos calcular los recorridos. Puedes elegir una sede.").assertExists()
    }
}
