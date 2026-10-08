package dev.daesrock.eventanilla.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.daesrock.eventanilla.data.ApiClient
import dev.daesrock.eventanilla.data.ApiFailure
import dev.daesrock.eventanilla.data.Citizen
import dev.daesrock.eventanilla.data.AuthResources
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject

data class AccessState(val busy: Boolean = false, val message: String? = null, val error: Boolean = false, val citizen: Citizen? = null,
    val fieldErrors: Map<String, String> = emptyMap(), val errorRevision: Int = 0, val pendingVerificationEmail: String? = null)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    val authResources = AuthResources(application)
    private val api = ApiClient()
    private val mutable = MutableStateFlow(AccessState())
    val state = mutable.asStateFlow()
    // Sesión solo en memoria en esta primera etapa; no se guardan credenciales en disco.
    private var sessionToken: String? = null
    var verificationEmail = ""
        private set
    var recoveryIdentifier = ""
        private set

    fun clearMessage() { mutable.value = mutable.value.copy(message = null, error = false, fieldErrors = emptyMap(), pendingVerificationEmail = null) }
    fun clearPendingVerification() {
        if (mutable.value.pendingVerificationEmail != null) clearMessage()
    }

    private fun execute(action: suspend () -> Unit) {
        if (mutable.value.busy) return
        mutable.value = mutable.value.copy(busy = true, message = null, error = false, fieldErrors = emptyMap(), pendingVerificationEmail = null)
        viewModelScope.launch {
            try { action() }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) {
                if (error is ApiFailure && error.status == 401 && sessionToken != null) {
                    sessionToken = null
                    mutable.value = mutable.value.copy(citizen = null)
                }
                val message = if (error is ApiFailure) error.message else "No fue posible conectar con el servicio. Intenta nuevamente más tarde."
                val pending = (error as? ApiFailure)?.takeIf { it.status == 403 && it.code == "EMAIL_VERIFICATION_REQUIRED" }?.email
                if (pending != null) verificationEmail = pending
                mutable.value = mutable.value.copy(message = message, error = true,
                    fieldErrors = (error as? ApiFailure)?.fieldErrors.orEmpty(), errorRevision = mutable.value.errorRevision + 1,
                    pendingVerificationEmail = pending)
            } finally { mutable.value = mutable.value.copy(busy = false) }
        }
    }

    fun login(identifier: String, password: String, done: () -> Unit) = execute {
        val json = api.request("auth/login", JSONObject().put("identifier", identifier.trim()).put("password", password))
        sessionToken = json.getString("token")
        mutable.value = mutable.value.copy(citizen = Citizen.fromJson(json.getJSONObject("user")))
        done()
    }

    fun register(data: JSONObject, done: () -> Unit) = execute {
        val json = api.request("auth/register", data)
        verificationEmail = json.getString("email")
        done()
    }

    fun verificationTarget(email: String) { verificationEmail = email.trim() }

    fun verify(code: String, done: () -> Unit) = execute {
        val json = api.request("auth/verify-email", JSONObject().put("email", verificationEmail).put("code", code))
        done()
        mutable.value = mutable.value.copy(message = json.getString("message"))
    }

    fun resendVerification() = execute {
        val json = api.request("auth/resend-verification", JSONObject().put("identifier", verificationEmail))
        mutable.value = mutable.value.copy(message = json.getString("message"))
    }

    fun requestReset(identifier: String, done: () -> Unit) = execute {
        val json = api.request("auth/forgot-password", JSONObject().put("identifier", identifier.trim()))
        recoveryIdentifier = identifier.trim()
        done()
        mutable.value = mutable.value.copy(message = json.getString("message"))
    }

    fun reset(code: String, password: String, done: () -> Unit) = execute {
        val json = api.request("auth/reset-password", JSONObject().put("identifier", recoveryIdentifier).put("code", code).put("password", password))
        sessionToken = null
        mutable.value = mutable.value.copy(citizen = null)
        done()
        mutable.value = mutable.value.copy(message = json.getString("message"))
    }

    fun logout(done: () -> Unit) = execute {
        sessionToken?.let { api.request("auth/logout", JSONObject(), it) }
        sessionToken = null
        mutable.value = mutable.value.copy(citizen = null)
        done()
    }
}
