package dev.daesrock.eventanilla.feature.catalog.data

/** No acepta puntos incompletos ni coordenadas fuera del planeta. */
@ConsistentCopyVisibility
data class GeoPoint private constructor(val latitude: Double, val longitude: Double) {
    companion object {
        fun from(latitude: Double, longitude: Double): GeoPoint? =
            if (latitude.isFinite() && longitude.isFinite() && latitude in -90.0..90.0 && longitude in -180.0..180.0) {
                GeoPoint(latitude, longitude)
            } else {
                null
            }
    }
}
