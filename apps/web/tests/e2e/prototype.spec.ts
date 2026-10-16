/** Recorridos críticos reales de UI con datos ficticios y consultas externas sustituidas. */
import { test, expect, type Page } from '@playwright/test';

async function enter(page: Page, profile = 'Jefe de departamento') {
  await page.route('**/bff/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('catalog/municipalities'))
      await route.fulfill({
        json: {
          municipalities: [
            { code: '07101', name: 'Tuxtla Gutiérrez' },
            { code: '07089', name: 'Tapachula' },
          ],
        },
      });
    else if (path.endsWith('/health'))
      await route.fulfill({ json: { status: 'ok', service: 'e-ventanilla-api' } });
    else if (path.endsWith('/auth/logout'))
      await route.fulfill({ json: { message: 'Sesión de prueba cerrada.' } });
    else await route.fulfill({ status: 401, json: { message: 'Sin sesión API en esta prueba.' } });
  });
  await page.goto('/acceso');
  await page.screenshot({ path: test.info().outputPath('acceso.png'), fullPage: true });
  await page.getByRole('radio', { name: profile, exact: true }).check();
  await page.getByRole('button', { name: 'Entrar a la demostración' }).click();
  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible();
}

test('departamento cambia oferta, conserva cambios y exporta reporte filtrado', async ({
  page,
}) => {
  await enter(page);
  await page.screenshot({ path: test.info().outputPath('dashboard-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Sedes', exact: true }).click();
  await page.getByRole('link', { name: 'Administrar', exact: true }).first().click();
  await page
    .getByRole('navigation', { name: 'Secciones de sede' })
    .getByRole('link', { name: 'Trámites', exact: true })
    .click();
  const offer = page.getByRole('checkbox', {
    name: 'Ofrecer Orientación para apertura de empresa',
    exact: true,
  });
  await offer.uncheck();
  await page.getByRole('button', { name: 'Guardar trámites' }).click();
  await page.reload();
  await expect(offer).not.toBeChecked();
  await page
    .getByRole('link', { name: 'Reportes', exact: false })
    .filter({ hasText: 'Reportes' })
    .first()
    .click();
  await page.screenshot({ path: test.info().outputPath('reportes-simple.png'), fullPage: true });
  await expect(page.getByRole('combobox', { name: 'Municipio', exact: true })).not.toBeVisible();
  await page.locator('summary').filter({ hasText: 'Más filtros' }).click();
  await page
    .getByRole('combobox', { name: 'Municipio', exact: true })
    .selectOption('Tuxtla Gutiérrez');
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.getByRole('button', { name: 'Elegir campos' }).click();
  await page.getByRole('checkbox', { name: 'Municipio', exact: true }).check();
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(page.locator('tbody')).not.toContainText('Tapachula');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^e-ventanilla-demo-/);
});

