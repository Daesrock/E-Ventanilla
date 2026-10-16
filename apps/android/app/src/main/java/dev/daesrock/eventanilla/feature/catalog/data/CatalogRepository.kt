package dev.daesrock.eventanilla.feature.catalog.data

import dev.daesrock.eventanilla.core.data.ApiGateway
import java.text.Collator
import java.text.Normalizer
import java.util.Locale
import org.json.JSONObject

data class CatalogItem(
    val id: String,
    val name: String,
    val municipality: String? = null,
    val type: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val officeHours: String? = null,
    val description: String? = null,
    val requirements: String? = null,
    val cost: String? = null,
    val sourceUrl: String? = null,
    val coordinates: GeoPoint? = null
) {
    companion object {
        fun fromJson(json: JSONObject): CatalogItem {
            fun text(key: String) = if (json.isNull(key)) null else json.optString(key).takeIf { it.isNotBlank() }
            return CatalogItem(
                id = json.getString("id"), name = json.getString("name"),
                municipality = text("municipality"), type = text("type"), address = text("address"),
                phone = text("phone"), email = text("email"), officeHours = text("officeHours"),
                description = text("description"), requirements = text("requirements"), cost = text("cost"), sourceUrl = text("sourceUrl"),
                coordinates = GeoPoint.from(json.optDouble("latitude", Double.NaN), json.optDouble("longitude", Double.NaN))
            )
        }
    }
}

fun filterCatalog(items: List<CatalogItem>, query: String): List<CatalogItem> {
    fun normalize(value: String) = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace("\\p{M}+".toRegex(), "").lowercase(java.util.Locale.ROOT)
    val key = normalize(query.trim())
    return items.filter { normalize(it.name).contains(key) || it.municipality?.let { name -> normalize(name).contains(key) } == true }
}

fun branchMunicipalities(branches: List<CatalogItem>): List<String> {
    val collator = Collator.getInstance(Locale.forLanguageTag("es-MX"))
    return branches.mapNotNull { it.municipality }.distinct().sortedWith { left, right -> collator.compare(left, right) }
}

class CatalogRepository(private val api: ApiGateway) : BranchRoutingSource {
    suspend fun list(path: String): List<CatalogItem> {
        val array = api.request("catalog/$path").getJSONArray("items")
        return (0 until array.length()).map { CatalogItem.fromJson(array.getJSONObject(it)) }
    }
    suspend fun detail(path: String, id: String): CatalogItem = CatalogItem.fromJson(api.request("catalog/$path/$id"))

    override suspend fun routes(origin: GeoPoint, branchIds: List<String>): List<BranchRoute>? {
        if (branchIds.isEmpty()) return emptyList()
        if (branchIds.size > 50) return null
        val body = JSONObject().put("latitude", origin.latitude).put("longitude", origin.longitude)
            .put("branchIds", org.json.JSONArray(branchIds))
        // POST evita que la ubicación aparezca en las URLs de los registros del proxy.
        val response = api.request("catalog/branches/nearby", body)
        if (response.optString("status") != "available" || response.optString("travelMode") != "driving") return null
        val items = response.getJSONArray("items")
        return (0 until items.length()).mapNotNull { index ->
            val item = items.getJSONObject(index)
            val id = item.optString("branchId")
            val distance = item.optDouble("distanceMeters", Double.NaN)
            val duration = item.optDouble("durationSeconds", Double.NaN)
            if (id in branchIds && distance.isFinite() && distance >= 0 && duration.isFinite() && duration >= 0) {
                BranchRoute(id, distance, duration)
            } else {
                null
            }
        }
    }
}
