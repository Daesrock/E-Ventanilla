package dev.daesrock.eventanilla.core.data

data class RegistrationRequest(
    val firstName: String,
    val paternalLastName: String,
    val maternalLastName: String?,
    val curp: String,
    val municipalityCode: String,
    val email: String,
    val password: String,
    val phone: String? = null,
    val rfc: String? = null
)

data class VerificationReceipt(val trackingToken: String)

data class AuthSession(val token: String, val citizen: Citizen, val verification: VerificationReceipt?)

data class VerificationContext(val email: String, val emailVerified: Boolean, val verification: VerificationReceipt?)

enum class AuthField(val wireName: String) {
    FIRST_NAME("firstName"),
    PATERNAL_LAST_NAME("paternalLastName"),
    MATERNAL_LAST_NAME("maternalLastName"),
    CURP("curp"),
    MUNICIPALITY("municipalityCode"),
    EMAIL("email"),
    PASSWORD("password"),
    CONFIRMATION("confirmation"),
    PHONE("phone"),
    RFC("rfc"),
    IDENTIFIER("identifier"),
    CODE("code")
}
