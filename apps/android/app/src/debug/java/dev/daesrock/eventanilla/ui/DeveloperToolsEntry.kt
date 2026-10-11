package dev.daesrock.eventanilla.ui

import android.content.Intent
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.app.*
import dev.daesrock.eventanilla.core.design.*
import dev.daesrock.eventanilla.devtools.AuthLabActivity
import dev.daesrock.eventanilla.devtools.UiLabActivity
import dev.daesrock.eventanilla.feature.auth.presentation.*

@Composable
fun DeveloperToolsEntry() {
    val context = LocalContext.current
    TextButton(
        onClick = { context.startActivity(Intent(context, UiLabActivity::class.java)) },
        modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp)
    ) { Text("Pruebas de interfaz (desarrollo)") }
    TextButton(
        onClick = { context.startActivity(Intent(context, AuthLabActivity::class.java)) },
        modifier = Modifier.padding(horizontal = 16.dp).heightIn(min = 48.dp)
    ) {
        Text("Pruebas de acceso (desarrollo)")
    }
}
