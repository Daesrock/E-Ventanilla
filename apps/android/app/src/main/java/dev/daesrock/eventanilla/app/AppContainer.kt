package dev.daesrock.eventanilla.app

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import dev.daesrock.eventanilla.core.data.ApiClient
import dev.daesrock.eventanilla.core.data.AuthRepository
import dev.daesrock.eventanilla.core.data.AuthResources

/** Dependencias explícitas: un repositorio compartido y credenciales solo en memoria. */
class AppContainer(application: Application) {
    private val authentication = AuthRepository(ApiClient())
    private val resources = AuthResources(application)

    fun createAccessCoordinator(): AccessCoordinator = AccessCoordinator(authentication, resources)
}

class EVentanillaApplication : Application() {
    val container: AppContainer by lazy { AppContainer(this) }
}

@Composable
internal fun applicationAccessCoordinator(): AccessCoordinator {
    val application = LocalContext.current.applicationContext as EVentanillaApplication
    return viewModel(
        factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                require(modelClass.isAssignableFrom(AccessCoordinator::class.java))
                return application.container.createAccessCoordinator() as T
            }
        }
    )
}
