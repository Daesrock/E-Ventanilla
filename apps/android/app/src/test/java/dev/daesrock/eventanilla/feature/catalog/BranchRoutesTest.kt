package dev.daesrock.eventanilla.feature.catalog

import dev.daesrock.eventanilla.core.data.ApiGateway
import dev.daesrock.eventanilla.feature.catalog.data.*
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Puntos y recorridos técnicos en memoria; no se publican como sedes. */
class BranchRoutesTest {
    private fun branch(id: String) = CatalogItem(id, id)

    @Test fun refusesNonFiniteAndOutOfRangeCoordinates() {
        listOf(Double.NaN, Double.POSITIVE_INFINITY, -91.0, 91.0).forEach { assertNull(GeoPoint.from(it, 0.0)) }
        listOf(Double.NaN, Double.NEGATIVE_INFINITY, -181.0, 181.0).forEach { assertNull(GeoPoint.from(0.0, it)) }
        assertNotNull(GeoPoint.from(-90.0, -180.0))
        assertNotNull(GeoPoint.from(90.0, 180.0))
    }

    @Test fun parsesCoordinatesWithoutReplacingMissingOrInvalidValuesWithZero() {
        val json = JSONObject().put("id", "technical").put("name", "technical")
        assertNull(CatalogItem.fromJson(json).coordinates)
        json.put("latitude", 0).put("longitude", JSONObject.NULL)
        assertNull(CatalogItem.fromJson(json).coordinates)
        json.put("longitude", 181)
        assertNull(CatalogItem.fromJson(json).coordinates)
        json.put("longitude", "0")
        assertEquals(0.0, requireNotNull(CatalogItem.fromJson(json).coordinates).latitude, 0.0)
    }

    @Test fun missingRoutesPreserveTheOriginalOrderWithoutNumbers() {
        val input = listOf(branch("z"), branch("a"), branch("b"))
        val choices = orderBranchesByRoute(input, emptyList())
        assertEquals(input, choices.map { it.branch })
        assertTrue(choices.all { it.route == null })
    }

    @Test fun sortsByTravelTimeInsteadOfDistanceAndKeepsAllOtherBranches() {
        val choices = orderBranchesByRoute(
            listOf(branch("unknown"), branch("slow"), branch("fast")),
            listOf(
                BranchRoute("slow", 1000.0, 240.0),
                BranchRoute("fast", 3000.0, 120.0)
            )
        )
        assertEquals(listOf("fast", "slow", "unknown"), choices.map { it.branch.id })
        assertEquals(3000.0, requireNotNull(choices.first().route).distanceMeters, 0.0)
        assertNull(choices.last().route)
    }

    @Test fun invalidMetricsAreIgnoredAndEqualRoutesKeepTheirOriginalOrder() {
        val choices = orderBranchesByRoute(
            listOf(branch("b"), branch("a"), branch("invalid"), branch("unknown")),
            listOf(
                BranchRoute("a", 1000.0, 60.0),
                BranchRoute("b", 1000.0, 60.0),
                BranchRoute("invalid", Double.NaN, -1.0)
            )
        )
        assertEquals(listOf("b", "a", "invalid", "unknown"), choices.map { it.branch.id })
        assertNull(choices[2].route)
    }

    @Test fun labelsShowRoadDistanceAndEstimatedMinutesOrHours() {
        assertEquals("Menos de 1 km · menos de 1 min aprox.", branchRouteLabel(BranchRoute("a", 0.0, 0.0)))
        assertEquals("1 km · 2 min aprox.", branchRouteLabel(BranchRoute("a", 1000.0, 61.0)))
        assertEquals("2 km · 1 h aprox.", branchRouteLabel(BranchRoute("a", 1800.0, 3600.0)))
        assertEquals("50 km · 1 h 1 min aprox.", branchRouteLabel(BranchRoute("a", 50000.0, 3660.0)))
    }

    @Test fun repositorySendsLocationInBodyAndAcceptsOnlyRequestedValidRoutes() = runBlocking {
        val gateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
                assertEquals("catalog/branches/nearby", path)
                assertNull(token)
                assertEquals(14.0, requireNotNull(body).getDouble("latitude"), 0.0)
                assertEquals(-92.0, body.getDouble("longitude"), 0.0)
                assertEquals("a", body.getJSONArray("branchIds").getString(0))
                return JSONObject(
                    """{"status":"available","travelMode":"driving","items":[{"branchId":"a","distanceMeters":1000,"durationSeconds":120},{"branchId":"other","distanceMeters":1,"durationSeconds":1}]}"""
                )
            }
        }
        val result = CatalogRepository(gateway).routes(requireNotNull(GeoPoint.from(14.0, -92.0)), listOf("a"))
        assertEquals(listOf(BranchRoute("a", 1000.0, 120.0)), result)
    }
}
