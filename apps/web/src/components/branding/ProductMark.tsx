/** Marca del producto y nombre, independiente del emblema oficial de la dependencia. */
export function ProductMark({ light = false }: { light?: boolean }) {
  return (
    <div className={`product-mark ${light ? 'product-mark-light' : ''}`}>
      <img src="/assets/mark.svg" alt="" width="36" height="36" />
      <span>
        E-Ventanilla<small>ADMINISTRACIÓN INSTITUCIONAL</small>
      </span>
    </div>
  );
}
