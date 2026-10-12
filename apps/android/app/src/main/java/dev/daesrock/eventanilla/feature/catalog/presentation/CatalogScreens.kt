package dev.daesrock.eventanilla.feature.catalog.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.daesrock.eventanilla.core.design.institutional.*
import dev.daesrock.eventanilla.feature.catalog.data.*

/** El desplazamiento y el footer pertenecen a InstitutionalPage, no a estas listas. */
@Composable
fun CatalogListScreen(
    path: String,
    repository: CatalogRepository,
    open: (String) -> Unit,
    citizenName: String? = null,
    openProfile: () -> Unit = {},
    openDirectory: () -> Unit = {}
) {
    if (path == "branches") {
        DirectoryScreen(repository, open, citizenName, openProfile)
    } else {
        ProceduresScreen(repository, open, citizenName, openProfile, openDirectory)
    }
}

@Composable
private fun DirectoryScreen(repository: CatalogRepository, open: (String) -> Unit, name: String?, profile: () -> Unit) {
    val model = catalogModel(repository, "branches")
    val state by model.state.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    var municipality by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(model) { model.loadOnce("branches") }
    Column(
        Modifier.fillMaxWidth().background(WorkspaceBackground).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ProfileGreeting(name, profile)
        SectionBanner("Directorio de sedes")
        CatalogSearch(query, { query = it }, branches = true)
        MunicipalityFilter(branchMunicipalities(state.items), municipality, { municipality = it })
        DirectoryMapNotice()
        CatalogLoading(state) { model.load("branches") }
        if (!state.loading && state.error == null) {
            val matches = filterCatalog(state.items, query).filter { municipality == null || it.municipality == municipality }
            SectionHeading(if (municipality == null) "Sedes" else "Sedes en $municipality")
            if (matches.isEmpty()) Text(if (state.items.isEmpty()) "Aún no hay información publicada." else "Sin resultados")
            matches.forEach { branch -> key(branch.id) { BranchCard(branch) { open(branch.id) } } }
        }
    }
}
