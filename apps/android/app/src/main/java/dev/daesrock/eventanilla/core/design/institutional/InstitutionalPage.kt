package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

/** Un único desplazamiento reúne el área de trabajo y el footer. */
@Composable
fun InstitutionalPage(route: String, go: (String) -> Unit, content: @Composable ColumnScope.() -> Unit) {
    InstitutionalStyle {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            // El footer queda después del área de trabajo, sin restarle altura.
            val workspaceHeight = maxHeight
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Box(Modifier.fillMaxWidth()) {
                    Surface(
                        modifier = Modifier.fillMaxWidth().padding(start = NavigationRailWidth),
                        color = if (route in
                            setOf("procedures", "directory", "appointments", "notifications")
                        ) {
                            WorkspaceBackground
                        } else {
                            Color.White
                        }
                    ) {
                        Column(Modifier.fillMaxWidth().heightIn(min = workspaceHeight), content = content)
                    }
                    // El contenido define la altura. La barra la ocupa sin medir
                    // de forma intrínseca cuadrículas, menús o pestañas de Compose.
                    Box(Modifier.matchParentSize()) {
                        InstitutionalRail(route, go, Modifier.fillMaxHeight())
                    }
                }
                InstitutionalFooter()
            }
        }
    }
}
