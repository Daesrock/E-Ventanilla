package dev.daesrock.eventanilla.feature.home.presentation

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import dev.daesrock.eventanilla.R

@Composable
fun HomeScreen() {
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 150.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(
            painterResource(R.drawable.chiapas_shield),
            null,
            Modifier.size(127.dp, 131.dp),
            alpha = 0.15f,
            contentScale = ContentScale.Fit
        )
        Spacer(Modifier.height(30.dp))
        // Text("E-Ventanilla", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleLarge.copy(fontSize = 20.sp))
    }
}
