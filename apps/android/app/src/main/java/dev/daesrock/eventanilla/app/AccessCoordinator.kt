package dev.daesrock.eventanilla.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dev.daesrock.eventanilla.core.data.ApiFailure
import dev.daesrock.eventanilla.core.data.AuthRepository
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.data.AuthSession
import dev.daesrock.eventanilla.core.data.Citizen
import dev.daesrock.eventanilla.core.data.DeliveryStatus
import dev.daesrock.eventanilla.core.data.RegistrationRequest
import dev.daesrock.eventanilla.core.data.VerificationDelivery
import dev.daesrock.eventanilla.core.data.VerificationReceipt
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

data class AccessState(
    val busy: Boolean = false,
    val message: String? = null,
    val confirmation: String? = null,
    val error: Boolean = false,
    val citizen: Citizen? = null,
    val fieldErrors: Map<String, String> = emptyMap(),
    val errorRevision: Int = 0,
    val pendingVerificationEmail: String? = null,
    val delivery: VerificationDelivery? = null,
    val deliveryNotice: String? = null,
    val deliveryChecking: Boolean = false,
    val trackingExpired: Boolean = false,
    val deliveryRefreshAvailable: Boolean = false,
    val recoveryCodeVerified: Boolean = false
)

class AccessCoordinator(private val repository: AuthRepository, val authResources: AuthResources) : ViewModel() {
    private val mutable = MutableStateFlow(AccessState())
    val state = mutable.asStateFlow()

    // Sesión solo en memoria en esta primera etapa; no se guardan credenciales en disco.
    private var sessionToken: String? = null
    private var trackingToken: String? = null
    private var polling: Job? = null
    private var verificationVisible = false
    var appointmentRequested = false
        private set
    var verificationEmail = ""
        private set
    var recoveryIdentifier = ""
        private set

    // Solo en memoria y durante este flujo. El servidor lo vuelve a comprobar al guardar.
    private var recoveryCode: String? = null
    private var recoveryRevision = 0

    fun clearRecoveryCode() {
        recoveryRevision++
        recoveryCode = null
        mutable.value = mutable.value.copy(recoveryCodeVerified = false)
    }

    fun clearMessage() {
        mutable.value =
            mutable.value.copy(
                message = null,
                confirmation = null,
                error = false,
                fieldErrors = emptyMap(),
                pendingVerificationEmail = null
            )
    }
    fun clearConfirmation(message: String) {
        if (mutable.value.confirmation == message) {
            mutable.value = mutable.value.copy(confirmation = null)
        }
    }
    fun clearPendingVerification() {
        if (mutable.value.pendingVerificationEmail != null) clearMessage()
    }

    private fun saveVerification(receipt: VerificationReceipt?) {
        trackingToken = receipt?.trackingToken
        mutable.value =
            mutable.value.copy(delivery = null, deliveryNotice = null, trackingExpired = false, deliveryRefreshAvailable = false)
    }

    private fun saveSession(session: AuthSession) {
        sessionToken = session.token
        verificationEmail = session.citizen.email
        mutable.value = mutable.value.copy(citizen = session.citizen)
        saveVerification(session.verification)
    }

    private fun clearSession() {
        sessionToken = null
        trackingToken = null
        polling?.cancel()
        mutable.value = mutable.value.copy(citizen = null, delivery = null, deliveryNotice = null)
    }

    private fun execute(onSuccess: (() -> Unit)? = null, action: suspend () -> Unit) {
        if (mutable.value.busy) return
        mutable.value =
            mutable.value.copy(
                busy = true,
                message = null,
                confirmation = null,
                error = false,
                fieldErrors = emptyMap(),
                pendingVerificationEmail = null
            )
        viewModelScope.launch {
            var success = false
            try {
                action()
                success = true
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (error is ApiFailure && error.status == 401 && sessionToken != null) {
                    clearSession()
                }
                val message = if (error is ApiFailure) {
                    error.message
                } else {
                    "No fue posible conectar con el servicio. Intenta nuevamente más tarde."
                }
                val pending = (error as? ApiFailure)?.takeIf { it.status == 403 && it.code == "EMAIL_VERIFICATION_REQUIRED" }?.email
                if (pending != null) {
                    verificationEmail = pending
                    saveVerification((error as ApiFailure).verification)
                }
                mutable.value = mutable.value.copy(
                    message = message,
                    error = true,
                    fieldErrors = (error as? ApiFailure)?.fieldErrors.orEmpty(),
                    errorRevision = mutable.value.errorRevision + 1,
                    pendingVerificationEmail = pending
                )
            } finally {
                mutable.value = mutable.value.copy(busy = false)
            }
            if (success) onSuccess?.invoke()
        }
    }

    fun login(identifier: String, password: String, done: () -> Unit) = execute(onSuccess = done) {
        val session = repository.login(identifier, password)
        saveSession(session)
    }

    fun register(data: RegistrationRequest, done: () -> Unit) = execute(onSuccess = done) {
        val session = repository.register(data)
        saveSession(session)
    }

    fun openVerification(done: () -> Unit) = execute {
        val token = sessionToken
        if (token != null) {
            val context = repository.verificationContext(token)
            verificationEmail = context.email
            saveVerification(context.verification)
            mutable.value = mutable.value.copy(citizen = mutable.value.citizen?.copy(emailVerified = context.emailVerified))
        }
        done()
    }

