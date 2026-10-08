package dev.daesrock.eventanilla.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import dev.daesrock.eventanilla.data.AuthResources
import dev.daesrock.eventanilla.data.AuthValidation as V
import dev.daesrock.eventanilla.data.Citizen
import dev.daesrock.eventanilla.data.Municipality
import kotlinx.coroutines.launch
import org.json.JSONObject

private val AuthGreen = Color(0xFF0B6F63)
private const val PasswordHelp = "De 15 a 128 caracteres. Puedes usar una frase con espacios; no necesitas combinar números ni símbolos. Evita contraseñas comunes."

@Stable
private class Fields(val order: List<String>) {
    val values = mutableStateMapOf<String, String>()
    val touched = mutableStateMapOf<String, Boolean>()
    val remote = mutableStateMapOf<String, String>()
    val focus = order.associateWith { FocusRequester() }
    var rules: (String) -> String? = { null }
    fun value(key: String) = values[key].orEmpty()
    fun set(key: String, value: String) { values[key] = value; remote.remove(key) }
    fun error(key: String): String? = remote[key] ?: if (touched[key] == true) rules(key) else null
    fun validate(keys: List<String> = order): Boolean {
        keys.forEach { touched[it] = true }
        val first = keys.firstOrNull { error(it) != null }
        if (first != null) focus[first]?.requestFocus()
        return first == null
    }
    fun next(key: String) { order.getOrNull(order.indexOf(key) + 1)?.let { focus[it]?.requestFocus() } }
}

@Composable
private fun fields(state: AccessState, vararg order: String): Fields {
    val form = remember { Fields(order.toList()) }
    LaunchedEffect(state.errorRevision, state.busy) {
        if (!state.busy && state.fieldErrors.isNotEmpty()) {
            form.remote.clear()
            form.remote.putAll(state.fieldErrors)
            form.order.firstOrNull { form.remote.containsKey(it) }?.let { form.focus[it]?.requestFocus() }
        }
    }
    return form
}

@Composable
private fun Form(title: String, description: String, content: @Composable ColumnScope.() -> Unit) {
    MaterialTheme(colorScheme = MaterialTheme.colorScheme.copy(primary = AuthGreen, onPrimary = Color.White,
        outline = Color(0xFF71827F))) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(description, style = MaterialTheme.typography.bodyLarge)
            content()
        }
    }
}

@Composable
private fun Input(form: Fields, key: String, label: String, enabled: Boolean,
    type: KeyboardType = KeyboardType.Text, capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    autofill: ContentType? = null, secret: Boolean = false, confirmation: Boolean = false,
    done: (() -> Unit)? = null, edit: () -> Unit = {}, transform: (String) -> String = { it }) {
    var visible by remember { mutableStateOf(false) }
    var hadFocus by remember { mutableStateOf(false) }
    val bring = remember { BringIntoViewRequester() }
    val scope = rememberCoroutineScope()
    val error = form.error(key)
    OutlinedTextField(value = form.value(key), onValueChange = { form.set(key, transform(it)); edit() },
        label = { Text(label) }, singleLine = true, enabled = enabled, isError = error != null,
        supportingText = error?.let { { Text(it, Modifier.semantics { liveRegion = LiveRegionMode.Polite }) } },
        keyboardOptions = KeyboardOptions(keyboardType = if (secret) KeyboardType.Password else type,
            capitalization = capitalization, autoCorrectEnabled = false, imeAction = if (done == null) ImeAction.Next else ImeAction.Done),
        keyboardActions = KeyboardActions(onNext = { form.next(key) }, onDone = { done?.invoke() }),
        visualTransformation = if (secret && !visible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (secret) { {
            IconButton(onClick = { visible = !visible }, enabled = enabled, modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)) {
                val noun = if (confirmation) "confirmación" else "contraseña"
                Icon(if (visible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                    "${if (visible) "Ocultar" else "Mostrar"} $noun")
            }
        } } else null,
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).focusRequester(form.focus.getValue(key))
            .bringIntoViewRequester(bring).onFocusChanged {
                if (it.isFocused) { hadFocus = true; scope.launch { bring.bringIntoView() } }
                else if (hadFocus) form.touched[key] = true
            }.semantics { if (autofill != null) contentType = autofill })
}

