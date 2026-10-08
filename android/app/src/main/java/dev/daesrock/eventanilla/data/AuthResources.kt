package dev.daesrock.eventanilla.data

import android.content.Context
import org.json.JSONObject
import java.security.MessageDigest
import java.text.Collator
import java.util.Locale

class AuthResources(private val context: Context) {
    private fun bytes(name: String) = context.assets.open(name).use { it.readBytes() }
    private fun sha(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    val catalog = JSONObject(bytes("municipalities.json").toString(Charsets.UTF_8))
    val municipalities: List<Municipality>
    val blockedPasswords: Set<String>
    init {
        val array = catalog.getJSONArray("municipalities")
        // The array has no slash/control characters; JSON compact serialization matches the published checksum.
        check(sha(array.toString().toByteArray(Charsets.UTF_8)) == catalog.getJSONObject("metadata").getString("municipalitiesSha256"))
        val collator = Collator.getInstance(Locale.forLanguageTag("es-MX"))
        municipalities = (0 until array.length()).map { index ->
            val item = array.getJSONObject(index)
            Municipality(item.getString("code"), item.getString("name"))
        }.sortedWith { a, b -> collator.compare(a.name, b.name) }
        check(municipalities.isNotEmpty() && municipalities.map { it.code }.distinct().size == municipalities.size)
        check(municipalities.all { Regex("^07[0-9]{3}$").matches(it.code) && it.name.isNotBlank() })
        val source = bytes("common-passwords.txt")
        val metadata = JSONObject(bytes("common-passwords.metadata.json").toString(Charsets.UTF_8))
        check(sha(source) == metadata.getString("sha256"))
        blockedPasswords = source.toString(Charsets.UTF_8).lineSequence().filter { it.isNotEmpty() }.map { it.lowercase(Locale.ROOT) }.toSet()
    }
}
