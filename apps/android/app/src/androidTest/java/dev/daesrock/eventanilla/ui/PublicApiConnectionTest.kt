package dev.daesrock.eventanilla.ui

import androidx.test.platform.app.InstrumentationRegistry
import dev.daesrock.eventanilla.core.data.ApiClient
import dev.daesrock.eventanilla.core.data.ApiFailure
import dev.daesrock.eventanilla.core.data.AuthResources
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/** Comprobación opcional contra la API configurada: solo GET públicos y un rechazo sin sesión. */
class PublicApiConnectionTest {
    @Test fun androidReadsPublishedBranchesAndProceduresWithoutSession() = runBlocking {
        val api = ApiClient()
        for (path in listOf("branches", "procedures")) {
            val items = api.request("catalog/$path").getJSONArray("items")
            assertTrue(items.length() > 0)
            for (index in 0 until items.length()) {
                val item = items.getJSONObject(index)
                assertTrue(item.getString("sourceUrl").startsWith("https://coesa.chiapas.gob.mx/"))
                assertFalse(item.has("passwordHash"))
            }
            val first = items.getJSONObject(0)
            val detail = api.request("catalog/$path/${first.getString("id")}")
            assertEquals(first.getString("name"), detail.getString("name"))
        }
    }

    @Test fun androidConnectsToPublicCatalogAndCannotPrepareAppointmentsAnonymously() = runBlocking {
        val api = ApiClient()
        api.request("ready")
        val catalog = api.request("catalog/municipalities").getJSONArray("municipalities")
        val expected = AuthResources(InstrumentationRegistry.getInstrumentation().targetContext).municipalities
        assertEquals(expected.size, catalog.length())
        val names = (0 until catalog.length()).associate { index ->
            val item = catalog.getJSONObject(index)
            item.getString("code") to item.getString("name")
        }
        assertEquals(expected.associate { it.code to it.name }, names)
        try {
            api.request("auth/appointment-access")
            fail("La API debe exigir sesión para preparar una cita")
        } catch (error: ApiFailure) {
            assertEquals(401, error.status)
        }
    }
}
