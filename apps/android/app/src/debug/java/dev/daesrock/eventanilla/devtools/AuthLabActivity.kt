package dev.daesrock.eventanilla.devtools

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.data.DeliveryStatus
import dev.daesrock.eventanilla.core.data.VerificationDelivery
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.feature.auth.presentation.*

/** Solo src/debug. No tiene ApiClient, sesión real, escritura en disco ni envío de correo. */
class AuthLabActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val screen = intent.getStringExtra("screen")
        val scenario = intent.getStringExtra("scenario")
        setContent { EVentanillaTheme { AuthLab(screen, scenario, ::finish) } }
    }
}

enum class LabScreen(val route: String, val label: String) {
    LOGIN("login", "Iniciar sesión"),
    REGISTER("register", "Crear cuenta"),
    VERIFY("verify", "Verificación de correo"),
    FORGOT("forgot", "Solicitar recuperación"),
    RECOVERY_CODE("reset-code", "Validar código de recuperación"),
    RESET("reset", "Restablecer contraseña")
}

enum class MailScenario(val id: String, val label: String, val status: DeliveryStatus?) {
    ACCEPTED("accepted", "Código enviado", DeliveryStatus.ACCEPTED),
    PENDING("pending", "Envío pendiente", DeliveryStatus.PENDING),
    FAILED("failed", "Envío fallido", DeliveryStatus.FAILED),
    EXPIRED("expired", "Código vencido", DeliveryStatus.EXPIRED),
    NOT_REQUESTED("not_requested", "Sin solicitud", DeliveryStatus.NOT_REQUESTED),
    VERIFIED("verified", "Correo verificado", DeliveryStatus.VERIFIED),
    OFFLINE("offline", "Sin conexión", null),
    TRACKING_EXPIRED("tracking_expired", "Seguimiento vencido", DeliveryStatus.ACCEPTED),
    COOLDOWN("cooldown", "Espera para reenviar", DeliveryStatus.ACCEPTED)
}

