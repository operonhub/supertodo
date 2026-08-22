'use client';

import { useState } from 'react';
import { Field, Modal, inputClass } from '@/components/admin/ui';
import { rememberSession } from '@/lib/sessionPreference';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';

interface AuthForm {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  direccion: string;
}

const EMPTY_FORM: AuthForm = {
  email: '',
  password: '',
  nombre: '',
  apellido: '',
  telefono: '',
  dni: '',
  direccion: '',
};

function authMessage(message: string) {
  if (message === 'Invalid login credentials') return 'Email o contraseña incorrectos.';
  if (message.toLowerCase().includes('already registered')) return 'Ya existe una cuenta con ese email.';
  return message;
}

export function CustomerAuthModal({
  open,
  onClose,
  initialMode = 'login',
  onAuthenticated,
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onAuthenticated?: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  // Marcado por default: en un almacén de barrio se pide desde el mismo
  // celular casi siempre, y tener que escribir la contraseña en cada compra
  // es exactamente la fricción que hace que no se vuelva a usar la tienda.
  const [mantenerSesión, setMantenerSesión] = useState(true);
  const [form, setForm] = useState<AuthForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof AuthForm>(field: K, value: AuthForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) {
      setError('Completá email y contraseña.');
      return;
    }

    if (
      mode === 'signup' &&
      (!form.nombre.trim() ||
        !form.apellido.trim() ||
        !form.telefono.trim() ||
        !form.dni.trim() ||
        !form.direccion.trim())
    ) {
      setError('Completá todos los datos de la cuenta.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      // Se registra ANTES de autenticar: `signIn` dispara `onAuthStateChange`
      // y el arranque de `useCustomer` tiene que encontrar la preferencia ya
      // escrita, no un instante después.
      rememberSession(mantenerSesión);

      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });

        if (loginError) throw loginError;
      } else {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: {
            data: {
              nombre: form.nombre.trim(),
              apellido: form.apellido.trim(),
              telefono: form.telefono.trim(),
              dni: form.dni.trim(),
              direccion: form.direccion.trim(),
            },
          },
        });

        if (signupError) throw signupError;

        // El brief pide confirmación de email desactivada. Este fallback hace
        // visible una configuración pendiente en vez de simular un login.
        if (!data.session) {
          setSuccess('Cuenta creada. Revisá tu email para confirmar el acceso.');
          return;
        }
      }

      await onAuthenticated?.();
      setForm(EMPTY_FORM);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar el acceso.';
      setError(authMessage(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'login' ? 'Ingresar a tu cuenta' : 'Crear tu cuenta'}
    >
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-verde-soft p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => changeMode('login')}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            mode === 'login' ? 'bg-white text-verde-dark shadow-sm' : 'text-verde/90'
          }`}
        >
          Ingresar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          onClick={() => changeMode('signup')}
          className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            mode === 'signup' ? 'bg-white text-verde-dark shadow-sm' : 'text-verde/90'
          }`}
        >
          Registrarme
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="customer-email">
          <input
            id="customer-email"
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            className={inputClass}
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
          />
        </Field>

        <Field label="Contraseña" htmlFor="customer-password">
          <input
            id="customer-password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={inputClass}
            value={form.password}
            onChange={(event) => set('password', event.target.value)}
          />
        </Field>

        {mode === 'signup' && (
          <>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="customer-name">
                <input
                  id="customer-name"
                  autoComplete="given-name"
                  className={inputClass}
                  value={form.nombre}
                  onChange={(event) => set('nombre', event.target.value)}
                />
              </Field>
              <Field label="Apellido" htmlFor="customer-last-name">
                <input
                  id="customer-last-name"
                  autoComplete="family-name"
                  className={inputClass}
                  value={form.apellido}
                  onChange={(event) => set('apellido', event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-x-3 sm:grid-cols-2">
              <Field label="Teléfono" htmlFor="customer-phone">
                <input
                  id="customer-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputClass}
                  value={form.telefono}
                  onChange={(event) => set('telefono', event.target.value)}
                />
              </Field>
              <Field label="DNI" htmlFor="customer-dni">
                <input
                  id="customer-dni"
                  inputMode="numeric"
                  className={inputClass}
                  value={form.dni}
                  onChange={(event) => set('dni', event.target.value)}
                />
              </Field>
            </div>

            <Field label="Dirección" htmlFor="customer-address">
              <input
                id="customer-address"
                autoComplete="street-address"
                className={inputClass}
                value={form.direccion}
                onChange={(event) => set('direccion', event.target.value)}
              />
            </Field>
          </>
        )}

        {error && (
          <p role="alert" className="mb-3 text-sm font-semibold text-rojo">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mb-3 text-sm font-semibold text-verde">
            {success}
          </p>
        )}

        <label className="mb-4 flex items-start gap-2.5 rounded-xl bg-verde-soft px-3 py-2.5">
          <input
            type="checkbox"
            checked={mantenerSesión}
            onChange={(event) => setMantenerSesión(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-verde"
          />
          <span className="text-xs font-semibold leading-snug text-verde-dark">
            Mantener la sesión iniciada
            <span className="mt-0.5 block font-medium text-verde/80">
              Si lo destildás, vas a tener que ingresar de nuevo la próxima vez que abras
              el navegador.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || Boolean(success)}
          className="w-full rounded-xl bg-verde px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? mode === 'login'
              ? 'Ingresando…'
              : 'Creando cuenta…'
            : mode === 'login'
              ? 'Ingresar'
              : 'Crear cuenta'}
        </button>
      </form>
    </Modal>
  );
}
