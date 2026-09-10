import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/ToastContext';
import { I18nProvider } from './i18n/I18nContext';
import { MockDataProvider } from './mock/MockDataContext';
import { BASE_PATH } from './utils/basePath';
import './app-overrides.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={BASE_PATH || undefined}>
      <I18nProvider>
        <MockDataProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </MockDataProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
