package dev.daesrock.eventanilla.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import dev.daesrock.eventanilla.app.AccessState
import dev.daesrock.eventanilla.core.data.AuthField
import dev.daesrock.eventanilla.core.data.AuthResources
import dev.daesrock.eventanilla.core.data.RegistrationRequest

@Composable
fun RegisterScreen(state: AccessState, resources: AuthResources, submit: (RegistrationRequest) -> Unit, go: (String) -> Unit) {
    val form = fields(state, "register") { RegisterViewModel(resources.blockedPasswords) }
    val send = {
        if (form.validate()) {
            val data = RegistrationRequest(
                firstName = form.value(AuthField.FIRST_NAME),
                paternalLastName = form.value(AuthField.PATERNAL_LAST_NAME),
                maternalLastName = form.value(AuthField.MATERNAL_LAST_NAME).takeIf { it.isNotBlank() },
                curp = form.value(AuthField.CURP),
                municipalityCode = form.value(AuthField.MUNICIPALITY),
                email = form.value(AuthField.EMAIL),
                password = form.value(AuthField.PASSWORD),
                phone = form.value(AuthField.PHONE).takeIf { it.isNotEmpty() },
                rfc = form.value(AuthField.RFC).takeIf { it.isNotEmpty() }
            )
            submit(data)
        }
    }
    Form("Crear cuenta") {
        Text("Datos personales", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Input(
            form,
            AuthField.FIRST_NAME,
            "Nombre(s)",
            !state.busy,
            capitalization = KeyboardCapitalization.Words,
            autofill = ContentType.PersonFirstName
        )
        Input(
            form,
            AuthField.PATERNAL_LAST_NAME,
            "Apellido paterno",
            !state.busy,
            capitalization = KeyboardCapitalization.Words,
            autofill = ContentType.PersonLastName
        )
        Input(
            form,
            AuthField.MATERNAL_LAST_NAME,
            "Apellido materno",
            !state.busy,
            capitalization = KeyboardCapitalization.Words,
            autofill = ContentType.PersonLastName
        )
        Input(form, AuthField.CURP, "CURP", !state.busy, capitalization = KeyboardCapitalization.Characters)
        MunicipalityField(form, resources.municipalities, !state.busy)
        HorizontalDivider()
        Text("Acceso", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Input(form, AuthField.EMAIL, "Correo electrónico", !state.busy, KeyboardType.Email, autofill = ContentType.EmailAddress)
        Text("Te enviaremos un código para verificar este correo.", style = MaterialTheme.typography.bodySmall)
        Input(form, AuthField.PASSWORD, "Contraseña", !state.busy, secret = true, autofill = ContentType.NewPassword)
        Input(
            form,
            AuthField.CONFIRMATION,
            "Confirmar contraseña",
            !state.busy,
            secret = true,
            confirmation = true,
            autofill = ContentType.NewPassword
        )
        HorizontalDivider()
        Text("Otros datos", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Input(form, AuthField.PHONE, "Teléfono (opcional)", !state.busy, KeyboardType.Phone, autofill = ContentType.PhoneNumber)
        Input(form, AuthField.RFC, "RFC (opcional)", !state.busy, capitalization = KeyboardCapitalization.Characters, done = send)
        Submit("Continuar y verificar correo", state.busy, send)
        AccountLink("¿Ya tienes una cuenta?", "Inicia sesión", state.busy) { go("login") }
    }
}
