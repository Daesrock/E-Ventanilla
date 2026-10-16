package dev.daesrock.eventanilla.feature.catalog.data

import kotlin.math.ceil
import kotlin.math.roundToInt

data class BranchRoute(val branchId: String, val distanceMeters: Double, val durationSeconds: Double)
data class BranchChoice(val branch: CatalogItem, val route: BranchRoute?)

interface BranchRoutingSource {
    /** Null significa que el servicio no está disponible; una lista vacía no afirma cercanía. */
    suspend fun routes(origin: GeoPoint, branchIds: List<String>): List<BranchRoute>?
}

fun orderBranchesByRoute(branches: List<CatalogItem>, routes: List<BranchRoute>): List<BranchChoice> {
    val byId = routes.filter {
        it.distanceMeters.isFinite() &&
            it.distanceMeters >= 0 &&
            it.durationSeconds.isFinite() &&
            it.durationSeconds >= 0
    }
        .associateBy { it.branchId }
    return branches.map { BranchChoice(it, byId[it.id]) }.sortedWith(
        compareBy<BranchChoice> { it.route?.durationSeconds ?: Double.POSITIVE_INFINITY }
            .thenBy { it.route?.distanceMeters ?: Double.POSITIVE_INFINITY }
    )
}

fun branchRouteLabel(route: BranchRoute): String {
    val distance = if (route.distanceMeters < 1000) "Menos de 1 km" else "${(route.distanceMeters / 1000).roundToInt()} km"
    val minutes = ceil(route.durationSeconds / 60).toInt()
    val duration = when {
        minutes < 1 -> "menos de 1 min"
        minutes < 60 -> "$minutes min"
        minutes % 60 == 0 -> "${minutes / 60} h"
        else -> "${minutes / 60} h ${minutes % 60} min"
    }
    return "$distance · $duration aprox."
}
