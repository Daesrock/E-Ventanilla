package dev.daesrock.eventanilla.core.data

import dev.daesrock.eventanilla.BuildConfig
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject

data class Citizen(
    val firstName: String,
    val lastName: String,
    val email: String,
    val curp: String,
    val municipality: String,
    val phone: String?,
    val rfc: String?,
    val emailVerified: Boolean = false,
    val paternalLastName: String? = null,
    val maternalLastName: String? = null
) {
    val fullName: String
        get() = listOf(firstName, paternalLastName ?: lastName, maternalLastName.takeIf { paternalLastName != null })
            .filterNotNull().filter { it.isNotBlank() }.joinToString(" ")
    companion object {
        fun fromJson(json: JSONObject) = Citizen(
            json.getString("firstName"),
            json.getString("lastName"),
            json.getString("email"),
            json.getString("curp"),
            json.getString("municipality"),
            json.optString("phone").takeIf { it.isNotBlank() && it != "null" },
            json.optString("rfc").takeIf { it.isNotBlank() && it != "null" },
            json.optBoolean("emailVerified", false),
            json.optString("paternalLastName").takeIf { it.isNotBlank() && it != "null" },
            json.optString("maternalLastName").takeIf { it.isNotBlank() && it != "null" }
        )
    }
}

class ApiFailure(
    val status: Int,
    message: String,
    val code: String? = null,
    val fieldErrors: Map<String, String> = emptyMap(),
    val email: String? = null,
    val verification: VerificationReceipt? = null
) : IOException(message)

interface ApiGateway {
    suspend fun request(path: String, body: JSONObject? = null, token: String? = null): JSONObject
}

class ApiClient(private val baseUrl: String = BuildConfig.API_BASE_URL) : ApiGateway {
    companion object {
        private val http = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
            .callTimeout(25, TimeUnit.SECONDS).followRedirects(false).followSslRedirects(false).build()
    }

    override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject =
        suspendCancellableCoroutine { continuation ->
            val request = Request.Builder().url(baseUrl + path).header("Accept", "application/json")
            token?.let { request.header("Authorization", "Bearer $it") }
            body?.let { request.post(it.toString().toRequestBody("application/json; charset=utf-8".toMediaType())) }
            val call = http.newCall(request.build())
            // Cerrar el selector o salir de la app cancela también la conexión HTTP real.
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (continuation.isActive) continuation.resumeWithException(e)
                }
                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        try {
                            val result = decodeResponse(it.code, it.body?.string().orEmpty())
                            if (continuation.isActive) continuation.resume(result)
                        } catch (error: Exception) {
                            if (continuation.isActive) continuation.resumeWithException(error)
                        }
                    }
                }
            })
        }

    private fun decodeResponse(status: Int, content: String): JSONObject {
        val json = runCatching { JSONObject(content) }.getOrDefault(JSONObject())
        if (status !in 200..299) {
            val message = json.optString("message").takeIf { it.isNotBlank() }
                ?: if (status ==
                    429
                ) {
                    "Demasiadas solicitudes. Intenta nuevamente más tarde."
                } else {
                    "No fue posible completar la solicitud."
                }
            val fields = json.optJSONObject("fieldErrors")
            val errors = fields?.keys()?.asSequence()?.associateWith { fields.getString(it) }.orEmpty()
            throw ApiFailure(
                status,
                message,
                json.optString("code").takeIf { it.isNotBlank() },
                errors,
                json.optString("email").takeIf {
                    it.isNotBlank()
                },
                json.optJSONObject("verification")?.optString("trackingToken")?.takeIf {
                    it.isNotBlank()
                }?.let(::VerificationReceipt)
            )
        }
        return json
    }
}
