package dev.daesrock.eventanilla.app

import org.junit.Assert.*
import org.junit.Test

class SectionSearchTest {
    @Test fun findsDestinationsWithoutAccentsOrCase() {
        assertEquals(listOf("procedures"), searchSections(" TRAMITES ").map { it.route })
        assertEquals(listOf("profile"), searchSections("PERFIL").map { it.route })
        assertEquals(listOf("appointments"), searchSections("citas").map { it.route })
        assertEquals(mainDestinations, searchSections(""))
    }

    @Test fun returnsNoInstitutionalResults() {
        assertTrue(searchSections("registro de marca").isEmpty())
        assertTrue(searchSections("sin coincidencias").isEmpty())
    }
}
