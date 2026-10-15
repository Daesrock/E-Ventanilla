/**
 * Acceso al prototipo mediante perfiles ficticios, sin solicitar credenciales reales.
 * Permite restablecer demostración; la prueba de sesión API vive en /conexion.
 */
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ShieldCheck, UsersRound } from 'lucide-react';
import { useDemo } from '../../../app/providers/demo-context';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../hooks/useToast';
import { SelectField } from '../../../components/ui/Field';

export function LoginPage() {
  const { db, user, login, reset } = useDemo();
  const navigate = useNavigate();
  const notify = useToast();
  const [selected, setSelected] = useState(
    () =>
      db.users.find((item) => item.id === 'demo-department' && item.active)?.id ??
      db.users.find((item) => item.active)?.id ??
      '',
  );
  const [confirmReset, setConfirmReset] = useState(false);
  if (user) return <Navigate to="/inicio" replace />;
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
      <p>Selecciona un perfil.</p>
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
