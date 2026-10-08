import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { config } from './config.js';

@Injectable()
export class MailService {
  ensureConfigured() {
    if (!config.resendKey || !config.resendFrom) {
      throw new ServiceUnavailableException('El envío de correos todavía no está configurado.');
    }
  }

  async sendCode(email: string, code: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD', id: string) {
    this.ensureConfigured();
    const action = purpose === 'VERIFY_EMAIL' ? 'verificar tu correo y completar el registro' : 'restablecer tu contraseña';
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `auth-${id}`,
        },
        body: JSON.stringify({
          from: config.resendFrom, to: [email],
          subject: purpose === 'VERIFY_EMAIL' ? 'Verifica tu correo — E-Ventanilla' : 'Recupera tu acceso — E-Ventanilla',
          text: `Tu código para ${action} es: ${code}\n\nIntrodúcelo en la aplicación E-Ventanilla. Es temporal y solo se puede usar una vez. Si ha vencido, solicita uno nuevo desde la app. Si no solicitaste esta operación, ignora este mensaje.`,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('delivery');
    } catch {
      // Nunca incluir respuestas del proveedor, credenciales ni códigos en los registros.
      throw new ServiceUnavailableException('No fue posible enviar el correo. Intenta nuevamente más tarde.');
    }
  }
}
