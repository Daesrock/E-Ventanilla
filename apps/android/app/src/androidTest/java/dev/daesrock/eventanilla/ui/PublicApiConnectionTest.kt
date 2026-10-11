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
