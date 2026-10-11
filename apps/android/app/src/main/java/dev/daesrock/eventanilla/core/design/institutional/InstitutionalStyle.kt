package dev.daesrock.eventanilla.core.design.institutional

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import dev.daesrock.eventanilla.R

private val Inter = FontFamily(
    Font(R.font.inter_variable, FontWeight.Normal),
    Font(R.font.inter_variable, FontWeight.Medium),
    Font(R.font.inter_variable, FontWeight.SemiBold),
    Font(R.font.inter_variable, FontWeight.Bold)
)

/** La tipografía de la plantilla no cambia los formularios de autenticación. */
@Composable
fun InstitutionalStyle(content: @Composable () -> Unit) {
    val base = MaterialTheme.typography
    val typography = remember(base) {
        base.copy(
            displayLarge = base.displayLarge.copy(fontFamily = Inter),
            displayMedium = base.displayMedium.copy(fontFamily = Inter),
            displaySmall = base.displaySmall.copy(fontFamily = Inter),
            headlineLarge = base.headlineLarge.copy(fontFamily = Inter),
            headlineMedium = base.headlineMedium.copy(fontFamily = Inter),
            headlineSmall = base.headlineSmall.copy(fontFamily = Inter),
            titleLarge = base.titleLarge.copy(fontFamily = Inter),
            titleMedium = base.titleMedium.copy(fontFamily = Inter),
            titleSmall = base.titleSmall.copy(fontFamily = Inter),
            bodyLarge = base.bodyLarge.copy(fontFamily = Inter),
            bodyMedium = base.bodyMedium.copy(fontFamily = Inter),
            bodySmall = base.bodySmall.copy(fontFamily = Inter),
            labelLarge = base.labelLarge.copy(fontFamily = Inter),
            labelMedium = base.labelMedium.copy(fontFamily = Inter),
            labelSmall = base.labelSmall.copy(fontFamily = Inter)
        )
    }
    MaterialTheme(typography = typography, content = content)
}
