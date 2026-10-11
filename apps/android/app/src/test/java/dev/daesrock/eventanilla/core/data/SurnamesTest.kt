package dev.daesrock.eventanilla.core.data

import dev.daesrock.eventanilla.feature.auth.presentation.RegisterViewModel
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class SurnamesTest {
    @Test fun requiresPaternalSurnameAndAllowsMissingMaternalSurname() {
        val form = RegisterViewModel(emptySet())
        assertNotNull(form.validateField(AuthField.PATERNAL_LAST_NAME))
        form.set(AuthField.PATERNAL_LAST_NAME, "de la Cruz")
        assertNull(form.validateField(AuthField.PATERNAL_LAST_NAME))
        assertNull(form.validateField(AuthField.MATERNAL_LAST_NAME))
        assertEquals("de la Cruz", form.value(AuthField.PATERNAL_LAST_NAME))
        for (field in listOf(AuthField.PATERNAL_LAST_NAME, AuthField.MATERNAL_LAST_NAME)) {
            val boundary = "🪻".repeat(100)
            assertEquals(boundary, AuthInputPolicy.edit(field, "Anterior", boundary))
            assertEquals(boundary, AuthInputPolicy.edit(field, boundary, boundary + "x"))
        }
    }

    @Test fun keepsLegacyNamesWithoutGuessingTheirParts() {
        val user = JSONObject().put("firstName", "Fixture").put("lastName", "De la Cruz Del Río")
            .put("email", "fixture@example.invalid").put("curp", "isolated").put("municipality", "isolated")
        val legacy = Citizen.fromJson(user)
        assertNull(legacy.paternalLastName)
        assertNull(legacy.maternalLastName)
        assertEquals("Fixture De la Cruz Del Río", legacy.fullName)
        user.put("paternalLastName", "De la Cruz").put("maternalLastName", "Del Río")
        assertEquals(legacy.fullName, Citizen.fromJson(user).fullName)
        user.put("maternalLastName", JSONObject.NULL).put("lastName", "De la Cruz")
        assertEquals("Fixture De la Cruz", Citizen.fromJson(user).fullName)
    }

    @Test fun registrationSendsSeparateFieldsAndOmitsEmptyMaternalSurname() = runBlocking {
        var captured = JSONObject()
        val gateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
                assertEquals("auth/register", path)
                captured = checkNotNull(body)
                return JSONObject().put("token", "isolated").put(
                    "user",
                    JSONObject()
                        .put("firstName", "Fixture").put("lastName", "de la Cruz")
                        .put("email", "fixture@example.invalid").put("curp", "isolated").put("municipality", "isolated")
                )
            }
        }
        val request = RegistrationRequest("Fixture", " de la Cruz ", null, "isolated", "07001", "fixture@example.invalid", "isolated")
        val repository = AuthRepository(gateway)
        repository.register(request)
        assertEquals("de la Cruz", captured.getString("paternalLastName"))
        assertFalse(captured.has("lastName"))
        assertFalse(captured.has("maternalLastName"))
        repository.register(request.copy(maternalLastName = " Del Río "))
        assertEquals("Del Río", captured.getString("maternalLastName"))
    }
}