@Composable
private fun Submit(label: String, busy: Boolean, action: () -> Unit) {
    Button(onClick = action, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(label) }
}

@Composable
private fun AccountLink(question: String, link: String, busy: Boolean, action: () -> Unit) {
    FlowRow(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.Center) {
        Text(question, Modifier.padding(vertical = 14.dp), style = MaterialTheme.typography.bodyMedium)
        TextButton(onClick = action, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) { Text(link) }
    }
}

@Composable
fun LoginScreen(state: AccessState, submit: (String, String) -> Unit, go: (String) -> Unit, edit: () -> Unit) {
    val form = fields(state, "identifier", "password")
    form.rules = { when (it) {
        "identifier" -> V.identifier(form.value(it))
        "password" -> if (form.value(it).isEmpty()) "Escribe tu contraseña." else if (V.characters(form.value(it)) > 128) "Usa como máximo 128 caracteres." else null
        else -> null
    } }
    val send = { if (form.validate()) submit(form.value("identifier"), form.value("password")) }
    Form("Iniciar sesión", "Usa tu CURP o correo electrónico y la contraseña de tu cuenta.") {
        Input(form, "identifier", "CURP o correo", !state.busy, autofill = ContentType.Username, edit = edit)
        Input(form, "password", "Contraseña", !state.busy, secret = true, autofill = ContentType.Password, done = send, edit = edit)
        TextButton(onClick = { go("forgot") }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) { Text("Olvidé mi contraseña") }
        Submit("Iniciar sesión", state.busy, send)
        state.pendingVerificationEmail?.let {
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Tu correo está pendiente de verificación.")
                    TextButton(onClick = { go("verify") }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) { Text("Verificar correo") }
                }
            }
        }
        AccountLink("¿No tienes una cuenta?", "Regístrate", state.busy) { go("register") }
    }
}

@Composable
private fun MunicipalityField(form: Fields, municipalities: List<Municipality>, enabled: Boolean) {
    var open by remember { mutableStateOf(false) }
    val selected = municipalities.find { it.code == form.value("municipalityCode") }
    val error = form.error("municipalityCode") ?: form.remote["municipality"]
    val bring = remember { BringIntoViewRequester() }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxWidth()) {
        OutlinedButton(onClick = { open = true }, enabled = enabled,
            modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).focusRequester(form.focus.getValue("municipalityCode"))
                .bringIntoViewRequester(bring).onFocusChanged { if (it.isFocused) scope.launch { bring.bringIntoView() } }
                .semantics { contentDescription = "Municipio: ${selected?.name ?: "sin seleccionar"}"; if (error != null) error(error) }) {
            Column(Modifier.weight(1f)) {
                Text("Municipio de Chiapas", style = MaterialTheme.typography.labelMedium)
                Text(selected?.name ?: "Selecciona tu municipio", style = MaterialTheme.typography.bodyLarge)
            }
            Icon(Icons.Default.ExpandMore, null)
        }
        if (error != null) Text(error, Modifier.padding(start = 16.dp, top = 4.dp).semantics { liveRegion = LiveRegionMode.Polite }, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
    }
    if (open) MunicipalityDialog(municipalities, selected?.code, { open = false; form.touched["municipalityCode"] = true }) {
        form.set("municipalityCode", it.code); form.remote.remove("municipality"); open = false
    }
}

