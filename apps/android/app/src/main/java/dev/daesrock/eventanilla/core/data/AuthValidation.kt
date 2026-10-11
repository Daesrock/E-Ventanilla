package dev.daesrock.eventanilla.core.data

import java.text.Normalizer
import java.util.Locale

data class Municipality(val code: String, val name: String)

object AuthValidation {
    fun characters(value: String) = value.codePointCount(0, value.length)
    fun password(value: String, blocked: Set<String>): String? = when {
        Regex("[\\s\\p{Z}\\u0085\\uFEFF]").containsMatchIn(value) -> "La contraseña no debe contener espacios."
        characters(value) < 12 -> "Usa al menos 12 caracteres."
        characters(value) > 20 -> "La contraseña es demasiado larga."
        blocked.contains(value.lowercase(Locale.ROOT)) -> "Esta contraseña es demasiado común. Elige otra contraseña."
        else -> null
    }
    fun confirmation(password: String, confirmation: String): String? = when {
        confirmation.isEmpty() -> "Confirma tu contraseña."
        password != confirmation -> "Las contraseñas no coinciden."
        else -> null
    }
    fun search(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}"), "").lowercase(Locale.ROOT).trim()
    fun email(value: String): String? = if (characters(value.trim()) > 254 ||
        !Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(value.trim())
    ) {
        "Escribe un correo electrónico válido."
    } else {
        null
    }
    fun identifier(value: String): String? = if (value.isBlank() || characters(value.trim()) > 254) {
        "Escribe tu CURP o correo."
    } else {
        null
    }
    fun code(value: String): String? = if (!Regex("^[0-9]{8}$").matches(value)) "Escribe el código de 8 dígitos." else null
    fun curp(value: String): String? = if (!Regex("^[A-Z][AEIOU][A-Z]{2}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$").matches(value.trim())) {
        "Escribe una CURP de 18 caracteres con formato válido."
    } else {
        null
    }
    fun phone(value: String): String? = if (value.isNotEmpty() && !Regex("^[0-9]{10}$").matches(value)) {
        "Escribe un teléfono de 10 dígitos o deja el campo vacío."
    } else {
        null
    }
    fun rfc(value: String): String? = if (value.isNotBlank() && !Regex("^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$").matches(value.trim())) {
        "Escribe un RFC con formato válido o deja el campo vacío."
    } else {
        null
    }
}
