package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.R
import dev.daesrock.eventanilla.app.searchSections
import dev.daesrock.eventanilla.core.design.*

@Composable
fun InstitutionalHeader(
    primary: Boolean,
    notifications: Boolean,
    openMenu: () -> Unit,
    back: () -> Unit,
    go: (String) -> Unit,
    searchKey: String
) {
    Column(Modifier.background(Color.White).statusBarsPadding()) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = if (primary) 64.dp else 68.dp).padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!primary) IconButton(onClick = back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = Teal) }
            if (primary) {
                TextButton(onClick = openMenu, contentPadding = PaddingValues(0.dp), modifier = Modifier.weight(1f).heightIn(min = 48.dp)) {
                    Box(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "Abrir menú" }) {
                        BrandLogo(Modifier.widthIn(max = 150.dp).height(48.dp))
                    }
                }
            } else {
                BrandLogo(Modifier.weight(1f).height(48.dp))
            }
            Spacer(Modifier.width(8.dp))
            Image(painterResource(R.drawable.logo_coesa), "COESA", Modifier.width(120.dp).height(49.dp), contentScale = ContentScale.Fit)
            if (notifications) {
                IconButton(
                    onClick = { go("notifications") },
                    modifier = Modifier.padding(start = 4.dp).size(48.dp),
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Color(0xFFFAEDF0))
                ) { InstitutionalIcon(R.raw.header_notifications, description = "Notificaciones") }
            }
        }
        if (primary) InstitutionalStyle { key(searchKey) { SectionSearch(go) } }
        HorizontalDivider(thickness = 2.dp, color = Teal)
    }
}

@Composable
private fun SectionSearch(go: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var focused by remember { mutableStateOf(false) }
    val results = searchSections(query)
    val keyboard = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current
    val choose: (String) -> Unit = { route ->
        query = ""
        focused = false
        focusManager.clearFocus()
        keyboard?.hide()
        go(route)
    }
    Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 6.dp)) {
        Row(
            Modifier.fillMaxWidth().background(PaleTeal, RoundedCornerShape(24.dp)).heightIn(min = 48.dp).padding(start = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            InstitutionalIcon(R.raw.header_search)
            Spacer(Modifier.width(8.dp))
            BasicTextField(
                value = query,
                onValueChange = { query = it },
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = Ink),
                cursorBrush = SolidColor(Teal),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { results.singleOrNull()?.let { choose(it.route) } }),
                modifier = Modifier.weight(1f).heightIn(min = 48.dp).onFocusChanged { focused = it.isFocused }
                    .semantics { contentDescription = "Buscar sección" },
                decorationBox = { input ->
                    Box(contentAlignment = Alignment.CenterStart) {
                        if (query.isEmpty()) Text("Buscar sección", color = Color(0xFF2E383B), style = MaterialTheme.typography.bodyMedium)
                        input()
                    }
                }
            )
            if (query.isNotEmpty()) {
                IconButton(onClick = { query = "" }) { Icon(Icons.Default.Close, "Limpiar búsqueda", tint = Teal) }
            } else {
                Spacer(Modifier.width(12.dp))
            }
        }
        if (focused && query.isNotBlank()) {
            Surface(shadowElevation = 2.dp, color = Color.White, shape = RoundedCornerShape(8.dp)) {
                Column(Modifier.fillMaxWidth().heightIn(max = 240.dp).verticalScroll(rememberScrollState())) {
                    if (results.isEmpty()) Text("Sin resultados", Modifier.padding(16.dp), style = MaterialTheme.typography.bodyMedium)
                    results.forEach { item ->
                        TextButton(onClick = {
                            choose(item.route)
                        }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).testTag("search_${item.route}")) {
                            Text(item.label, Modifier.fillMaxWidth(), color = Ink, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}
