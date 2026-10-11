package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Un único desplazamiento reúne el área de trabajo y el footer. */
@Composable
fun InstitutionalPage(route: String, go: (String) -> Unit, content: @Composable ColumnScope.() -> Unit) {
    InstitutionalStyle {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val workspaceHeight = maxOf(420.dp, maxHeight - 220.dp)
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                    InstitutionalRail(route, go, Modifier.fillMaxHeight())
                    Surface(
                        modifier = Modifier.weight(1f).padding(start = 10.dp, end = 12.dp, top = 10.dp, bottom = 10.dp),
                        shape = RoundedCornerShape(5.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Color.Black)
                    ) {
                        Column(Modifier.fillMaxWidth().heightIn(min = workspaceHeight), content = content)
                    }
                }
                InstitutionalFooter()
            }
        }
    }
}
