/** Punto de entrada: monta proveedores compartidos, manejo de errores y árbol de rutas. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router/router';
import { DemoProvider } from './app/providers/DemoProvider';
import { ToastProvider } from './components/feedback/ToastProvider';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DemoProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </DemoProvider>
    </ErrorBoundary>
  </StrictMode>,
);
