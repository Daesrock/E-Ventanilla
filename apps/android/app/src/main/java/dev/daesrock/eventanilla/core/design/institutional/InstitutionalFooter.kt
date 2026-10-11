package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.R
import dev.daesrock.eventanilla.core.design.Ink

const val PRIVACY_URL = "https://coesa.chiapas.gob.mx/proteccion-de-datos-personales/avisos-de-privacidad"

@Composable
fun InstitutionalFooter(openPrivacy: (() -> Unit)? = null) {
    val uriHandler = LocalUriHandler.current
    BoxWithConstraints(Modifier.fillMaxWidth().background(Ink)) {
        val stackContact = maxWidth < 360.dp || LocalDensity.current.fontScale > 1.3f
        Image(
            painterResource(R.drawable.institutional_pattern),
            null,
            Modifier.matchParentSize().padding(18.dp),
            alpha = 0.05f,
            contentScale = ContentScale.Fit
        )
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            HorizontalDivider(color = Color(0xFF404A4D))
            Spacer(Modifier.height(12.dp))
            val open = { if (openPrivacy != null) openPrivacy() else uriHandler.openUri(PRIVACY_URL) }
            if (stackContact) {
                ContactText(Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                FooterMarks(open, Modifier.align(Alignment.End))
            } else {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ContactText(Modifier.weight(1f))
                    FooterMarks(open)
                }
            }
        }
    }
}

@Composable
private fun ContactText(modifier: Modifier) {
    Text(
        "Boulevard Andrés Serra Rojas No. 1090,\nEdificio Anexo a la Torre Chiapas Nivel 1A,\nCol. Paso Limón C.P. 29045\nTuxtla Gutiérrez, Chiapas.\nTel. (961) 69 147 22 Ext. 68281",
        modifier,
        color = Color(0xFFC7D6D4),
        style = MaterialTheme.typography.bodySmall
    )
}

@Composable
private fun FooterMarks(open: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Image(painterResource(R.drawable.chiapas_shield), null, Modifier.size(53.dp, 65.dp), alpha = 0.45f, contentScale = ContentScale.Fit)
        Image(
            painterResource(R.drawable.privacy_qr),
            null,
            Modifier.size(104.dp).semantics { contentDescription = "Abrir avisos de privacidad de COESA" }
                .clickable(role = Role.Button, onClick = open),
            contentScale = ContentScale.Fit
        )
    }
}
