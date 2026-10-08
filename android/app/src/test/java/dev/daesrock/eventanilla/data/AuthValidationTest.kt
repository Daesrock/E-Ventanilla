package dev.daesrock.eventanilla.data

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.Locale

class AuthValidationTest {
    private val blocked = File("src/main/assets/common-passwords.txt").readLines().filter { it.isNotEmpty() }.map { it.lowercase(Locale.ROOT) }.toSet()
    @Test fun unicodeBoundariesAndPhrases() {
        listOf("🪻".repeat(15), "z".repeat(15), "z".repeat(128), "una frase larga sin simbolos", "  una frase con espacios  ").forEach {
            assertNull(AuthValidation.password(it, blocked))
        }
        listOf("🪻".repeat(14), "z".repeat(14), "🪻".repeat(129), "z".repeat(129)).forEach {
            assertNotNull(AuthValidation.password(it, blocked))
        }
        assertEquals(15, AuthValidation.characters("🪻".repeat(15)))
    }
    @Test fun blocksWholeCommonPasswords() {
        val common = blocked.first { AuthValidation.characters(it) >= 15 }
        assertNotNull(AuthValidation.password(common, blocked))
        assertNotNull(AuthValidation.password(common.uppercase(Locale.ROOT), blocked))
        assertNull(AuthValidation.password("$common frase diferente", blocked))
    }
    @Test fun confirmationPreservesSpacesAndUnicode() {
        assertNull(AuthValidation.confirmation("  frase con 🪻  ", "  frase con 🪻  "))
        assertNotNull(AuthValidation.confirmation("  frase con 🪻  ", "frase con 🪻"))
        assertNotNull(AuthValidation.confirmation("una frase", ""))
        assertNotNull(AuthValidation.confirmation("á", "a\u0301"))
    }
    @Test fun searchIgnoresCaseAndAccents() {
        assertEquals("san cristobal", AuthValidation.search(" San Cristóbal "))
        assertEquals(AuthValidation.search("COMITÁN"), AuthValidation.search("comitan"))
        assertNull(AuthValidation.code("12345678"))
        assertNotNull(AuthValidation.code("１２３４５６７８"))
    }
}
