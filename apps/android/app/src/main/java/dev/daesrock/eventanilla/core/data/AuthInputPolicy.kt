package dev.daesrock.eventanilla.core.data

import java.util.Locale

/** Una edición inválida se rechaza completa; nunca se corta una identidad pegada. */
object AuthInputPolicy {
    fun edit(field: AuthField, previous: String, proposed: String): String {
        val accepted = when (field) {
            AuthField.CURP -> proposed.length <= 18 && proposed.all { it in 'a'..'z' || it in 'A'..'Z' || it in '0'..'9' }
            AuthField.PHONE -> proposed.length <= 10 && proposed.all { it in '0'..'9' }
            AuthField.CODE -> proposed.length <= 8 && proposed.all { it in '0'..'9' }
            AuthField.RFC -> proposed.length <= 13 && proposed.all { it in 'a'..'z' || it in 'A'..'Z' || it in '0'..'9' || it in "ñÑ&" }
            AuthField.FIRST_NAME -> AuthValidation.characters(proposed) <= 100
            AuthField.PATERNAL_LAST_NAME, AuthField.MATERNAL_LAST_NAME -> AuthValidation.characters(proposed) <= 100
            AuthField.EMAIL, AuthField.IDENTIFIER -> AuthValidation.characters(proposed) <= 254
            else -> true
        }
        if (!accepted) return previous
        return when (field) {
            AuthField.CURP, AuthField.RFC -> proposed.uppercase(Locale.ROOT)
            else -> proposed
        }
    }
}
