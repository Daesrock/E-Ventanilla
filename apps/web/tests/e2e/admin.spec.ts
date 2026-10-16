/** Recorridos administrativos: autenticación, oferta persistida, cambios pendientes y permisos por rol. */
import { expect, test, type Page } from '@playwright/test';

const id = '11111111-1111-4111-8111-111111111111';
const procedureId = '22222222-2222-4222-8222-222222222222';
test('departamento configura oferta, conserva costo pendiente y verifica persistencia', async ({
  page,
}) => {
  let loggedIn = false;
  let offered = false;
  const writes: unknown[] = [];
  await page.route('**/bff/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path.endsWith('/auth/login')) {
      loggedIn = true;
      return respond({
        user: { id: 'department' },
        expiresAt: '2099-01-01',
        administrativeAccess: false,
      });
    }
    if (path.endsWith('/admin/me'))
      return loggedIn
        ? respond({
            user: {
              id: 'department',
              firstName: 'Ana',
              lastName: 'Pérez',
              email: 'ana@local.example',
            },
            role: { code: 'DEPARTMENT_HEAD', name: 'Jefe de departamento' },
            permissions: [
              'branch.read',
              'branch.update',
              'offer.manage',
              'procedure.read',
              'slot.read',
              'staff.read',
              'report.read',
            ],
            scope: { allBranches: true, branches: [{ id, name: 'Sede técnica' }] },
            profiles: { counterStaff: false },
          })
        : respond({ message: 'Sin sesión' }, 401);
    if (path.endsWith('/admin/branches'))
      return respond({
        items: [
          {
            id,
            name: 'Sede técnica',
            type: 'VIM',
            municipality: { code: '07101', name: 'Tuxtla Gutiérrez' },
            active: true,
            published: true,
            counterHead: null,
            counterHeadId: null,
          },
        ],
      });
    if (path.endsWith(`/branches/${id}/procedures`)) {
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON();
        writes.push(body);
        offered = body.items[0].active;
      }
      return respond({
        items: [
          {
            procedureId,
            name: 'Trámite técnico',
            category: 'Prueba',
            cost: null,
            procedureActive: true,
            procedurePublished: true,
            active: offered,
          },
        ],
      });
    }
    return respond({ items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 1 } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo o CURP').fill('ana@local.example');
  await page.getByLabel(/Contraseña/).fill('Pass-de-prueba-42');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByText('Acceso institucional', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Administrar sedes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nueva sede' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Asignar trámites' }).click();
  await expect(page.getByText('Costo por confirmar')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Ofrecer Trámite técnico' }).check();
  await page.getByRole('link', { name: 'Sedes', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Cambios sin guardar' })).toBeVisible();
  await page.getByRole('button', { name: 'Seguir editando' }).click();
  await page.getByRole('button', { name: 'Revisar cambios' }).click();
  await expect(page.getByText('Asignar: Trámite técnico')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar y guardar trámites' }).click();
  await expect(page.getByText('Oferta de trámites guardada.')).toBeVisible();
  expect(writes).toEqual([{ items: [{ procedureId, active: true }] }]);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Ofrecer Trámite técnico' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Ofrecer Trámite técnico' }).uncheck();
  await page.getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(page.getByRole('checkbox', { name: 'Ofrecer Trámite técnico' })).toBeChecked();
});

async function mockSession(page: Page, role: 'ROOT' | 'COUNTER_HEAD') {
  let signedIn = false;
  await page.route('**/bff/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path.endsWith('/auth/login')) {
      signedIn = true;
      return reply({ user: {}, expiresAt: '2099-01-01', administrativeAccess: false });
    }
    if (path.endsWith('/admin/me'))
      return signedIn
        ? reply({
            user: {
              id: 'user',
              firstName: 'Usuario',
              lastName: 'Local',
              email: 'test@local.example',
            },
            role: { code: role, name: role },
            permissions:
              role === 'ROOT'
                ? [
                    'branch.read',
                    'branch.create',
                    'procedure.read',
                    'procedure.create',
                    'procedure.update',
                    'staff.read',
                  ]
                : ['branch.read', 'branch.update', 'slot.read', 'appointment.read', 'report.read'],
            scope: { allBranches: role === 'ROOT', branches: [{ id, name: 'Sede propia' }] },
            profiles: { counterStaff: false },
          })
        : reply({ message: 'Sin sesión' }, 401);
    if (path.endsWith('/admin/branches'))
      return reply({
        items: [
          {
            id,
            name: 'Sede propia',
            type: 'VIM',
            municipality: { code: '07101', name: 'Tuxtla Gutiérrez' },
            active: true,
            published: false,
            counterHead: null,
          },
        ],
      });
    return reply({ items: [] });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo o CURP').fill('test@local.example');
  await page.getByLabel(/Contraseña/).fill('Pass-de-prueba-42');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByText('Acceso institucional', { exact: true })).toBeVisible();
}