@Composable
private fun MunicipalityDialog(municipalities: List<Municipality>, selected: String?, dismiss: () -> Unit, choose: (Municipality) -> Unit) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(query, municipalities) { municipalities.filter { V.search(it.name).contains(V.search(query)) } }
    Dialog(onDismissRequest = dismiss) {
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().heightIn(max = 580.dp).imePadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Municipio de Chiapas", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(query, { query = it }, label = { Text("Buscar municipio") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(autoCorrectEnabled = false))
                Text("${filtered.size} resultados", style = MaterialTheme.typography.bodySmall, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                LazyColumn(Modifier.weight(1f, fill = false)) {
                    items(filtered, key = { it.code }) { item ->
                        TextButton(onClick = { choose(item) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                            .semantics { role = Role.RadioButton; this.selected = item.code == selected }) {
                            Text(item.name, Modifier.fillMaxWidth(), style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                    if (filtered.isEmpty()) item { Text("No se encontraron municipios.", Modifier.padding(12.dp)) }
                }
                Text("Fuente: INEGI · Agosto de 2026", style = MaterialTheme.typography.bodySmall)
                TextButton(onClick = dismiss, modifier = Modifier.heightIn(min = 48.dp)) { Text("Cerrar") }
            }
        }
    }
}

@Composable
fun RegisterScreen(state: AccessState, resources: AuthResources, submit: (JSONObject) -> Unit, go: (String) -> Unit) {
    val form = fields(state, "firstName", "lastName", "curp", "municipalityCode", "email", "password", "confirmation", "phone", "rfc")
    form.rules = { key -> when (key) {
        "firstName", "lastName" -> if (form.value(key).isBlank()) "Completa este campo." else if (V.characters(form.value(key).trim()) > if (key == "firstName") 100 else 150) "El texto es demasiado largo." else null
        "curp" -> V.curp(form.value(key))
        "municipalityCode" -> if (resources.municipalities.none { it.code == form.value(key) }) "Selecciona tu municipio." else null
        "email" -> V.email(form.value(key))
        "password" -> V.password(form.value(key), resources.blockedPasswords)
        "confirmation" -> V.confirmation(form.value("password"), form.value(key))
        "phone" -> if (V.characters(form.value(key).trim()) > 25) "Usa como máximo 25 caracteres." else null
        "rfc" -> V.rfc(form.value(key))
        else -> null
    } }
    val send = {
        if (form.validate()) {
            val data = JSONObject()
            listOf("firstName", "lastName", "curp", "municipalityCode", "email").forEach { data.put(it, form.value(it).trim()) }
            data.put("password", form.value("password"))
            listOf("phone", "rfc").filter { form.value(it).isNotBlank() }.forEach { data.put(it, form.value(it).trim()) }
            submit(data)
        }
    }
    Form("Crear cuenta", "Completa tus datos. Para terminar el registro deberás verificar tu correo.") {
        Text("Datos personales", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Input(form, "firstName", "Nombre(s)", !state.busy, capitalization = KeyboardCapitalization.Words, autofill = ContentType.PersonFirstName)
        Input(form, "lastName", "Apellidos", !state.busy, capitalization = KeyboardCapitalization.Words, autofill = ContentType.PersonLastName)
        Input(form, "curp", "CURP", !state.busy, capitalization = KeyboardCapitalization.Characters, transform = { it.uppercase() })
        MunicipalityField(form, resources.municipalities, !state.busy)
        HorizontalDivider()
        Text("Acceso", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Input(form, "email", "Correo electrónico", !state.busy, KeyboardType.Email, autofill = ContentType.EmailAddress)
        Text("Usa un correo al que tengas acceso. Te enviaremos un código para verificarlo.", style = MaterialTheme.typography.bodySmall)
        Text(PasswordHelp, style = MaterialTheme.typography.bodyMedium)
        Input(form, "password", "Contraseña", !state.busy, secret = true, autofill = ContentType.NewPassword)
        Input(form, "confirmation", "Confirmar contraseña", !state.busy, secret = true, confirmation = true, autofill = ContentType.NewPassword)
        HorizontalDivider()
        Text("Datos opcionales", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Input(form, "phone", "Teléfono (opcional)", !state.busy, KeyboardType.Phone, autofill = ContentType.PhoneNumber)
        Input(form, "rfc", "RFC (opcional)", !state.busy, capitalization = KeyboardCapitalization.Characters, done = send, transform = { it.uppercase() })
        Submit("Continuar y verificar correo", state.busy, send)
        AccountLink("¿Ya tienes una cuenta?", "Inicia sesión", state.busy) { go("login") }
    }
}

@Composable
fun VerifyScreen(initialEmail: String, state: AccessState, submit: (String, String) -> Unit, resend: (String) -> Unit) {
    val form = fields(state, "email", "code")
    LaunchedEffect(initialEmail) { form.set("email", initialEmail) }
    form.rules = { when (it) { "email" -> V.email(form.value(it)); "code" -> V.code(form.value(it)); else -> null } }
    val send = { if (form.validate()) submit(form.value("email"), form.value("code")) }
    Form("Verifica tu correo", "Introduce el código recibido para completar el registro. El acceso a tu cuenta se habilita después de verificarlo.") {
        Input(form, "email", "Correo del registro", !state.busy, KeyboardType.Email, autofill = ContentType.EmailAddress)
        Input(form, "code", "Código de verificación", !state.busy, KeyboardType.NumberPassword, autofill = ContentType.SmsOtpCode, done = send)
        Text("El código contiene 8 dígitos.", style = MaterialTheme.typography.bodySmall)
        Submit("Verificar correo", state.busy, send)
        TextButton(onClick = { if (form.validate(listOf("email"))) resend(form.value("email")) }, enabled = !state.busy, modifier = Modifier.heightIn(min = 48.dp)) { Text("Reenviar código") }
    }
}

@Composable
fun ForgotScreen(state: AccessState, submit: (String) -> Unit) {
    val form = fields(state, "identifier")
    form.rules = { V.identifier(form.value("identifier")) }
    val send = { if (form.validate()) submit(form.value("identifier")) }
    Form("Recuperar contraseña", "Introduce tu CURP o correo. La recuperación se enviará al correo verificado de tu cuenta.") {
        Input(form, "identifier", "CURP o correo", !state.busy, autofill = ContentType.Username, done = send)
        Submit("Solicitar código", state.busy, send)
        Text("Si olvidaste qué correo registraste pero recuerdas tu contraseña, puedes entrar con tu CURP.", style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun ResetScreen(state: AccessState, resources: AuthResources, submit: (String, String) -> Unit) {
    val form = fields(state, "code", "password", "confirmation")
    form.rules = { when (it) {
        "code" -> V.code(form.value(it))
        "password" -> V.password(form.value(it), resources.blockedPasswords)
        "confirmation" -> V.confirmation(form.value("password"), form.value(it))
        else -> null
    } }
    val send = { if (form.validate()) submit(form.value("code"), form.value("password")) }
    Form("Establece una contraseña", "Introduce el código recibido y tu nueva contraseña.") {
        Input(form, "code", "Código de recuperación", !state.busy, KeyboardType.NumberPassword, autofill = ContentType.SmsOtpCode)
        Text("El código contiene 8 dígitos.", style = MaterialTheme.typography.bodySmall)
        Text(PasswordHelp, style = MaterialTheme.typography.bodyMedium)
        Input(form, "password", "Nueva contraseña", !state.busy, secret = true, autofill = ContentType.NewPassword)
        Input(form, "confirmation", "Confirmar contraseña", !state.busy, secret = true, confirmation = true, autofill = ContentType.NewPassword, done = send)
        Submit("Guardar contraseña", state.busy, send)
    }
}

@Composable
fun ProfileScreen(citizen: Citizen, busy: Boolean, logout: () -> Unit) {
    Form("Mi perfil", "${citizen.firstName} ${citizen.lastName}") {
        listOf("CURP" to citizen.curp, "Correo verificado" to citizen.email, "Municipio" to citizen.municipality,
            "Teléfono" to citizen.phone, "RFC" to citizen.rfc).forEach { (label, value) ->
            if (value != null) {
                Text(label, style = MaterialTheme.typography.labelMedium, color = AuthGreen)
                Text(value, style = MaterialTheme.typography.bodyLarge)
                HorizontalDivider()
            }
        }
        OutlinedButton(onClick = logout, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Cerrar sesión") }
    }
}
