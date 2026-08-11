import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

/** Cliente de Supabase para código que corre en el navegador (componentes cliente). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
