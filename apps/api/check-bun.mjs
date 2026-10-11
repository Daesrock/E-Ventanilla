if (typeof Bun === 'undefined' || Bun.version !== '1.4.2') {
  throw new Error(
    'E-Ventanilla requiere Bun 1.4.2. Usa la versión fijada para desarrollo y Docker.',
  );
}
