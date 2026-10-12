package dev.daesrock.eventanilla.devtools

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.MainActivity
import dev.daesrock.eventanilla.app.AccessCoordinator
import dev.daesrock.eventanilla.app.EVentanillaApp
import dev.daesrock.eventanilla.core.data.ApiGateway
import dev.daesrock.eventanilla.core.data.AuthRepository
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.design.EVentanillaTheme
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import org.json.JSONArray
import org.json.JSONObject

/** Plantillas de la interfaz real, con un transporte que no permite solicitudes de red. */
class UiLabActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val gateway = object : ApiGateway {
            override suspend fun request(path: String, body: JSONObject?, token: String?): JSONObject {
                check(body == null && token == null) { "Esta plantilla no permite escrituras ni sesiones." }
                return when (path) {
                    "catalog/branches", "catalog/procedures" -> JSONObject().put("items", JSONArray())
                    else -> throw java.io.IOException("Esta plantilla funciona sin conexión.")
                }
            }
        }
        val model = AccessCoordinator(AuthRepository(gateway), AuthResources(this))
        val screen = intent.getStringExtra("screen") ?: "home"
        val openMenu = screen == "menu"
        val route = screen.takeIf { it in setOf("home", "procedures", "directory", "appointments", "notifications", "profile") } ?: "home"
        setContent {
            EVentanillaTheme {
                Column(Modifier.fillMaxSize()) {
                    Box(Modifier.weight(1f)) {
                        EVentanillaApp(
                            model,
                            initialRoute = route,
                            initialMenuOpen = openMenu,
                            catalogRepository = CatalogRepository(gateway)
                        )
                    }
                    Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
                        Row(
                            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Vista de diseño · Sin conexión", Modifier.weight(1f), style = MaterialTheme.typography.labelMedium)
                            TextButton(onClick = {
                                startActivity(Intent(this@UiLabActivity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
                                finish()
                            }) { Text("Abrir app") }
                        }
                    }
                }
            }
        }
    }
}
