package dev.daesrock.eventanilla.core.data

import org.json.JSONObject

/** Único lugar que traduce solicitudes y respuestas de autenticación a JSON. */
class AuthRepository(private val api: ApiGateway) {
    private fun receipt(json: JSONObject?): VerificationReceipt? =
        json?.optString("trackingToken")?.takeIf { it.isNotBlank() }?.let(::VerificationReceipt)

    private fun session(json: JSONObject) = AuthSession(
        token = json.getString("token"),
        citizen = Citizen.fromJson(json.getJSONObject("user")),
        verification = receipt(json.optJSONObject("verification"))
    )

    suspend fun login(identifier: String, password: String): AuthSession = session(
        api.request(
            "auth/login",
            JSONObject()
                .put("identifier", identifier.trim())
                .put("password", password)
                .put("allowPendingVerification", true)
        )
    )

    suspend fun register(request: RegistrationRequest): AuthSession {
        val body = JSONObject()
            .put("firstName", request.firstName.trim())
            .put("paternalLastName", request.paternalLastName.trim())
            .put("curp", request.curp)
            .put("municipalityCode", request.municipalityCode)
            .put("email", request.email.trim())
            .put("password", request.password)
        request.phone?.let { body.put("phone", it) }
        request.maternalLastName?.trim()?.takeIf { it.isNotEmpty() }?.let { body.put("maternalLastName", it) }
        request.rfc?.let { body.put("rfc", it) }
        return session(api.request("auth/register", body))
    }

    suspend fun verificationContext(token: String): VerificationContext {
        val result = api.request("auth/verification-context", token = token)
        return VerificationContext(
            result.getString("email"),
            result.getBoolean("emailVerified"),
            receipt(result.optJSONObject("verification"))
        )
    }

    suspend fun verificationStatus(token: String): VerificationDelivery =
        VerificationDelivery.fromJson(api.request("auth/verification-status", token = token))

    suspend fun verify(email: String, code: String): Citizen? =
        api.request("auth/verify-email", JSONObject().put("email", email).put("code", code))
            .optJSONObject("user")?.let(Citizen::fromJson)

    suspend fun resend(email: String) {
        api.request("auth/resend-verification", JSONObject().put("identifier", email))
    }

    suspend fun checkAppointmentAccess(token: String) {
        api.request("auth/appointment-access", token = token)
    }

    suspend fun forgot(identifier: String): String =
        api.request("auth/forgot-password", JSONObject().put("identifier", identifier.trim())).getString("message")

    suspend fun verifyResetCode(identifier: String, code: String) {
        api.request("auth/verify-reset-code", JSONObject().put("identifier", identifier).put("code", code))
    }

    suspend fun reset(identifier: String, code: String, password: String): String = api.request(
        "auth/reset-password",
        JSONObject().put("identifier", identifier)
            .put("code", code).put("password", password)
    ).getString("message")

    suspend fun logout(token: String) {
        api.request("auth/logout", JSONObject(), token)
    }
}
