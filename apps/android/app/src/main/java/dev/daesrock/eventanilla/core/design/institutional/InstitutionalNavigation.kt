package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import dev.daesrock.eventanilla.R
import dev.daesrock.eventanilla.app.MainDestination
import dev.daesrock.eventanilla.app.mainDestinations
import dev.daesrock.eventanilla.core.design.*

val NavigationRailWidth = 50.dp

@Composable
fun InstitutionalIcon(resource: Int, modifier: Modifier = Modifier, description: String? = null, tint: Color? = null) {
    val context = LocalContext.current
    val loader = remember(context) { ImageLoader.Builder(context).components { add(SvgDecoder.Factory()) }.build() }
    AsyncImage(
        resource,
        description,
        imageLoader = loader,
        modifier = modifier.size(22.dp),
        colorFilter = tint?.let {
            ColorFilter.tint(it)
        }
    )
}

@Composable
private fun DestinationIcon(item: MainDestination, tint: Color? = null) {
    when {
        item.icon != null -> InstitutionalIcon(item.icon, tint = tint)
        item.route == "directory" -> Icon(Icons.AutoMirrored.Filled.List, null, Modifier.size(22.dp))
        else -> Icon(Icons.Default.Archive, null, Modifier.size(22.dp))
    }
}

@Composable
fun BrandLogo(modifier: Modifier = Modifier) {
    Image(painterResource(R.drawable.brand_full), "E-Ventanilla", modifier, contentScale = ContentScale.Fit)
}

@Composable
fun InstitutionalRail(route: String, go: (String) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.width(NavigationRailWidth).background(RailTeal).padding(top = 12.dp)) {
        mainDestinations.forEach { item ->
            val active = item.route == route
            IconButton(
                onClick = { go(item.route) },
                modifier = Modifier.size(50.dp).testTag("rail_${item.route}").semantics { selected = active },
                colors = IconButtonDefaults.iconButtonColors(contentColor = if (active) Color(0xFF155E59) else Color.White)
            ) {
                // El botón anuncia el destino; el icono es decorativo dentro de él.
                androidx.compose.runtime.CompositionLocalProvider(
                    LocalContentColor provides if (active) Color(0xFF155E59) else Color.White
                ) {
                    Box(
                        Modifier.semantics {
                            this.contentDescription = item.label
                        }
                    ) { DestinationIcon(item, if (active) Color(0xFF155E59) else Color.White) }
                }
            }
            Spacer(Modifier.height(4.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InstitutionalMenu(route: String, close: () -> Unit, go: (String) -> Unit, developerTools: @Composable () -> Unit) {
    InstitutionalStyle {
        ModalDrawerSheet(modifier = Modifier.widthIn(max = 300.dp), drawerContainerColor = Color.White) {
            Column(Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState())) {
                Column(Modifier.fillMaxWidth().background(RailTeal).padding(bottom = 12.dp)) {
                    Row(Modifier.fillMaxWidth().heightIn(min = 64.dp)) {
                        IconButton(onClick = close) { Icon(Icons.Default.Close, "Cerrar menú lateral", tint = Color.White) }
                        BrandLogo(Modifier.width(161.dp).height(64.dp))
                    }
                    Text(
                        "Navegación principal",
                        Modifier.padding(start = 56.dp),
                        color = Color(0xFFDBF2F0),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
                Spacer(Modifier.height(16.dp))
                mainDestinations.forEach { item ->
                    NavigationDrawerItem(
                        label = { Text(item.label, style = MaterialTheme.typography.bodyMedium) },
                        selected = route == item.route,
                        onClick = {
                            close()
                            go(item.route)
                        },
                        icon = { DestinationIcon(item) },
                        shape = RoundedCornerShape(12.dp),
                        colors = NavigationDrawerItemDefaults.colors(
                            selectedContainerColor = PaleTeal,
                            selectedTextColor = Teal,
                            selectedIconColor = Teal,
                            unselectedContainerColor = Color.White
                        ),
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 2.dp).heightIn(min = 48.dp)
                    )
                }
                HorizontalDivider(Modifier.padding(horizontal = 18.dp, vertical = 20.dp), color = Color(0xFFDBE3E3))
                developerTools()
            }
            TextButton(onClick = close, modifier = Modifier.padding(12.dp).heightIn(min = 48.dp)) { Text("Cerrar menú", color = Burgundy) }
        }
    }
}
