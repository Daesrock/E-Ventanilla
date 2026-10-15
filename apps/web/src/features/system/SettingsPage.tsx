/** Agrupa opciones secundarias: integración técnica y restablecimiento explícito de la demo. */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PlugZap, RotateCcw } from 'lucide-react';
import { useDemo } from '../../app/providers/demo-context';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export function SettingsPage() {
  const { reset, user } = useDemo();
  const notify = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader title="Configuración" />
      <section className="panel settings-list">
        <Link to="/configuracion/conexion" className="settings-item">
          <PlugZap size={22} />
          <div>
            <strong>Conexión con API</strong>
            <small>Consultar estado y verificar sesión</small>
          </div>
          <ArrowRight size={17} />
        </Link>
        {user?.role !== 'COUNTER_HEAD' && (
          <div className="settings-item">
            <RotateCcw size={22} />
            <div>
              <strong>Datos de demostración</strong>
              <small>Recuperar el conjunto inicial</small>
            </div>
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              Restablecer
            </Button>
          </div>
        )}
      </section>
      {confirm && (
        <Modal title="Restablecer datos" onClose={() => setConfirm(false)}>
          <p>
            Se eliminarán los cambios locales de esta demostración. No se modificarán datos de API.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                reset();
                setConfirm(false);
                notify('Demostración restablecida.');
              }}
            >
              Restablecer
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
