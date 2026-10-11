package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.runtime.mutableStateMapOf
import androidx.lifecycle.ViewModel
import dev.daesrock.eventanilla.core.data.AuthField
import dev.daesrock.eventanilla.core.data.AuthInputPolicy
import dev.daesrock.eventanilla.core.data.AuthValidation

/** Conserva valores y errores; el enfoque y el desplazamiento pertenecen a la UI. */
abstract class AuthFormViewModel(val order: List<AuthField>) : ViewModel() {
    val values = mutableStateMapOf<AuthField, String>()
    val touched = mutableStateMapOf<AuthField, Boolean>()
    val remoteErrors = mutableStateMapOf<AuthField, String>()

    fun value(field: AuthField): String = values[field].orEmpty()

    fun set(field: AuthField, proposed: String) {
        values[field] = AuthInputPolicy.edit(field, value(field), proposed)
        remoteErrors.remove(field)
    }

    fun error(field: AuthField): String? = remoteErrors[field]
        ?: if (touched[field] == true) validateField(field) else null

    abstract fun validateField(field: AuthField): String?

    protected fun loginPassword(): String? = when {
        value(AuthField.PASSWORD).isEmpty() -> "Escribe tu contraseña."
        AuthValidation.characters(value(AuthField.PASSWORD)) > 128 -> "La contraseña es demasiado larga."
        else -> null
    }
}

class LoginViewModel : AuthFormViewModel(listOf(AuthField.IDENTIFIER, AuthField.PASSWORD)) {
    override fun validateField(field: AuthField): String? = when (field) {
        AuthField.IDENTIFIER -> AuthValidation.identifier(value(field))
        AuthField.PASSWORD -> loginPassword()
        else -> null
    }
}

class RegisterViewModel(private val blockedPasswords: Set<String>) :
    AuthFormViewModel(
        listOf(
            AuthField.FIRST_NAME, AuthField.PATERNAL_LAST_NAME, AuthField.MATERNAL_LAST_NAME, AuthField.CURP, AuthField.MUNICIPALITY,
            AuthField.EMAIL, AuthField.PASSWORD, AuthField.CONFIRMATION, AuthField.PHONE, AuthField.RFC
        )
    ) {
    override fun validateField(field: AuthField): String? = when (field) {
        AuthField.FIRST_NAME -> if (value(field).isBlank()) "Completa este campo." else null
        AuthField.PATERNAL_LAST_NAME -> if (value(field).isBlank()) "Escribe tu apellido paterno." else null
        AuthField.CURP -> AuthValidation.curp(value(field))
        AuthField.MUNICIPALITY -> if (value(field).isEmpty()) "Selecciona tu municipio." else null
        AuthField.EMAIL -> AuthValidation.email(value(field))
        AuthField.PASSWORD -> AuthValidation.password(value(field), blockedPasswords)
        AuthField.CONFIRMATION -> AuthValidation.confirmation(value(AuthField.PASSWORD), value(field))
        AuthField.PHONE -> AuthValidation.phone(value(field))
        AuthField.RFC -> AuthValidation.rfc(value(field))
        else -> null
    }
}

class VerificationViewModel : AuthFormViewModel(listOf(AuthField.CODE)) {
    override fun validateField(field: AuthField): String? = AuthValidation.code(value(field))
}

class ForgotPasswordViewModel : AuthFormViewModel(listOf(AuthField.IDENTIFIER)) {
    override fun validateField(field: AuthField): String? = AuthValidation.identifier(value(field))
}

class ResetPasswordViewModel(private val blockedPasswords: Set<String>) :
    AuthFormViewModel(
        listOf(
            AuthField.PASSWORD,
            AuthField.CONFIRMATION
        )
    ) {
    override fun validateField(field: AuthField): String? = when (field) {
        AuthField.PASSWORD -> AuthValidation.password(value(field), blockedPasswords)
        AuthField.CONFIRMATION -> AuthValidation.confirmation(value(AuthField.PASSWORD), value(field))
        else -> null
    }
}
