package dev.daesrock.eventanilla.core.data

import org.junit.Assert.*
import org.junit.Test

class VerificationDeliveryTest {
    @Test fun cooldownUsesServerTimeAndMonotonicElapsedTime() {
        val delivery = VerificationDelivery(DeliveryStatus.PENDING, 1000, 700000, 61000, 0)
        assertEquals(60L, delivery.resendSeconds(0))
        assertEquals(1L, delivery.resendSeconds(59_500_000_000L))
        assertEquals(0L, delivery.resendSeconds(61_000_000_000L))
    }

    @Test fun acceptedCodeExpiresWithoutChangingVerifiedStatus() {
        val delivery = VerificationDelivery(DeliveryStatus.ACCEPTED, 1000, 2000, 1000, 0)
        assertEquals(DeliveryStatus.ACCEPTED, delivery.visibleStatus(999_000_000L))
        assertEquals(DeliveryStatus.EXPIRED, delivery.visibleStatus(1_000_000_000L))
        assertEquals(DeliveryStatus.VERIFIED, delivery.copy(status = DeliveryStatus.VERIFIED).visibleStatus(1_000_000_000L))
    }
}
