/** Página 404 del panel con retorno a una ruta válida, sin duplicar layout. */
import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/feedback/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Esta página no existe"
      description="Puedes regresar al resumen para continuar tu consulta."
      action={
        <Link className="button button-primary" to="/inicio">
          Volver al resumen
        </Link>
      }
    />
  );
}
