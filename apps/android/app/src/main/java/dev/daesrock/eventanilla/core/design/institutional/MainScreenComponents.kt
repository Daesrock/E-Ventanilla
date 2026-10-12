package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.R
import dev.daesrock.eventanilla.core.design.Ink

val WorkspaceBackground = Color(0xFFF0F1F1)
val MainActionColor = Color(0xFF0B6F63)

@Composable
fun ProfileGreeting(name: String?, openProfile: () -> Unit) {
    if (name.isNullOrBlank()) return
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.End) {
        Text("Hola, $name", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
        IconButton(onClick = openProfile) { Icon(Icons.Outlined.PersonOutline, "Mi perfil", tint = MainActionColor) }
    }
}

/** Mantiene el espacio institucional de Figma sin incorporar campañas de ejemplo. */
@Composable
fun SectionBanner(title: String) {
    Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Ink)) {
        Image(
            painterResource(R.drawable.institutional_pattern),
            null,
            Modifier.matchParentSize(),
            contentScale = ContentScale.Crop,
            alpha = 0.08f
        )
        Row(
            Modifier.fillMaxWidth().heightIn(min = 96.dp).padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Image(painterResource(R.drawable.chiapas_shield), null, Modifier.size(38.dp, 52.dp), contentScale = ContentScale.Fit)
            Text(title, Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.headlineSmall, color = Color.White)
        }
    }
}

@Composable
fun SectionHeading(title: String) {
    Text(title, Modifier.semantics { heading() }, style = MaterialTheme.typography.headlineSmall)
}

@Composable
fun WorkspaceCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}
