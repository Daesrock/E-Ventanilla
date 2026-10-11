package dev.daesrock.eventanilla.devtools

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import dev.daesrock.eventanilla.app.AccessCoordinator
import dev.daesrock.eventanilla.app.EVentanillaApp
import dev.daesrock.eventanilla.core.data.ApiGateway
import dev.daesrock.eventanilla.core.data.AuthRepository
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import org.json.JSONObject

/** Plantillas de la interfaz real, con un transporte que no permite solicitudes de red. */
class UiLabActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val gateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject =
                throw java.io.IOException("Esta plantilla funciona sin conexión.")
        }
        val model = AccessCoordinator(AuthRepository(gateway), AuthResources(this))
        val openMenu = intent.getStringExtra("screen") == "menu"
        setContent { EVentanillaTheme { EVentanillaApp(model, initialMenuOpen = openMenu) } }
    }
}
