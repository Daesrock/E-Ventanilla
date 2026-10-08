package dev.daesrock.eventanilla.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.*
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import dev.daesrock.eventanilla.R
import kotlinx.coroutines.launch

private data class Destination(val route: String, val label: String, val icon: Int? = null)
private val destinations = listOf(
    Destination("home", "Inicio", R.raw.nav_home),
    Destination("procedures", "Trámites y servicios", R.raw.nav_procedures),
    Destination("directory", "Directorio"),
    Destination("appointments", "Mis citas"),
    Destination("notifications", "Notificaciones", R.raw.nav_notifications),
    Destination("profile", "Mi perfil", R.raw.nav_profile),
)

@Composable
private fun FigmaIcon(resource: Int, description: String?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val loader = remember { ImageLoader.Builder(context).components { add(SvgDecoder.Factory()) }.build() }
    AsyncImage(model = resource, imageLoader = loader, contentDescription = description, modifier = modifier.size(22.dp))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EVentanillaApp(vm: AppViewModel = viewModel(), initialRoute: String = "home") {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: "home"
    val state by vm.state.collectAsStateWithLifecycle()
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val primary = destinations.any { it.route == route }

    fun go(destination: String) {
        vm.clearMessage()
        nav.navigate(destination) { launchSingleTop = true }
    }

    ModalNavigationDrawer(drawerState = drawer, drawerContent = {
        ModalDrawerSheet(modifier = Modifier.width(300.dp), drawerContainerColor = Color.White) {
            Column(Modifier.fillMaxWidth().background(RailTeal).padding(24.dp)) {
                Image(painterResource(R.drawable.brand_drawer), "E-Ventanilla", Modifier.width(161.dp).height(68.dp), contentScale = ContentScale.Crop)
                Text("Navegación principal", color = Color.White, style = MaterialTheme.typography.labelMedium)
            }
            Spacer(Modifier.height(16.dp))
            destinations.forEach { item ->
                NavigationDrawerItem(
                    label = { Text(item.label) }, selected = route == item.route,
                    colors = NavigationDrawerItemDefaults.colors(selectedContainerColor = PaleTeal, selectedTextColor = Teal, selectedIconColor = Teal),
                    shape = RoundedCornerShape(12.dp),
                    onClick = {
                        scope.launch { drawer.close() }
                        vm.clearMessage()
                        nav.navigate(item.route) { popUpTo("home"); launchSingleTop = true }
                    },
                    icon = {
                        when {
                            item.icon != null -> FigmaIcon(item.icon, null)
                            item.route == "directory" -> Icon(Icons.AutoMirrored.Filled.List, null)
                            else -> Icon(Icons.Default.Archive, null)
                        }
                    }, modifier = Modifier.padding(horizontal = 12.dp),
                )
            }
            Spacer(Modifier.weight(1f))
            TextButton(onClick = { scope.launch { drawer.close() } }, modifier = Modifier.padding(16.dp)) {
                Text("Cerrar menú", color = Burgundy)
            }
        }
    }) {
        Scaffold(topBar = {
            Column(Modifier.background(Color.White).statusBarsPadding()) {
                Row(Modifier.fillMaxWidth().height(68.dp).padding(end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (primary) scope.launch { drawer.open() } else { vm.clearMessage(); nav.popBackStack() } }) {
                        Icon(if (primary) Icons.Default.Menu else Icons.AutoMirrored.Filled.ArrowBack, if (primary) "Abrir menú" else "Volver", tint = Teal)
                    }
                    Image(painterResource(R.drawable.brand_header), "E-Ventanilla", Modifier.width(83.dp).height(51.dp), contentScale = ContentScale.Crop)
                    Spacer(Modifier.weight(1f))
                    Image(painterResource(R.drawable.logo_coesa), "COESA", Modifier.width(120.dp).height(49.dp), contentScale = ContentScale.Fit)
                    if (route !in setOf("login", "register", "verify", "forgot", "reset")) IconButton(onClick = { go("notifications") }) {
                        FigmaIcon(R.raw.header_notifications, "Notificaciones")
                    }
                }
                HorizontalDivider(thickness = 2.dp, color = Teal)
            }
        }) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                state.message?.let { message ->
                    Surface(color = if (state.error) MaterialTheme.colorScheme.errorContainer else PaleTeal) {
                        Text(message, Modifier.fillMaxWidth().padding(16.dp).semantics { liveRegion = LiveRegionMode.Polite }, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                NavHost(navController = nav, startDestination = initialRoute, modifier = Modifier.weight(1f)) {
                    composable("home") { HomeScreen(::go) }
                    composable("procedures") { PendingScreen("Trámites y servicios", "Consulta pública", "El catálogo de trámites, requisitos, costos y tiempos está pendiente de corroboración.") }
                    composable("directory") { PendingScreen("Directorio de sedes", "Consulta pública", "Las ubicaciones, contactos y horarios vigentes de las sedes están pendientes de corroboración.") }
                    composable("appointments") {
                        PendingScreen("Mis citas", "Atención presencial", "Las citas se habilitarán cuando se confirmen los horarios, la disponibilidad y las reglas de atención de las sedes.") {
                            if (state.citizen == null) Button(onClick = { go("login") }) { Text("Iniciar sesión") }
                        }
                    }
                    composable("notifications") {
                        PendingScreen("Notificaciones", "Tus avisos", "Los avisos personales de citas estarán disponibles cuando se habilite la gestión de citas.") {
                            if (state.citizen == null) Button(onClick = { go("login") }) { Text("Iniciar sesión") }
                        }
                    }
                    composable("profile") {
                        if (state.citizen == null) AccountIntro(::go)
                        else ProfileScreen(state.citizen!!, state.busy) { vm.logout { go("home") } }
                    }
                    composable("login") { LoginScreen(state, { identifier, password -> vm.login(identifier, password) { go("profile") } }, ::go, vm::clearPendingVerification) }
                    composable("register") { RegisterScreen(state, vm.authResources, { data -> vm.register(data) { go("verify") } }, ::go) }
                    composable("verify") { VerifyScreen(vm.verificationEmail, state,
                        { email, code -> vm.verificationTarget(email); vm.verify(code) { go("login") } },
                        { email -> vm.verificationTarget(email); vm.resendVerification() }) }
                    composable("forgot") { ForgotScreen(state) { identifier -> vm.requestReset(identifier) { go("reset") } } }
                    composable("reset") { ResetScreen(state, vm.authResources) { code, password -> vm.reset(code, password) { go("login") } } }
                }
            }
        }
    }
}

@Composable
private fun HomeScreen(go: (String) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("ATENCIÓN PRESENCIAL", style = MaterialTheme.typography.labelMedium, color = Teal, fontWeight = FontWeight.Bold)
        Text("Bienvenido a\nE-Ventanilla", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
        Text("Consulta información sobre sedes y trámites, y prepara tu próxima visita.", style = MaterialTheme.typography.bodyLarge)
        HomeCard("Trámites y servicios", "Consulta los requisitos para tu atención.") { go("procedures") }
        HomeCard("Encuentra una sede", "Revisa el directorio de ventanillas.") { go("directory") }
        Card(colors = CardDefaults.cardColors(containerColor = PaleTeal)) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Tu cuenta en E-Ventanilla", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text("El registro requiere verificar tu correo electrónico.")
                Button(onClick = { go("profile") }) { Text("Ir a mi cuenta"); Spacer(Modifier.width(8.dp)); Icon(Icons.AutoMirrored.Filled.ArrowForward, null) }
            }
        }
        Text("La información institucional pendiente de confirmar se indicará en cada sección.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun HomeCard(title: String, body: String, click: () -> Unit) {
    OutlinedCard(onClick = click, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(body, style = MaterialTheme.typography.bodyMedium)
            }
            Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Teal)
        }
    }
}

@Composable
private fun PendingScreen(title: String, label: String, body: String, actions: @Composable ColumnScope.() -> Unit = {}) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelMedium, color = Teal)
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Información pendiente", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(body, style = MaterialTheme.typography.bodyLarge)
            }
        }
        actions()
    }
}

@Composable
private fun AccountIntro(go: (String) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("ACCESO CIUDADANO", style = MaterialTheme.typography.labelMedium, color = Teal)
        Text("Mi cuenta", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Accede con tu CURP o correo y contraseña. Si aún no tienes una cuenta, regístrate y verifica tu correo.", style = MaterialTheme.typography.bodyLarge)
        Button(onClick = { go("login") }, modifier = Modifier.fillMaxWidth()) { Text("Iniciar sesión") }
        OutlinedButton(onClick = { go("register") }, modifier = Modifier.fillMaxWidth()) { Text("Crear cuenta") }
    }
}
