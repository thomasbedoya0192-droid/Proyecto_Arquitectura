import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from 'i18next';
import LanguageSelector from './components/LanguageSelector';
import App from './App';
import './index.css';

i18n
  .init({
    lng: 'es',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          register: 'Register',
          login: 'Login',
          dashboard: 'Dashboard',
          accounts: 'Accounts',
          subscriptions: 'Subscriptions',
          analytics: 'Analytics',
          goals: 'Financial Goals',
          feedback: 'Financial Feedback',
          plan: 'Upgrade Plan',
          free: 'Free',
          premium: 'Premium',
          'add-account': 'Add Account',
          'account-type': 'Account Type',
          savings: 'Savings',
          checking: 'Checking',
          'digital-wallet': 'Digital Wallet',
          'credit-card': 'Credit Card',
          monthly: 'Monthly',
          annual: 'Annual',
          create: 'Create',
          edit: 'Edit',
          delete: 'Delete',
          'process-payments': 'Process Payments',
          'goal-amount': 'Goal Amount',
          'current-amount': 'Current Amount',
          progress: 'Progress',
          weekly: 'Weekly',
          'new-goal': 'New Goal',
          'new-subscription': 'New Subscription',
          'large-expense': 'Large Expense',
          'goal-completed': 'Goal Completed',
          manual: 'Manual',
          confirm: 'Confirm',
          cancel: 'Cancel',
          error: 'Error',
          success: 'Success',
          'required-field': 'This field is required',
          'invalid-value': 'Invalid value',
          save: 'Save',
          close: 'Close'
        }
      },
      es: {
        translation: {
          register: 'Registrarse',
          login: 'Iniciar sesión',
          dashboard: 'Panel de Control',
          accounts: 'Mis Cuentas',
          subscriptions: 'Suscripciones',
          analytics: 'Reportes y Estadísticas',
          goals: 'Metas Financieras',
          feedback: 'Feedback Financiero',
          plan: 'Plan de Actualización',
          free: 'Gratis',
          premium: 'Premium',
          'add-account': 'Añadir Cuenta',
          'account-type': 'Tipo de Cuenta',
          savings: 'Ahorros',
          checking: 'Corriente',
          'digital-wallet': 'Billetera Digital',
          'credit-card': 'Tarjeta de Crédito',
          monthly: 'Mensual',
          annual: 'Anual',
          create: 'Crear',
          edit: 'Editar',
          delete: 'Eliminar',
          'process-payments': 'Procesar Pagos',
          'goal-amount': 'Monto Objetivo',
          'current-amount': 'Monto Actual',
          progress: 'Progreso',
          weekly: 'Semanal',
          'new-goal': 'Nueva Meta',
          'new-subscription': 'Nueva Suscripción',
          'large-expense': 'Gasto Grande',
          'goal-completed': 'Meta Cumplida',
          manual: 'Manual',
          confirm: 'Confirmar',
          cancel: 'Cancelar',
          error: 'Error',
          success: 'Éxito',
          'required-field': 'Este campo es obligatorio',
          'invalid-value': 'Valor inválido',
          save: 'Guardar',
          close: 'Cerrar'
        }
      }
    },
    interpolation: {
      escapeValue: false
    }
  })
  .then(() => {
    ReactDOM.render(
      <React.StrictMode>
        <BrowserRouter>
          <I18nextProvider i18n={i18n}>
            <LanguageSelector />
            <App />
          </I18nextProvider>
        </BrowserRouter>
      </React.StrictMode>,
      document.getElementById('root')
    );
  })
  .catch((error) => {
    console.error('i18n initialization error:', error);
    ReactDOM.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
      document.getElementById('root')
    );
  });