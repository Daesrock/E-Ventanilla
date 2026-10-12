package dev.daesrock.eventanilla.feature.catalog.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.daesrock.eventanilla.core.data.ApiFailure
import dev.daesrock.eventanilla.feature.catalog.data.CatalogItem
import dev.daesrock.eventanilla.feature.catalog.data.CatalogRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class CatalogState(
    val loading: Boolean = true,
    val items: List<CatalogItem> = emptyList(),
    val detail: CatalogItem? = null,
    val error: String? = null
)

class CatalogViewModel(private val repository: CatalogRepository) : ViewModel() {
    private val mutable = MutableStateFlow(CatalogState())
    val state = mutable.asStateFlow()
    private var started = false

    // Volver desde un detalle conserva la lista y evita otra solicitud innecesaria.
    fun loadOnce(path: String, id: String? = null) {
        if (!started) load(path, id)
    }

    fun load(path: String, id: String? = null) {
        started = true
        mutable.value = CatalogState()
        viewModelScope.launch {
            try {
                mutable.value = if (id == null) {
                    CatalogState(loading = false, items = repository.list(path))
                } else {
                    CatalogState(loading = false, detail = repository.detail(path, id))
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                val message = if (failure is ApiFailure && failure.status == 404) {
                    "Esta información ya no está disponible."
                } else {
                    "No pudimos cargar la información. Intenta nuevamente."
                }
                mutable.value = CatalogState(loading = false, error = message)
            }
        }
    }
}
