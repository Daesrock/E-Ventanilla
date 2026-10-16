package dev.daesrock.eventanilla.feature.catalog.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.CancellationSignal
import android.os.SystemClock
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import dev.daesrock.eventanilla.feature.catalog.data.GeoPoint
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

interface BranchLocationSource {
    fun hasPermission(): Boolean
    suspend fun currentLocation(): GeoPoint?
}

/** Una lectura puntual. No almacena, envía ni registra la ubicación del ciudadano. */
class AndroidBranchLocationSource(context: Context) : BranchLocationSource {
    private val context = context.applicationContext

    override fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission") // Se comprueba aquí y se tolera su revocación durante la solicitud.
    override suspend fun currentLocation(): GeoPoint? {
        if (!hasPermission()) return null
        val manager = context.getSystemService(LocationManager::class.java) ?: return null
        return try {
            if (!LocationManagerCompat.isLocationEnabled(manager)) return null
            val available = manager.getProviders(true)
            val provider = listOf("fused", LocationManager.NETWORK_PROVIDER).firstOrNull { it in available } ?: return null
            suspendCancellableCoroutine { continuation ->
                val cancellation = CancellationSignal()
                continuation.invokeOnCancellation { cancellation.cancel() }
                LocationManagerCompat.getCurrentLocation(
                    manager,
                    provider,
                    cancellation,
                    ContextCompat.getMainExecutor(context)
                ) { location ->
                    // Un resultado antiguo no representa la ubicación actual.
                    val age = location?.let { SystemClock.elapsedRealtimeNanos() - it.elapsedRealtimeNanos }
                    val point = if (location != null && age != null && age in 0..120_000_000_000L) {
                        GeoPoint.from(location.latitude, location.longitude)
                    } else {
                        null
                    }
                    if (continuation.isActive) continuation.resume(point)
                }
            }
        } catch (_: SecurityException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }
}
