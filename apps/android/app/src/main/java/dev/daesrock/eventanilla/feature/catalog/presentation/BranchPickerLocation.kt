package dev.daesrock.eventanilla.feature.catalog.presentation

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import dev.daesrock.eventanilla.feature.catalog.data.*
import dev.daesrock.eventanilla.feature.catalog.location.AndroidBranchLocationSource
import dev.daesrock.eventanilla.feature.catalog.location.BranchLocationSource
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withTimeoutOrNull

internal val LocalBranchLocationSource = staticCompositionLocalOf<BranchLocationSource?> { null }
internal val LocalBranchRoutingSource = staticCompositionLocalOf<BranchRoutingSource?> { null }

internal data class BranchPickerLocation(
    val visible: Boolean,
    val locating: Boolean,
    val routes: List<BranchRoute>,
    val routingUnavailable: Boolean,
    val open: () -> Unit,
    val close: () -> Unit
)

/** El permiso nace del clic en Elegir sede, nunca de abrir o recomponer la pantalla. */
@Composable
internal fun rememberBranchPickerLocation(branches: List<CatalogItem>, routingSource: BranchRoutingSource): BranchPickerLocation {
    val context = LocalContext.current
    val deviceSource = remember(context) { AndroidBranchLocationSource(context) }
    val source = LocalBranchLocationSource.current ?: deviceSource
    val routing = LocalBranchRoutingSource.current ?: routingSource
    val currentBranches by rememberUpdatedState(branches)
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var visible by remember { mutableStateOf(false) }
    var requestingPermission by remember { mutableStateOf(false) }
    var permissionDeclined by rememberSaveable { mutableStateOf(false) }
    var useLocation by remember { mutableStateOf(false) }
    var locating by remember { mutableStateOf(false) }
    var routes by remember { mutableStateOf<List<BranchRoute>>(emptyList()) }
    var routingUnavailable by remember { mutableStateOf(false) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        requestingPermission = false
        permissionDeclined = !granted
        useLocation = granted
        locating = granted
        visible = true
    }

    LaunchedEffect(visible, source, routing, lifecycle) {
        routes = emptyList()
        routingUnavailable = false
        if (visible && useLocation) {
            // Cancela la lectura al salir de la app, incluso si Compose deja de dibujar.
            lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                if (useLocation) {
                    try {
                        val origin = withTimeoutOrNull(8_000) { source.currentLocation() }
                        if (origin != null) {
                            val ids = currentBranches.filter { it.coordinates != null }.map { it.id }
                            val result = withTimeoutOrNull(6_000) { routing.routes(origin, ids) }
                            routes = result.orEmpty()
                            routingUnavailable = result.isNullOrEmpty()
                        }
                    } catch (cancelled: CancellationException) {
                        throw cancelled
                    } catch (_: Exception) {
                        // Sin señal se conserva el selector habitual.
                        routes = emptyList()
                        routingUnavailable = true
                    } finally {
                        locating = false
                        useLocation = false
                        if (!coroutineContext.isActive) routes = emptyList()
                    }
                }
            }
        } else {
            locating = false
        }
    }

    return BranchPickerLocation(
        visible = visible,
        locating = locating,
        routes = routes,
        routingUnavailable = routingUnavailable,
        open = {
            if (!requestingPermission && !visible) {
                if (currentBranches.none { it.coordinates != null }) {
                    // No solicitar ubicación si aún no hay destinos corroborados con los que calcular.
                    useLocation = false
                    visible = true
                } else if (source.hasPermission()) {
                    useLocation = true
                    locating = true
                    visible = true
                } else if (permissionDeclined) {
                    // No insistimos tras un rechazo. Un permiso concedido en Ajustes se detecta arriba.
                    useLocation = false
                    visible = true
                } else {
                    requestingPermission = true
                    permission.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
                }
            }
        },
        close = {
            visible = false
            useLocation = false
            locating = false
            routes = emptyList()
            routingUnavailable = false
        }
    )
}
