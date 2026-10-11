package dev.daesrock.eventanilla.core.data

import java.io.File
import java.util.Locale
import org.junit.Assert.*
import org.junit.Test

class AuthValidationTest {
    private val blocked = File("src/main/assets/common-passwords.txt").readLines().filter {
        it.isNotEmpty()
    }.map { it.lowercase(Locale.ROOT) }.toSet()

    @Test fun unicodeBoundariesWithoutRequiredComposition() {
        listOf("🪻".repeat(12), "z".repeat(12), "🪻".repeat(20), "z".repeat(20), "ClaveSinSimbolos").forEach {
            assertNull(AuthValidation.password(it, blocked))
        }
        listOf("🪻".repeat(11), "z".repeat(11), "🪻".repeat(21), "z".repeat(21)).forEach {
            assertNotNull(AuthValidation.password(it, blocked))
        }
        assertEquals(12, AuthValidation.characters("🪻".repeat(12)))
    }

    @Test fun rejectsWhitespaceWithoutTrimmingOrReplacingIt() {
        listOf(
            " ", "\t", "\n", "\r", "\u0085", "\u00a0", "\u1680", "\u2003",
            "\u2028", "\u2029", "\u202f", "\u205f", "\u3000", "\ufeff"
        ).forEach { space ->
            listOf("${space}ClaveDePrueba", "Clave${space}DePrueba", "ClaveDePrueba$space").forEach {
                assertEquals("La contraseña no debe contener espacios.", AuthValidation.password(it, blocked))
            }
        }
    }

    @Test fun blocksWholeCommonPasswords() {
        val common = blocked.first { AuthValidation.characters(it) == 12 && !Regex("[\\s\\p{Z}\\uFEFF]").containsMatchIn(it) }
        assertNotNull(AuthValidation.password(common, blocked))
        assertNotNull(AuthValidation.password(common.uppercase(Locale.ROOT), blocked))
        assertNull(AuthValidation.password("$common🪻", blocked))
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
