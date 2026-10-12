package dev.daesrock.eventanilla.feature.catalog

import dev.daesrock.eventanilla.feature.catalog.data.*
import org.junit.Assert.*
import org.junit.Test

class BranchLinksTest {
    @Test fun encodesThePublishedAddressWithoutInventingCoordinates() {
        assertEquals("https://www.google.com/maps/search/?api=1&query=Calle+%C3%81rbol+%23+2", branchMapUrl("Calle Árbol # 2"))
        assertNull(branchMapUrl(null))
        assertNull(branchMapUrl(" "))
    }

    @Test fun excludesExtensionsFromTheDialedNumber() {
        assertEquals("tel:+529611234567", branchPhoneUrl("961.123.4567, ext. 12, 34 y 56"))
        assertEquals("tel:+529611234567", branchPhoneUrl("961 1234567 EXT. 12"))
    }

    @Test fun doesNotDialAmbiguousOrMissingNumbers() {
        assertNull(branchPhoneUrl("9611234567, 9631234567"))
        assertNull(branchPhoneUrl(null))
        assertNull(branchPhoneUrl("961123"))
        assertNull(branchPhoneUrl("９６１１２３４５６７"))
    }

    @Test fun municipalitiesAreUniqueAndSortedInSpanish() {
        val items = listOf(
            CatalogItem("1", "Primera", municipality = "Palenque"),
            CatalogItem("2", "Segunda", municipality = "Ángel Albino Corzo"),
            CatalogItem("3", "Tercera", municipality = "Comitán de Domínguez"),
            CatalogItem("4", "Cuarta", municipality = "Palenque"),
            CatalogItem("5", "Quinta")
        )
        assertEquals(listOf("Ángel Albino Corzo", "Comitán de Domínguez", "Palenque"), branchMunicipalities(items))
        assertEquals(listOf(items[2]), filterCatalog(items, "COMITAN"))
    }
}
