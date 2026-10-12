package dev.daesrock.eventanilla.app

import dev.daesrock.eventanilla.R

data class MainDestination(val route: String, val label: String, val icon: Int? = null)

val mainDestinations = listOf(
    MainDestination("home", "Inicio", R.raw.nav_home),
    MainDestination("procedures", "Trámites y servicios", R.raw.nav_procedures),
    MainDestination("directory", "Directorio"),
    MainDestination("appointments", "Mis citas"),
    MainDestination("notifications", "Notificaciones", R.raw.nav_notifications),
    MainDestination("profile", "Mi perfil", R.raw.nav_profile)
)
