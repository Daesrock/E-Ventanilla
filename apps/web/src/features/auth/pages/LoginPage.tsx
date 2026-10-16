/**
 * Acceso institucional con correo/CURP y contraseña. El rol lo determina la cuenta
 * en API; la demostración ya no se ofrece desde esta pantalla.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDemo } from '../../../app/providers/demo-context';
import { Button } from '../../../components/ui/Button';
import { InputField } from '../../../components/ui/Field';
import { useAdminSession } from '../../../app/providers/admin-context';

export function LoginPage() {
  const { user } = useDemo();
  const session = useAdminSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  if (user || session.identity) return <Navigate to="/inicio" replace />;
  return (
    <div className="login-content">
      <h2>Acceso institucional</h2>
      <p>Ingresa con tu correo o CURP y contraseña. El rol lo determina tu cuenta.</p>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setLoginError('');
          try {
            await session.signIn(identifier, password);
            setPassword('');
            navigate('/inicio');
          } catch (cause) {
            setLoginError(cause instanceof Error ? cause.message : 'No se pudo ingresar.');
            setPassword('');
          } finally {
            setBusy(false);
          }
        }}
      >
        <InputField
          label="Correo o CURP"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          required
        />
        <InputField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
        {(loginError || session.error) && (
          <p className="alert alert-error" role="alert">
            {loginError || session.error}
          </p>
        )}
        <Button type="submit" disabled={busy || session.loading}>
          {busy ? 'Ingresando…' : 'Ingresar al panel'}
        </Button>
      </form>
      <p className="login-note">
        Los accesos se administran desde la dependencia. Si no puedes ingresar, solicita apoyo al
        titular de la cuenta.
      </p>
    </div>
  );
}