test('jefe consulta solo sus sedes y no cambia catálogo central ni abre sede ajena', async ({
  page,
}) => {
  await enter(page, 'Jefe de ventanilla');
  await page.goto('/sedes');
  await expect(page.locator('.branch-card')).toHaveCount(2);
  await page.goto('/sedes/tapachula-vuge');
  await expect(page.getByRole('heading', { name: 'Sede no disponible' })).toBeVisible();
  await page.goto('/tramites');
  await expect(page.getByRole('button', { name: 'Nuevo trámite' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  await page.goto('/sedes/tuxtla-vuge');
  await page.getByRole('button', { name: 'Editar contacto' }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre de sede', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Jefe de ventanilla', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('textbox', { name: 'Teléfono', exact: true }).fill('961 111 1111');
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  await expect(page.locator('.detail-list')).toContainText('961 111 1111');
});

test('root crea cuenta ficticia y la asigna a una sede', async ({ page }) => {
  await enter(page, 'Root · preparación inicial');
  await page.goto('/usuarios');
  await page.getByRole('button', { name: 'Nueva cuenta' }).click();
  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Responsable de prueba');
  await page
    .getByRole('textbox', { name: 'Correo', exact: true })
    .fill('responsable@ejemplo.invalid');
  await page.getByRole('button', { name: 'Guardar cuenta', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('Responsable de prueba');
  await page.goto('/sedes/palenque-vuge');
  await page.getByRole('button', { name: 'Editar información' }).click();
  await page
    .getByRole('combobox', { name: 'Jefe de ventanilla', exact: true })
    .selectOption({ label: 'Responsable de prueba' });
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  await expect(page.locator('.detail-list')).toContainText('Responsable de prueba');
  await page.getByRole('button', { name: 'Salir de la demostración' }).click();
  await page.getByRole('radio', { name: 'Jefe de ventanilla', exact: true }).check();
  await page
    .getByRole('combobox', { name: 'Cuenta de demostración' })
    .selectOption({ label: 'Responsable de prueba' });
  await page.getByRole('button', { name: 'Entrar a la demostración' }).click();
  await page.goto('/sedes');
  await expect(page.locator('.branch-card')).toHaveCount(1);
  await expect(page.locator('.branch-card')).toContainText('VUGE Palenque');
});

test('móvil navega con mismo menú y documento no desborda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await page.screenshot({ path: test.info().outputPath('dashboard-mobile.png'), fullPage: true });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await page.getByRole('link', { name: 'Sedes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sedes', exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.goto('/reportes');
  await expect(page.getByRole('button', { name: 'Consultar', exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: test.info().outputPath('reportes-mobile.png'), fullPage: true });
});

test('formulario identifica campos obligatorios y errores junto al campo', async ({ page }) => {
  await enter(page, 'Root · preparación inicial');
  await page.goto('/usuarios');
  await page.getByRole('button', { name: 'Nueva cuenta' }).click();
  await page.getByRole('button', { name: 'Guardar cuenta', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Nombre', exact: true });
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  await name.fill('Persona de ejemplo');
  const email = page.getByRole('textbox', { name: 'Correo', exact: true });
  await email.fill('correo-invalido');
  await page.getByRole('button', { name: 'Guardar cuenta', exact: true }).click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toContainText('Escribe un correo válido.');
  await page.screenshot({ path: test.info().outputPath('formulario-claro.png'), fullPage: true });
  await email.fill('persona@ejemplo.invalid');
  await page.getByRole('button', { name: 'Guardar cuenta', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Persona de ejemplo');
});

test('rango personalizado valida fechas y reabre filtros para corregir el error', async ({
  page,
}) => {
  await enter(page);
  await page.goto('/reportes');
  const summary = page.locator('summary').filter({ hasText: 'Más filtros' });
  await summary.click();
  await page.getByLabel('Desde', { exact: true }).fill('2026-10-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-09-30');
  await summary.click();
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.getByLabel('Hasta', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Debe ser igual o posterior a Desde.');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-10-31');
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.report-caption')).toContainText('31 oct 2026');
});

test('horarios dentro de sede crean disponibilidad solo en esa sede', async ({ page }) => {
  await enter(page);
  await page.goto('/sedes/tuxtla-vuge?seccion=horarios');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('tbody')).not.toContainText('Tapachula');
  await page.getByRole('button', { name: 'Nuevo horario' }).click();
  await expect(page.getByRole('combobox', { name: 'Sede', exact: true })).toHaveCount(0);
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Fecha', exact: true })
    .fill('2030-01-15');
  await page.getByRole('button', { name: 'Guardar horario' }).click();
  await expect(page.locator('tbody')).toContainText('15 ene 2030');
  await expect(page.locator('tbody')).not.toContainText('Tapachula');
});

test('diagnóstico muestra respuesta pública sin permisos administrativos', async ({ page }) => {
  await enter(page);
  await page.goto('/conexion');
  await page.getByRole('button', { name: 'Consultar', exact: true }).first().click();
  await expect(page.locator('.json-output')).toContainText('e-ventanilla-api');
  await expect(
    page.getByText('Este diagnóstico no cambia el perfil de demostración', { exact: false }),
  ).toBeVisible();
});
