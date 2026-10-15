/** Directorio filtrable de sedes del perfil. Alta reservada a root en la demostración. */
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useDemo } from '../../../app/providers/demo-context';
import { useScopedData } from '../../../hooks/useScopedData';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/Field';
import { Modal } from '../../../components/ui/Modal';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { BranchCard } from '../components/BranchCard';
import { BranchForm } from '../components/BranchForm';

export function BranchesPage() {
  const { user } = useDemo();
  const { branches } = useScopedData();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [creating, setCreating] = useState(false);
  const filtered = branches.filter(
    (branch) =>
      (!type || branch.type === type) &&
      (!municipality || branch.municipality === municipality) &&
      `${branch.name} ${branch.municipality}`
        .toLocaleLowerCase('es')
        .includes(query.toLocaleLowerCase('es')),
  );
  return (
    <>
      <PageHeader
        title="Sedes"
        actions={
          user?.role === 'ROOT' && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Nueva sede
            </Button>
          )
        }
      />
      <div className="filters">
        <div className="field search-field">
          <label htmlFor="branch-search">Buscar sede</label>
          <div className="search-input">
            <Search size={16} />
            <input
              id="branch-search"
              placeholder="Nombre o municipio…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <SelectField
          label="Tipo de ventanilla"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">VUGE y VIM</option>
          <option>VUGE</option>
          <option>VIM</option>
        </SelectField>
        <SelectField
          label="Municipio"
          value={municipality}
          onChange={(event) => setMunicipality(event.target.value)}
        >
          <option value="">Todos los municipios</option>
          {Array.from(new Set(branches.map((branch) => branch.municipality)))
            .sort()
            .map((name) => (
              <option key={name}>{name}</option>
            ))}
        </SelectField>
      </div>
      <p className="muted text-xs mb-4">{filtered.length} sedes</p>
      {filtered.length ? (
        <div className="branch-grid">
          {filtered.map((branch) => (
            <BranchCard branch={branch} key={branch.id} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title={branches.length ? undefined : 'Sin sedes asignadas'}
            description={
              branches.length
                ? undefined
                : 'El jefe de departamento debe asignarte una sede para consultar su información.'
            }
          />
        </div>
      )}
      {creating && (
        <Modal title="Nueva sede" onClose={() => setCreating(false)} wide>
          <BranchForm onDone={() => setCreating(false)} />
        </Modal>
      )}
    </>
  );
}
