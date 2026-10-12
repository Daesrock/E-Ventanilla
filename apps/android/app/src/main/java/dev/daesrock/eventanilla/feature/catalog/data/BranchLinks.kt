package dev.daesrock.eventanilla.feature.catalog.data

import java.net.URLEncoder

/** Busca la dirección publicada; no afirma disponer de coordenadas verificadas. */
fun branchMapUrl(address: String?): String? = address?.takeIf { it.isNotBlank() }?.let {
    "https://www.google.com/maps/search/?api=1&query=${URLEncoder.encode(it, "UTF-8")}"
}

/** Las extensiones se consultan en la ficha y no forman parte del número principal. */
fun branchPhoneUrl(phone: String?): String? {
    val mainNumber = phone?.split(Regex("(?i)\\bext\\.?"))?.firstOrNull() ?: return null
    val digits = mainNumber.filter(Char::isDigit)
    // Una cadena ambigua con varios números no se marca automáticamente.
    return digits.takeIf { it.length == 10 && it.all { digit -> digit in '0'..'9' } }?.let { "tel:+52$it" }
}
