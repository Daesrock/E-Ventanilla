package dev.daesrock.eventanilla.app

import dev.daesrock.eventanilla.R
import java.text.Normalizer
import java.util.Locale

data class MainDestination(val route: String, val label: String, val icon: Int? = null)

val mainDestinations = listOf(
    MainDestination("home", "Inicio", R.raw.nav_home),
    MainDestination("procedures", "Trámites y servicios", R.raw.nav_procedures),
    MainDestination("directory", "Directorio"),
    MainDestination("appointments", "Mis citas"),
    MainDestination("notifications", "Notificaciones", R.raw.nav_notifications),
    MainDestination("profile", "Mi perfil", R.raw.nav_profile)
)

/** Busca únicamente destinos de navegación; no representa un catálogo de trámites. */
fun searchSections(query: String): List<MainDestination> {
    fun normalized(text: String) = Normalizer.normalize(text, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT)
    val term = normalized(query.trim())
    return mainDestinations.filter { normalized(it.label).contains(term) }
}
