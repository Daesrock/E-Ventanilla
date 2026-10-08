package dev.daesrock.eventanilla.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Teal = Color(0xFF0F8C7D)
val RailTeal = Color(0xFF009887)
val PaleTeal = Color(0xFFE5F5F2)
val Ink = Color(0xFF1A2126)
val Burgundy = Color(0xFFA31A30)

private val Colors = lightColorScheme(
    primary = Teal, onPrimary = Color.White,
    primaryContainer = PaleTeal, onPrimaryContainer = Teal,
    secondary = Burgundy, onSecondary = Color.White,
    background = Color(0xFFF7FAFA), onBackground = Ink,
    surface = Color.White, onSurface = Ink,
    surfaceVariant = PaleTeal, onSurfaceVariant = Color(0xFF2E383B),
    outline = Color(0xFFDBE3E3), error = Burgundy,
)

@Composable
fun EVentanillaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Colors, content = content)
}