test('root crea un trámite con costo por confirmar y conserva errores por campo', async ({
  page,
}) => {
  await mockSession(page, 'ROOT');
  let attempts = 0;
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/bff/admin/procedures', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { items: [] } });
    submitted = route.request().postDataJSON();
    attempts++;
    if (attempts === 1)
      return route.fulfill({
        status: 400,
        json: {
          message: 'Revisa los campos indicados.',
          code: 'VALIDATION_ERROR',
          fieldErrors: { name: 'Corrige el nombre de prueba.' },
        },
      });
    return route.fulfill({ status: 201, json: { id: procedureId, ...submitted } });
  });
  await page.getByRole('link', { name: 'Catálogo central', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo trámite' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Nombre del trámite/).fill('Trámite local');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog.getByText('Corrige el nombre de prueba.')).toBeVisible();
  expect(submitted?.cost).toBeNull();
  expect(submitted).not.toHaveProperty('category');
  expect(submitted).not.toHaveProperty('requirements');
  await dialog.getByLabel(/Nombre del trámite/).fill('Trámite corregido');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('ventanilla móvil conserva menú, alcance y bloqueo de catálogo central', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSession(page, 'COUNTER_HEAD');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  const sidebar = page.getByRole('complementary', { name: 'Navegación principal' });
  await expect(sidebar.getByRole('link', { name: 'Trámites', exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Responsables' })).toHaveCount(0);
  await sidebar.getByRole('link', { name: 'Sedes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sede propia' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/tramites');
  await expect(page.getByRole('heading', { name: 'Sin permiso para esta sección' })).toBeVisible();
});

test('departamento no ve cuentas ROOT en Responsables y sí a los jefes de ventanilla', async ({
  page,
}) => {
  const staff = [
    {
      id: 'root-account',
      name: 'Titular Root',
      email: 'root@local.example',
      role: { code: 'ROOT', name: 'Root · preparación inicial' },
      active: true,
      profiles: { counterStaff: false, counterHead: false, departmentHead: false },
      branches: [],
    },
    {
      id: 'dept-account',
      name: 'Departamento Local',
      email: 'depto@local.example',
      role: { code: 'DEPARTMENT_HEAD', name: 'Jefe de departamento' },
      active: true,
      profiles: { counterStaff: false, counterHead: false, departmentHead: true },
      branches: [],
    },
    {
      id: 'head-account',
      name: 'Ventanilla Local',
      email: 'ventanilla@local.example',
      role: { code: 'COUNTER_HEAD', name: 'Jefe de ventanilla' },
      active: true,
      profiles: { counterStaff: true, counterHead: true, departmentHead: false },
      branches: [{ id, name: 'Sede propia' }],
    },
  ];
  let signedIn = false;
  await page.route('**/bff/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path.endsWith('/auth/login')) {
      signedIn = true;
      return reply({ user: {}, expiresAt: '2099-01-01' });
    }
    if (path.endsWith('/admin/me')) {
      if (!signedIn) return reply({ message: 'Sin sesión' }, 401);
      return reply({
        user: {
          id: 'dept-account',
          firstName: 'Departamento',
          lastName: 'Local',
          email: 'depto@local.example',
        },
        role: { code: 'DEPARTMENT_HEAD', name: 'Jefe de departamento' },
        permissions: ['branch.read', 'branch.update', 'slot.read', 'staff.read', 'report.read'],
        scope: { allBranches: true, branches: [{ id, name: 'Sede propia' }] },
        profiles: { counterStaff: false, counterHead: false, departmentHead: true },
      });
    }
    if (path.endsWith('/admin/staff'))
      return reply({
        items: staff,
        pagination: { page: 1, pageSize: 25, total: 3, totalPages: 1 },
      });
    return reply({ items: [] });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo o CURP').fill('depto@local.example');
  await page.getByLabel(/Contraseña/).fill('Pass-de-prueba-42');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await page.getByRole('link', { name: 'Responsables', exact: true }).click();
  await expect(page.getByText('Ventanilla Local')).toBeVisible();
  await expect(page.getByText('Departamento Local', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Titular Root')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nueva cuenta' })).toHaveCount(0);
});
