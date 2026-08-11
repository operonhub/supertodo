'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { inputClass } from '@/components/admin/ui';
import { createClient } from '@/lib/supabase/client';

/**
 * Dominio interno para mapear "usuario" a un email, que es lo que pide
 * Supabase Auth por dentro. Nunca se manda ningún mail a esta dirección — es
 * sólo el formato que necesita el sistema. El día que se sume email real,
 * esto se reemplaza por el email de verdad y el resto sigue andando igual.
 *
 * Tiene que coincidir con el dominio usado al crear las cuentas en el
 * dashboard de Supabase (Authentication → Users).
 */
const DOMINIO_INTERNO = 'supertodo.com';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const limpio = usuario.trim().toLowerCase();
    if (!limpio || !contraseña) {
      setError('Completá usuario y contraseña.');
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: `${limpio}@${DOMINIO_INTERNO}`,
      password: contraseña,
    });
    setEnviando(false);

    if (authError) {
      setError('Usuario o contraseña incorrectos.');
      return;
    }

    // `refresh()` además de `push()`: el proxy vuelve a evaluar la sesión en
    // el próximo request, si no la primera navegación post-login podría
    // quedarse con una respuesta cacheada de antes de loguearse.
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-crema px-4">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-6 h-12 w-auto" />

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-6 shadow-card"
          aria-describedby={error ? 'login-error' : undefined}
        >
          <h1 className="mb-1 text-lg font-extrabold text-verde-dark">Entrar al panel</h1>
          <p className="mb-5 text-sm text-verde/90">Sólo para el equipo de Super Todo.</p>

          <div className="mb-3">
            <label htmlFor="usuario" className="mb-1 block text-xs font-semibold text-verde/90">
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="contraseña" className="mb-1 block text-xs font-semibold text-verde/90">
              Contraseña
            </label>
            <input
              id="contraseña"
              type="password"
              autoComplete="current-password"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p id="login-error" role="alert" className="mb-4 text-sm font-semibold text-rojo">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
