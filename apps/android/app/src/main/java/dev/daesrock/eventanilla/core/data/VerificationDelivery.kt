package dev.daesrock.eventanilla.core.data

import java.time.Instant
import org.json.JSONObject

enum class DeliveryStatus { PENDING, ACCEPTED, FAILED, EXPIRED, NOT_REQUESTED, VERIFIED }

data class VerificationDelivery(
    val status: DeliveryStatus,
    val serverTime: Long,
    val codeExpiresAt: Long? = null,
    val resendAvailableAt: Long = serverTime,
    val sampledAtNanos: Long = System.nanoTime()
) {
    fun nowMillis(nanos: Long = System.nanoTime()) = serverTime + (nanos - sampledAtNanos) / 1_000_000
    fun resendSeconds(nanos: Long = System.nanoTime()) = ((resendAvailableAt - nowMillis(nanos) + 999) / 1000).coerceAtLeast(0)
    fun visibleStatus(nanos: Long = System.nanoTime()) = if (status == DeliveryStatus.ACCEPTED &&
        codeExpiresAt != null &&
        nowMillis(nanos) >= codeExpiresAt
    ) {
        DeliveryStatus.EXPIRED
    } else {
        status
    }

    companion object {
        fun fromJson(json: JSONObject) = VerificationDelivery(
            DeliveryStatus.valueOf(json.getString("status").uppercase(java.util.Locale.ROOT)),
            Instant.parse(json.getString("serverTime")).toEpochMilli(),
            json.optString("codeExpiresAt").takeIf { it.isNotBlank() && it != "null" }?.let { Instant.parse(it).toEpochMilli() },
            Instant.parse(json.getString("resendAvailableAt")).toEpochMilli()
        )
    }
}