private fun scenarioState(scenario: MailScenario, busy: Boolean): AccessState {
    val now = System.currentTimeMillis()
    return AccessState(
        busy = busy,
        delivery = scenario.status?.let {
            VerificationDelivery(
                it,
                now,
                if (it == DeliveryStatus.EXPIRED) now - 1 else now + 600000,
                if (scenario == MailScenario.COOLDOWN) now + 60000 else now
            )
        },
        deliveryNotice = when (scenario) {
            MailScenario.OFFLINE -> "No pudimos comprobar el envío. Revisa tu conexión y actualiza el estado."
            MailScenario.TRACKING_EXPIRED -> "Retoma la verificación desde tu cuenta."
            else -> null
        },
        deliveryRefreshAvailable = scenario == MailScenario.PENDING || scenario == MailScenario.OFFLINE,
        trackingExpired = scenario == MailScenario.TRACKING_EXPIRED
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthLab(initialScreen: String? = null, initialScenario: String? = null, finish: () -> Unit = {}) {
    var screen by remember { mutableStateOf(LabScreen.entries.find { it.route == initialScreen }) }
    var scenario by remember { mutableStateOf(MailScenario.entries.find { it.id == initialScenario } ?: MailScenario.ACCEPTED) }
    var busy by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var expectedCode by remember { mutableStateOf("") }
    var revision by remember { mutableIntStateOf(0) }
    var notice by remember { mutableStateOf<String?>(null) }
    var configure by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val resources = remember { AuthResources(context) }
    val selected = screen
    val back = {
        if (screen == null) {
            finish()
        } else {
            screen = null
            notice = null
        }
    }
    BackHandler(enabled = selected != null, onBack = back)
    Scaffold(topBar = {
        TopAppBar(title = { Text("Pruebas de acceso") }, navigationIcon = {
            IconButton(onClick = back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver") }
        }, actions = {
            if (selected != null) {
                TextButton(onClick = {
                    revision++
                    notice = null
                }) { Text("Reiniciar") }
            }
        })
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
                Text(
                    "PRUEBA LOCAL · Sin envíos ni cuentas reales",
                    Modifier.fillMaxWidth().padding(12.dp),
                    style = MaterialTheme.typography.labelMedium
                )
            }
            if (selected == null) {
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Abre una plantilla", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "Usa los mismos formularios de la app sin registrarte. Lo escrito se conserva solo mientras este laboratorio permanece abierto."
                    )
                    LabScreen.entries.forEach { item ->
                        OutlinedButton(onClick = {
                            screen = item
                            revision++
                            notice = null
                        }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(item.label) }
                    }
                    TextButton(onClick = {
                        configure = !configure
                    }) { Text(if (configure) "Cerrar configuración" else "Configurar prueba") }
                    Text("Estado seleccionado: ${scenario.label}", style = MaterialTheme.typography.bodySmall)
                    if (configure) {
                        Text("Estado de verificación", style = MaterialTheme.typography.titleMedium)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            MailScenario.entries.forEach { item ->
                                FilterChip(selected = scenario == item, onClick = { scenario = item }, label = { Text(item.label) })
                            }
                        }
                        OutlinedTextField(
                            email,
                            { email = it },
                            label = { Text("Destino para visualizar (opcional)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, autoCorrectEnabled = false),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            expectedCode,
                            { expectedCode = it },
                            label = { Text("Código esperado (opcional)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, autoCorrectEnabled = false),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            "Sin código esperado, la prueba acepta cualquier entrada válida de ocho dígitos.",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Row {
                            Checkbox(busy, { busy = it })
                            Text("Simular solicitud en proceso", Modifier.padding(top = 12.dp))
                        }
                    }
                }
            } else {
                key(selected, revision) {
                    var state by remember { mutableStateOf(scenarioState(scenario, busy)) }
                    fun result() {
                        notice = "Formulario válido. Esta prueba no llamó al servidor."
                    }
                    notice?.let {
                        Text(it, Modifier.padding(horizontal = 24.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall)
                    }
                    Box(Modifier.weight(1f)) {
                        when (selected) {
                            LabScreen.LOGIN -> LoginScreen(state, { _, _ -> result() }, { route ->
                                screen =
                                    LabScreen.entries.find { it.route == route }
                            }, {})
                            LabScreen.REGISTER -> RegisterScreen(state, resources, { data ->
                                email = data.email
                                screen = LabScreen.VERIFY
                                scenario = MailScenario.ACCEPTED
                                notice = "Registro simulado en memoria. No se creó una cuenta ni se envió correo."
                            }, { screen = LabScreen.LOGIN })
                            LabScreen.VERIFY -> VerifyScreen(
                                email.ifBlank { "[correo]" },
                                state,
                                { code ->
                                    if (expectedCode.isNotEmpty() &&
                                        code != expectedCode
                                    ) {
                                        state =
                                            state.copy(
                                                fieldErrors = mapOf("code" to "El código no es válido, ya fue utilizado o venció."),
                                                errorRevision =
                                                state.errorRevision + 1
                                            )
                                    } else {
                                        state = scenarioState(MailScenario.VERIFIED, false)
                                        result()
                                    }
                                },
                                {
                                    state = scenarioState(MailScenario.PENDING, false)
                                    notice = "Reenvío simulado. No se envió correo."
                                },
                                refresh = {
                                    state = scenarioState(MailScenario.ACCEPTED, false)
                                    notice = "Estado actualizado localmente."
                                },
                                continueVerified = { result() },
                                retake = {
                                    state = scenarioState(MailScenario.ACCEPTED, false)
                                    notice = "Seguimiento renovado localmente."
                                }
                            )
                            LabScreen.FORGOT -> ForgotScreen(state) {
                                screen = LabScreen.RECOVERY_CODE
                                notice =
                                    "Recuperación simulada. No se envió correo."
                            }
                            LabScreen.RECOVERY_CODE -> RecoveryCodeScreen(state, { code ->
                                if (expectedCode.isNotEmpty() &&
                                    code != expectedCode
                                ) {
                                    state =
                                        state.copy(
                                            fieldErrors = mapOf("code" to "El código no es válido, ya fue utilizado o venció."),
                                            errorRevision =
                                            state.errorRevision + 1
                                        )
                                } else {
                                    screen = LabScreen.RESET
                                    notice = null
                                }
                            }, { screen = LabScreen.FORGOT })
                            LabScreen.RESET -> ResetScreen(state, resources) { result() }
                        }
                    }
                }
            }
        }
    }
}
