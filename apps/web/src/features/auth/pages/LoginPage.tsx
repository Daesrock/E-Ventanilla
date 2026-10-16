/**
 * Acceso institucional con contraseña y perfiles ficticios explícitamente separados.
 * La autorización real procede de admin/me; restablecer solo afecta la demostración.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ShieldCheck, UsersRound } from 'lucide-react';
import { useDemo } from '../../../app/providers/demo-context';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../hooks/useToast';
import { SelectField } from '../../../components/ui/Field';
import { InputField } from '../../../components/ui/Field';
import { useAdminSession } from '../../../app/providers/admin-context';

export function LoginPage() {
  const { db, user, login, reset } = useDemo();
  const session = useAdminSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const notify = useToast();
  const [selected, setSelected] = useState(
    () =>
      db.users.find((item) => item.id === 'demo-department' && item.active)?.id ??
      db.users.find((item) => item.active)?.id ??
      '',
  );
  const [confirmReset, setConfirmReset] = useState(false);
  if (user || session.identity) return <Navigate to="/inicio" replace />;
  const profiles = [
    {
      id: 'demo-department',
      title: 'Jefe de departamento',
      icon: UsersRound,
    },
    {
      id: 'demo-counter',
      title: 'Jefe de ventanilla',
      icon: Building2,
    },
    {
      id: 'demo-root',
      title: 'Root · preparación inicial',
      icon: ShieldCheck,
    },
  ];
  const selectedRole = db.users.find((item) => item.id === selected)?.role;
  const roleFor = (id: string) => db.users.find((item) => item.id === id)?.role;
  const accounts = db.users.filter((item) => item.role === selectedRole && item.active);
  return (
    <div className="login-content">
      <h2>Acceso</h2>
      <p>Acceso institucional con correo o CURP y contraseña. El rol lo determina tu cuenta.</p>
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
      <h3 className="mt-6">Modo demostración</h3>
      <p>Datos ficticios guardados en este navegador. Selecciona un perfil.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            login(selected);
            navigate('/inicio');
          } catch (error) {
            notify(error instanceof Error ? error.message : 'No se pudo iniciar la demo.', 'error');
          }
        }}
      >
        <fieldset className="border-0 p-0 m-0">
          <legend className="sr-only">Perfil de demostración</legend>
          {profiles.map((profile) => (
            <label className="profile-option" key={profile.id}>
              <span className="profile-icon">
                <profile.icon size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>{profile.title}</strong>
              </div>
              <input
                aria-label={profile.title}
                type="radio"
                name="profile"
                value={profile.id}
                checked={selectedRole === roleFor(profile.id)}
                onChange={() =>
                  setSelected(
                    db.users.find((item) => item.id === profile.id && item.active)?.id ??
                      db.users.find((item) => item.role === roleFor(profile.id) && item.active)
                        ?.id ??
                      '',
                  )
                }
                disabled={
                  !db.users.some((item) => item.role === roleFor(profile.id) && item.active)
                }
              />
            </label>
          ))}
        </fieldset>
        {accounts.length > 1 && (
          <div className="my-4">
            <SelectField
              label="Cuenta de demostración"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        <Button
          type="submit"
          className="login-submit"
          disabled={!accounts.some((item) => item.id === selected)}
        >
          Entrar a la demostración
          <ArrowRight size={17} />
        </Button>
      </form>
      <p className="login-note">Demostración con datos ficticios.</p>
      <button className="login-reset" onClick={() => setConfirmReset(true)}>
        Restablecer datos de demostración
      </button>
      {confirmReset && (
        <Modal title="Restablecer demostración" onClose={() => setConfirmReset(false)}>
          <p>
            Se reemplazarán únicamente datos ficticios guardados en este navegador. API y base de
            datos no recibirán cambios.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                reset();
                setSelected('demo-department');
                setConfirmReset(false);
                notify('Demostración restablecida.');
              }}
            >
              Restablecer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
