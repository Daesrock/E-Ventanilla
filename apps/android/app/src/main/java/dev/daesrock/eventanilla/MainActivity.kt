package dev.daesrock.eventanilla

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import dev.daesrock.eventanilla.app.EVentanillaApp
import dev.daesrock.eventanilla.core.design.EVentanillaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { EVentanillaTheme { EVentanillaApp() } }
    }
}
