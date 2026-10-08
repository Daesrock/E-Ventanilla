package dev.daesrock.eventanilla.data

import dev.daesrock.eventanilla.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class Citizen(
    val firstName: String, val lastName: String, val email: String,
    val curp: String, val municipality: String, val phone: String?, val rfc: String?
) {
    companion object {
        fun fromJson(json: JSONObject) = Citizen(
            json.getString("firstName"), json.getString("lastName"), json.getString("email"),
            json.getString("curp"), json.getString("municipality"),
            json.optString("phone").takeIf { it.isNotBlank() && it != "null" },
            json.optString("rfc").takeIf { it.isNotBlank() && it != "null" }
        )
    }
}

class ApiFailure(val status: Int, message: String, val code: String? = null,
    val fieldErrors: Map<String, String> = emptyMap(), val email: String? = null) : IOException(message)

class ApiClient {
    suspend fun request(path: String, body: JSONObject? = null, token: String? = null): JSONObject = withContext(Dispatchers.IO) {
        val connection = URL(BuildConfig.API_BASE_URL + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = if (body == null) "GET" else "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 20000
            connection.setRequestProperty("Accept", "application/json")
            token?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
            if (body != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val input = if (status in 200..299) connection.inputStream else connection.errorStream
            val content = input?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(content) }.getOrDefault(JSONObject())
            if (status !in 200..299) {
                val message = json.optString("message").takeIf { it.isNotBlank() }
                    ?: if (status == 429) "Demasiadas solicitudes. Intenta nuevamente más tarde." else "No fue posible completar la solicitud."
                val fields = json.optJSONObject("fieldErrors")
                val errors = fields?.keys()?.asSequence()?.associateWith { fields.getString(it) }.orEmpty()
                throw ApiFailure(status, message, json.optString("code").takeIf { it.isNotBlank() }, errors,
                    json.optString("email").takeIf { it.isNotBlank() })
            }
            json
        } finally { connection.disconnect() }
    }
}
