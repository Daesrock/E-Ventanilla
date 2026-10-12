package dev.daesrock.eventanilla.feature.catalog

import dev.daesrock.eventanilla.feature.catalog.data.CatalogItem
import dev.daesrock.eventanilla.feature.catalog.data.filterCatalog
import org.junit.Assert.*
import org.junit.Test

class CatalogSearchTest {
    private val items = listOf(CatalogItem("1", "VIM · Comitán de Domínguez"), CatalogItem("2", "VUGE · Palenque"))

    @Test fun searchesWithoutAccentsAndKeepsFullNames() {
        assertEquals(items.take(1), filterCatalog(items, " COMITAN "))
        assertEquals(items.take(1), filterCatalog(items, "Comitán"))
        assertEquals(items, filterCatalog(items, ""))
        assertTrue(filterCatalog(items, "sin coincidencia").isEmpty())
    }
}