    fun requestAppointment(allowed: () -> Unit, login: () -> Unit, verify: () -> Unit) = execute {
        appointmentRequested = true
        val token = sessionToken
        if (token == null) {
            login()
            return@execute
        }
        try {
            repository.checkAppointmentAccess(token)
            mutable.value = mutable.value.copy(citizen = mutable.value.citizen?.copy(emailVerified = true))
            appointmentRequested = false
            allowed()
        } catch (error: ApiFailure) {
            when {
                error.status == 401 -> {
                    clearSession()
                    login()
                }
                error.status == 403 && error.code == "EMAIL_VERIFICATION_REQUIRED" -> {
                    verificationEmail = error.email ?: verificationEmail
                    saveVerification(error.verification)
                    mutable.value = mutable.value.copy(citizen = mutable.value.citizen?.copy(emailVerified = false))
                    verify()
                }
                else -> throw error
            }
        }
    }

    fun verify(code: String, done: () -> Unit) = execute(onSuccess = {
        done()
        mutable.value = mutable.value.copy(confirmation = "Correo verificado")
    }) {
        val user = repository.verify(verificationEmail, code)
        polling?.cancel()
        mutable.value =
            mutable.value.copy(
                citizen = if (sessionToken != null &&
                    user != null
                ) {
                    user
                } else {
                    mutable.value.citizen?.copy(emailVerified = true)
                },
                delivery = null,
                deliveryNotice = null,
                deliveryChecking = false
            )
    }

    fun resendVerification() = execute {
        repository.resend(verificationEmail)
        mutable.value = mutable.value.copy(deliveryNotice = null)
        if (verificationVisible) refreshVerificationStatus()
    }

    fun startVerificationPolling() {
        verificationVisible = true
        refreshVerificationStatus()
    }
    fun stopVerificationPolling() {
        verificationVisible = false
        polling?.cancel()
        mutable.value = mutable.value.copy(deliveryChecking = false)
    }

    fun refreshVerificationStatus() {
        if (!verificationVisible) return
        polling?.cancel()
        polling = viewModelScope.launch(start = CoroutineStart.LAZY) {
            var consultingSession = false
            mutable.value = mutable.value.copy(deliveryNotice = null, deliveryChecking = true, deliveryRefreshAvailable = false)
            try {
                if (trackingToken == null) {
                    val session = sessionToken
                    if (session == null) {
                        mutable.value =
                            mutable.value.copy(trackingExpired = true, deliveryNotice = "Retoma la verificación desde tu cuenta.")
                        return@launch
                    }
                    consultingSession = true
                    val context = repository.verificationContext(session)
                    consultingSession = false
                    verificationEmail = context.email
                    saveVerification(context.verification)
                }
                val deadline = System.nanoTime() + 60_000_000_000L
                do {
                    val remainingMillis = ((deadline - System.nanoTime()) / 1_000_000L).coerceAtLeast(1)
                    val delivery = withTimeout(remainingMillis) { repository.verificationStatus(requireNotNull(trackingToken)) }
                    mutable.value = mutable.value.copy(
                        delivery = delivery,
                        trackingExpired = false,
                        citizen = if (delivery.status ==
                            DeliveryStatus.VERIFIED
                        ) {
                            mutable.value.citizen?.copy(emailVerified = true)
                        } else {
                            mutable.value.citizen
                        }
                    )
                    if (delivery.status != DeliveryStatus.PENDING) break
                    delay(3000)
                } while (System.nanoTime() < deadline)
                mutable.value = mutable.value.copy(deliveryRefreshAvailable = mutable.value.delivery?.status == DeliveryStatus.PENDING)
            } catch (error: TimeoutCancellationException) {
                mutable.value = mutable.value.copy(deliveryRefreshAvailable = true)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (error is ApiFailure && error.status == 401) {
                    if (consultingSession) clearSession()
                    trackingToken = null
                    mutable.value =
                        mutable.value.copy(
                            trackingExpired = true,
                            deliveryNotice = "Retoma la verificación desde tu cuenta.",
                            deliveryRefreshAvailable = true
                        )
                } else {
                    mutable.value =
                        mutable.value.copy(
                            deliveryNotice = "No pudimos comprobar el envío. Revisa tu conexión y actualiza el estado.",
                            deliveryRefreshAvailable = true
                        )
                }
            } finally {
                if (polling === coroutineContext[Job]) mutable.value = mutable.value.copy(deliveryChecking = false)
            }
        }
        polling?.start()
    }

    fun requestReset(identifier: String, done: () -> Unit) = execute {
        clearRecoveryCode()
        val revision = recoveryRevision
        repository.forgot(identifier)
        if (revision != recoveryRevision) return@execute
        recoveryIdentifier = identifier.trim()
        done()
    }

    fun verifyRecoveryCode(code: String, done: () -> Unit) = execute {
        clearRecoveryCode()
        val revision = recoveryRevision
        repository.verifyResetCode(recoveryIdentifier, code)
        if (revision != recoveryRevision) return@execute
        recoveryCode = code
        mutable.value = mutable.value.copy(recoveryCodeVerified = true)
        done()
    }

    fun reset(password: String, done: () -> Unit) = execute {
        val code = checkNotNull(recoveryCode) { "Primero valida el código de recuperación." }
        val message = try {
            repository.reset(recoveryIdentifier, code, password)
        } catch (error: ApiFailure) {
            if (error.fieldErrors.containsKey("code")) clearRecoveryCode()
            throw error
        }
        clearRecoveryCode()
        clearSession()
        appointmentRequested = false
        done()
        mutable.value = mutable.value.copy(message = message)
    }

    fun logout(done: () -> Unit) = execute {
        sessionToken?.let { repository.logout(it) }
        clearSession()
        appointmentRequested = false
        done()
    }
}
