package dev.daesrock.eventanilla.core.data

import java.io.File
import java.util.Locale
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class FieldContractTest {
    private val contract = JSONObject(File("../../../contracts/auth-fields.json").readText())
    private val blocked = File("src/main/assets/common-passwords.txt").readLines()
        .filter { it.isNotEmpty() }.map { it.lowercase(Locale.ROOT) }.toSet()

    @Test
    fun validatesTheSameCasesAsTheApi() {
        val cases = contract.getJSONArray("validation")
        for (index in 0 until cases.length()) {
            val item = cases.getJSONObject(index)
            val value = item.getString("value")
            val error = when (item.getString("field")) {
                "phone" -> AuthValidation.phone(value)
                "curp" -> AuthValidation.curp(value)
                "code" -> AuthValidation.code(value)
                "rfc" -> AuthValidation.rfc(value)
                else -> error("Campo de contrato desconocido")
            }
            assertEquals(item.toString(), item.getBoolean("valid"), error == null)
        }
        val passwords = contract.getJSONArray("passwords")
        for (index in 0 until passwords.length()) {
            val item = passwords.getJSONObject(index)
            assertEquals(item.toString(), item.getBoolean("valid"), AuthValidation.password(item.getString("value"), blocked) == null)
        }
    }

    @Test
    fun rejectsAnInvalidPasteWithoutSilentlyChangingIt() {
        val cases = contract.getJSONArray("editing")
        for (index in 0 until cases.length()) {
            val item = cases.getJSONObject(index)
            val field = AuthField.entries.first { it.wireName == item.getString("field") }
            assertEquals(
                item.toString(),
                item.getString("expected"),
                AuthInputPolicy.edit(field, item.getString("previous"), item.getString("proposed"))
            )
        }
    }
}
