'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { forgetSessionPreference, sessionEndedWithBrowser } from '@/lib/sessionPreference';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export type Customer = Tables<'customers'>;

/**
 * Sesión del navegador + perfil comercial del cliente.
 *
 * Son dos cosas distintas a propósito: Sergio tiene una sesión válida, pero
 * no tiene fila en `customers` porque pertenece a la allowlist de admins. Los
 * checkouts futuros tienen que exigir `customer`, no solamente `session`.
 */
export function useCustomer() {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  const loadCustomer = useCallback(
    async (nextSession: Session | null) => {
      const requestId = ++requestRef.current;
      setSession(nextSession);

      if (!nextSession) {
        setCustomer(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', nextSession.user.id)
        .maybeSingle();

      // Una respuesta anterior no puede pisar una sesión que cambió mientras
      // la consulta estaba en vuelo (por ejemplo, logout seguido de login).
      if (requestId !== requestRef.current) return;

      if (error) {
        console.error('No se pudo cargar el perfil del cliente:', error.message);
      }

      setCustomer(data ?? null);
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      // Antes de dar la sesión por buena: si el cliente pidió no mantenerla y
      // el navegador se cerró desde entonces, esta sesión ya no vale.
      if (data.session && sessionEndedWithBrowser()) {
        forgetSessionPreference();
        await supabase.auth.signOut();
        if (active) void loadCustomer(null);
        return;
      }

      void loadCustomer(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // La consulta a PostgREST queda fuera del callback de Auth: esperar otra
      // llamada de Supabase adentro puede bloquear el manejo de la sesión.
      window.setTimeout(() => {
        if (active) void loadCustomer(nextSession);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadCustomer, supabase]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    await loadCustomer(data.session);
  }, [loadCustomer, supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`No se pudo cerrar la sesión: ${error.message}`);

    forgetSessionPreference();
    await loadCustomer(null);
  }, [loadCustomer, supabase]);

  return { session, customer, loading, refresh, signOut };
}
