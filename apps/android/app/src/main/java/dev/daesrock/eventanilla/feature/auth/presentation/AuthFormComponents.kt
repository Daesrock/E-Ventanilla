package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.daesrock.eventanilla.app.AccessState
import dev.daesrock.eventanilla.core.data.AuthField
import kotlinx.coroutines.launch

internal val AuthGreen = Color(0xFF0B6F63)

@Stable
internal class Fields(private val model: AuthFormViewModel) {
    val order = model.order
    val touched = model.touched
    val remote = model.remoteErrors
    val focus = order.associateWith { FocusRequester() }
    fun value(key: AuthField) = model.value(key)
    fun set(key: AuthField, value: String) = model.set(key, value)
    fun error(key: AuthField): String? = model.error(key)
    fun validate(): Boolean {
        order.forEach { touched[it] = true }
        val first = order.firstOrNull { error(it) != null }
        first?.let { focus[it]?.requestFocus() }
        return first == null
    }
    fun next(key: AuthField) {
        order.getOrNull(order.indexOf(key) + 1)?.let { focus[it]?.requestFocus() }
    }
}

@Composable
internal fun fields(state: AccessState, screen: String, factory: () -> AuthFormViewModel): Fields {
    val model: AuthFormViewModel = viewModel(
        key = screen,
        factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = factory() as T
        }
    )
    val form = remember(model) { Fields(model) }
    LaunchedEffect(state.errorRevision, state.busy) {
        if (!state.busy && state.fieldErrors.isNotEmpty()) {
            form.remote.clear()
            state.fieldErrors.forEach { (wireName, message) ->
                AuthField.entries.find { it.wireName == wireName || (it == AuthField.MUNICIPALITY && wireName == "municipality") }
                    ?.let { form.remote[it] = message }
            }
            form.order.firstOrNull { form.remote.containsKey(it) }?.let { form.focus[it]?.requestFocus() }
        }
    }
    return form
}

@Composable
internal fun Form(title: String, description: String? = null, scrollable: Boolean = true, content: @Composable ColumnScope.() -> Unit) {
    MaterialTheme(
        colorScheme = MaterialTheme.colorScheme.copy(
            primary = AuthGreen,
            onPrimary = Color.White,
            outline = Color(0xFF71827F)
        )
    ) {
        Column(
            Modifier.fillMaxWidth().then(if (scrollable) Modifier.fillMaxSize().verticalScroll(rememberScrollState()) else Modifier)
                .imePadding().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(title, Modifier.semantics { heading() }, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            if (!description.isNullOrBlank()) Text(description, style = MaterialTheme.typography.bodyLarge)
            content()
        }
    }
}

@Composable
internal fun Input(
    form: Fields,
    key: AuthField,
    label: String,
    enabled: Boolean,
    type: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    autofill: ContentType? = null,
    secret: Boolean = false,
    confirmation: Boolean = false,
    done: (() -> Unit)? = null,
    edit: () -> Unit = {}
) {
    var visible by remember { mutableStateOf(false) }
    var hadFocus by remember { mutableStateOf(false) }
    val bring = remember { BringIntoViewRequester() }
    val scope = rememberCoroutineScope()
    val error = form.error(key)
    OutlinedTextField(
        value = form.value(key), onValueChange = {
            form.set(key, it)
            edit()
        },
        label = { Text(label) }, singleLine = true, enabled = enabled, isError = error != null,
        supportingText = error?.let { { Text(it, Modifier.semantics { liveRegion = LiveRegionMode.Polite }) } },
        keyboardOptions = KeyboardOptions(
            keyboardType = if (secret) KeyboardType.Password else type,
            capitalization = capitalization,
            autoCorrectEnabled = false,
            imeAction = if (done == null) ImeAction.Next else ImeAction.Done
        ),
        keyboardActions = KeyboardActions(onNext = { form.next(key) }, onDone = { done?.invoke() }),
        visualTransformation = if (secret && !visible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (secret) {
            {
                IconButton(onClick = {
                    visible = !visible
                }, enabled = enabled, modifier = Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)) {
                    val noun = if (confirmation) "confirmación" else "contraseña"
                    Icon(
                        if (visible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        "${if (visible) "Ocultar" else "Mostrar"} $noun"
                    )
                }
            }
        } else {
            null
        },
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).focusRequester(form.focus.getValue(key))
            .bringIntoViewRequester(bring).onFocusChanged {
                if (it.isFocused) {
                    hadFocus = true
                    scope.launch { bring.bringIntoView() }
                } else if (hadFocus) {
                    form.touched[key] = true
                }
            }.semantics { if (autofill != null) contentType = autofill }
    )
}

@Composable
internal fun Submit(label: String, busy: Boolean, action: () -> Unit) {
    Button(onClick = action, enabled = !busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(label) }
}

@Composable
internal fun AccountLink(question: String, link: String, busy: Boolean, action: () -> Unit) {
    FlowRow(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.Center) {
        Text(question, Modifier.padding(vertical = 14.dp), style = MaterialTheme.typography.bodyMedium)
        TextButton(onClick = action, enabled = !busy, modifier = Modifier.heightIn(min = 48.dp)) { Text(link) }
    }
}
