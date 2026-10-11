package dev.daesrock.eventanilla.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.core.design.institutional.*
import dev.daesrock.eventanilla.feature.auth.presentation.*
import dev.daesrock.eventanilla.feature.home.presentation.HomeScreen
import dev.daesrock.eventanilla.ui.DeveloperToolsEntry
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EVentanillaApp(
    vm: AccessCoordinator = applicationAccessCoordinator(),
    initialRoute: String = "home",
    initialMenuOpen: Boolean = false
) {
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val route = entry?.destination?.route ?: "home"
    val state by vm.state.collectAsStateWithLifecycle()
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val primary = mainDestinations.any { it.route == route }
    val keyboard = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) { if (initialMenuOpen) drawer.open() }

    LaunchedEffect(entry) {
        if (entry != null && route !in setOf("reset-code", "reset")) vm.clearRecoveryCode()
    }

    fun go(destination: String) {
        keyboard?.hide()
        vm.clearMessage()
        nav.navigate(destination) {
            if (destination !in setOf("login", "register", "verify", "forgot", "reset-code", "reset")) popUpTo("home")
            launchSingleTop = true
        }
    }

    fun requestAppointment() = vm.requestAppointment({ go("appointment-entry") }, { go("login") }, { go("verify") })
    fun finishAccess() {
        if (vm.appointmentRequested) requestAppointment() else go("profile")
    }

    ModalNavigationDrawer(drawerState = drawer, drawerContent = {
        InstitutionalMenu(route, { scope.launch { drawer.close() } }, ::go) { DeveloperToolsEntry() }
    }) {
        Scaffold(topBar = {
            InstitutionalHeader(
                primary = primary,
                notifications = route !in setOf("login", "register", "verify", "forgot", "reset-code", "reset"),
                openMenu = { scope.launch { drawer.open() } },
                back = {
                    keyboard?.hide()
                    vm.clearMessage()
                    nav.popBackStack()
                },
                go = ::go,
                searchKey = route
            )
        }) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                state.message?.takeIf { state.fieldErrors.isEmpty() }?.let { message ->
                    Surface(color = if (state.error) MaterialTheme.colorScheme.errorContainer else PaleTeal) {
                        Text(
                            message,
                            Modifier.fillMaxWidth().padding(16.dp).semantics {
                                liveRegion = LiveRegionMode.Polite
                            },
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
                NavHost(navController = nav, startDestination = initialRoute, modifier = Modifier.weight(1f)) {
                    composable("home") { InstitutionalPage("home", ::go) { HomeScreen() } }
                    composable("procedures") {
                        InstitutionalPage("procedures", ::go) {
                            PendingScreen(
                                "Trámites y servicios",
                                "Consulta pública",
                                "El catálogo de trámites, requisitos, costos y tiempos está pendiente de corroboración.",
                                scrollable = false
                            )
                        }
                    }
                    composable("directory") {
                        InstitutionalPage("directory", ::go) {
                            PendingScreen(
                                "Directorio de sedes",
                                "Consulta pública",
                                "Las ubicaciones, contactos y horarios vigentes de las sedes están pendientes de corroboración.",
                                scrollable = false
                            )
                        }
                    }
                    composable("appointments") {
                        InstitutionalPage("appointments", ::go) {
                            PendingScreen(
                                "Mis citas",
                                "Atención presencial",
                                "Las citas se habilitarán cuando se confirmen los horarios, la disponibilidad y las reglas de atención de las sedes.",
                                scrollable = false
                            ) {
                                Button(onClick = {
                                    requestAppointment()
                                }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) {
                                    Text("Preparar una cita")
                                }
                            }
                        }
                    }
                    composable("appointment-entry") {
                        PendingScreen(
                            "Preparar una cita",
                            "Cuenta verificada",
                            "Tu cuenta puede continuar con citas. Las reservas siguen pendientes de la disponibilidad y las reglas corroboradas de las sedes."
                        )
                    }
                    composable("notifications") {
                        InstitutionalPage("notifications", ::go) {
                            PendingScreen(
                                "Notificaciones",
                                "Tus avisos",
                                "Los avisos personales de citas estarán disponibles cuando se habilite la gestión de citas.",
                                scrollable = false
                            ) {
                                if (state.citizen == null) Button(onClick = { go("login") }) { Text("Iniciar sesión") }
                            }
                        }
                    }
                    composable("profile") {
                        InstitutionalPage("profile", ::go) {
                            if (state.citizen == null) {
                                AccountIntro(::go)
                            } else {
                                ProfileScreen(
                                    state.citizen!!,
                                    state.busy,
                                    logout = { vm.logout { go("home") } },
                                    verify = { vm.openVerification { go("verify") } },
                                    scrollable = false
                                )
                            }
                        }
                    }
                    composable("login") {
                        LoginScreen(state, { identifier, password ->
                            vm.login(identifier, password) { finishAccess() }
                        }, ::go, vm::clearPendingVerification)
                    }
                    composable("register") { RegisterScreen(state, vm.authResources, { data -> vm.register(data) { go("verify") } }, ::go) }
                    composable("verify") {
                        val owner = LocalLifecycleOwner.current
                        DisposableEffect(vm, owner) {
                            val observer = LifecycleEventObserver { _, event ->
                                if (event == Lifecycle.Event.ON_RESUME) vm.startVerificationPolling()
                                if (event == Lifecycle.Event.ON_PAUSE) vm.stopVerificationPolling()
                            }
                            owner.lifecycle.addObserver(observer)
                            onDispose {
                                owner.lifecycle.removeObserver(observer)
                                vm.stopVerificationPolling()
                            }
                        }
                        VerifyScreen(
                            vm.verificationEmail,
                            state,
                            { code -> vm.verify(code) { finishAccess() } },
                            vm::resendVerification,
                            vm::refreshVerificationStatus,
                            { finishAccess() },
                            {
                                if (state.citizen == null) go("login") else vm.refreshVerificationStatus()
                            }
                        )
                    }
                    composable("forgot") { ForgotScreen(state) { identifier -> vm.requestReset(identifier) { go("reset-code") } } }
                    composable("reset-code") {
                        RecoveryCodeScreen(state, { code -> vm.verifyRecoveryCode(code) { go("reset") } }, {
                            vm.clearRecoveryCode()
                            vm.clearMessage()
                            if (!nav.popBackStack("forgot", false)) go("forgot")
                        })
                    }
                    composable("reset") {
                        if (state.recoveryCodeVerified) {
                            DisposableEffect(vm) { onDispose { vm.clearRecoveryCode() } }
                            ResetScreen(state, vm.authResources) { password ->
                                vm.reset(password) {
                                    keyboard?.hide()
                                    nav.navigate("login") {
                                        popUpTo("forgot") { inclusive = true }
                                        launchSingleTop = true
                                    }
                                }
                            }
                        } else {
                            LaunchedEffect(Unit) {
                                // Durante la animación puede seguir dibujándose esta pantalla
                                // aunque el guardado ya haya llevado al usuario al login.
                                if (nav.currentBackStackEntry?.destination?.route == "reset") {
                                    nav.navigate("reset-code") {
                                        popUpTo("reset") { inclusive = true }
                                        launchSingleTop = true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PendingScreen(
    title: String,
    label: String,
    body: String,
    scrollable: Boolean = true,
    actions: @Composable ColumnScope.() -> Unit = {}
) {
    Column(
        Modifier.fillMaxWidth().then(
            if (scrollable) Modifier.fillMaxSize().verticalScroll(rememberScrollState()) else Modifier
        ).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text(label.uppercase(), style = MaterialTheme.typography.labelMedium, color = Teal)
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(body, style = MaterialTheme.typography.bodyLarge)
            }
        }
        actions()
    }
}

@Composable
private fun AccountIntro(go: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("ACCESO CIUDADANO", style = MaterialTheme.typography.labelMedium, color = Teal)
        Text("Mi cuenta", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Button(onClick = { go("login") }, modifier = Modifier.fillMaxWidth()) { Text("Iniciar sesión") }
        OutlinedButton(onClick = { go("register") }, modifier = Modifier.fillMaxWidth()) { Text("Crear cuenta") }
    }
}
