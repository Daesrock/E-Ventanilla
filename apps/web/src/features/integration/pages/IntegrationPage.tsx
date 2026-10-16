/**
 * Diagnósticos públicos y prueba opcional de sesión real. No concede permisos al
 * prototipo ni convierte cuentas ciudadanas en personal. No ejecuta altas ni reservas.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Activity, RefreshCw, PlugZap, LogOut, ShieldCheck, LoaderCircle } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { InputField } from '../../../components/ui/Field';
import { apiRequest } from '../../../services/api/client';
import { apiLogin, apiLogout, apiMe, type ApiIdentity } from '../../auth/auth.service';
import { useToast } from '../../../hooks/useToast';

const endpoints = [
  { path: 'health', label: 'Proceso API' },
  { path: 'ready', label: 'Conexión de API a PostgreSQL' },
  { path: 'catalog/status', label: 'Estado de catálogo' },
  { path: 'catalog/municipalities', label: 'Municipios oficiales' },
];

export function IntegrationPage() {
  const notify = useToast();
  const [results, setResults] = useState<Record<string, { ok: boolean; data: unknown }>>({});
  const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [identity, setIdentity] = useState<ApiIdentity | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    apiMe()
      .then((result) => {
        if (mounted) setIdentity(result);
      })
      .catch(() => {
        /* Ausencia de sesión es el estado inicial esperado. */
      });
    return () => {
      mounted = false;
    };
  }, []);
  const check = async (path: string) => {
    setBusy(path);
    setSelected(path);
    try {
      const data = await apiRequest<unknown>(path);
      setResults((current) => ({ ...current, [path]: { ok: true, data } }));
    } catch (cause) {
      setResults((current) => ({
        ...current,
        [path]: {
          ok: false,
          data: { message: cause instanceof Error ? cause.message : 'Error de conexión.' },
        },
      }));
    } finally {
      setBusy('');
    }
  };
  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('login');
    setError('');
    try {
      setIdentity(await apiLogin(identifier, password));
      setPassword('');
      notify('Sesión real verificada. No concede acceso administrativo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo autenticar.');
      setPassword('');
    } finally {
      setBusy('');
    }
  };
  const logout = async () => {
    setBusy('logout');
    try {
      const result = await apiLogout();
      setIdentity(null);
      notify(result.message);
    } catch (cause) {
      setIdentity(null);
      notify(cause instanceof Error ? cause.message : 'No se pudo confirmar revocación.', 'error');
    } finally {
      setBusy('');
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="INTEGRACIÓN HONESTA"
        title="Conexión con API"
        description="Comprueba servicios existentes y, si tienes una cuenta, verifica su sesión sin modificar datos operativos."
      />
      <p className="alert alert-warning">
        Este diagnóstico no cambia el perfil de demostración. Para administrar datos reales, cierra
        la demostración e ingresa por Acceso institucional.
      </p>
      <div className="connection-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Servicios públicos</h2>
              <p>GET reales por backend intermediario</p>
            </div>
            <Activity size={19} className="text-green" />
          </header>
          <div className="panel-body">
            {endpoints.map((endpoint) => (
              <div className="endpoint-row" key={endpoint.path}>
                <div>
                  <strong className="text-xs">{endpoint.label}</strong>
                  <div className="mt-1">
                    <code>/v1/{endpoint.path}</code>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {results[endpoint.path] && (
                    <Badge tone={results[endpoint.path].ok ? 'green' : 'pink'}>
                      {results[endpoint.path].ok ? 'Disponible' : 'Error'}
                    </Badge>
                  )}
                  <Button
                    variant="secondary"
                    disabled={Boolean(busy)}
                    icon={busy === endpoint.path ? LoaderCircle : RefreshCw}
                    onClick={() => void check(endpoint.path)}
                  >
                    Consultar
                  </Button>
                </div>
              </div>
            ))}
            {selected && results[selected] && (
              <>
                <p className="section-kicker mt-6 mb-2">RESPUESTA · {selected}</p>
                <pre className="json-output">{JSON.stringify(results[selected].data, null, 2)}</pre>
              </>
            )}
            <p className="muted text-xs mt-5">
              Origen configurado por servidor. Navegador consulta /bff; no conecta directamente a
              PostgreSQL.
            </p>
          </div>
        </section>
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Verificar sesión existente</h2>
              <p>Integración real de autenticación, separada del perfil demo</p>
            </div>
            <ShieldCheck size={20} className="text-green" />
          </header>
          <div className="panel-body">
            {identity ? (
              <>
                <Badge tone="green">Sesión API activa</Badge>
                <dl className="detail-list mt-5">
                  <div>
                    <dt>CUENTA</dt>
                    <dd>
                      {[identity.user.firstName, identity.user.lastName]
                        .filter(Boolean)
                        .join(' ') ||
                        identity.user.email ||
                        'Cuenta autenticada'}
                    </dd>
                  </div>
                  <div>
                    <dt>CORREO</dt>
                    <dd>{identity.user.email ?? 'No devuelto por la API'}</dd>
                  </div>
                  <div>
                    <dt>VENCIMIENTO</dt>
                    <dd>
                      {new Intl.DateTimeFormat('es-MX', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'America/Mexico_City',
                      }).format(new Date(identity.expiresAt))}
                    </dd>
                  </div>
                </dl>
                <p className="alert alert-info">
                  Token conservado exclusivamente en memoria del BFF. Cookie de navegador contiene
                  identificador web independiente.
                </p>
                <Button
                  variant="secondary"
                  icon={LogOut}
                  disabled={Boolean(busy)}
                  onClick={() => void logout()}
                >
                  Cerrar sesión API
                </Button>
              </>
            ) : (
              <form onSubmit={(event) => void login(event)} className="form-stack">
                <p className="muted text-xs">
                  Utiliza únicamente una cuenta existente autorizada para la prueba. No se registra
                  personal desde este formulario.
                </p>
                <InputField
                  label="Identificador de cuenta"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
                <InputField
                  label="Contraseña"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                {error && (
                  <p className="alert alert-error" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" icon={PlugZap} disabled={Boolean(busy)}>
                  {busy === 'login' ? 'Verificando…' : 'Verificar con API'}
                </Button>
                <p className="muted text-xs">
                  Autenticación no equivale a autorización administrativa. No guardamos contraseña o
                  token en localStorage.
                </p>
              </form>
            )}
          </div>
        </section>
      </div>
      <section className="panel mt-6">
        <div className="panel-body">
          <h2>Acceso administrativo</h2>
          <p className="muted text-xs mt-2">
            La API administrativa y sus permisos se utilizan desde Acceso institucional. Esta
            pantalla conserva únicamente las comprobaciones del entorno de demostración.
          </p>
        </div>
      </section>
    </>
  );
}
