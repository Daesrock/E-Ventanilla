/** Marca del producto: logo oficial entregado junto al nombre institucional. */
import { brand } from '../../app/config/brand';

export function ProductMark({ light = false }: { light?: boolean }) {
  return (
    <div className={`product-mark ${light ? 'product-mark-light' : ''}`}>
      <img src={brand.logo} alt="" width="53" height="32" />
      <span>
        E-Ventanilla<small>ADMINISTRACIÓN INSTITUCIONAL</small>
      </span>
    </div>
  );
}
