package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.R
import dev.daesrock.eventanilla.core.design.*

@Composable
fun InstitutionalHeader(primary: Boolean, notifications: Boolean, openMenu: () -> Unit, back: () -> Unit, go: (String) -> Unit) {
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
        HorizontalDivider(thickness = 2.dp, color = Teal)
    }
}
