/**
 * Fábrica de stores persistidos en localStorage, pensados para `useSyncExternalStore`.
 *
 * Es el mismo patrón que ya usa el carrito en `cartStore.ts` (que es anterior a
 * este helper y podría migrarse), generalizado para el panel de administración.
 *
 * Modelar los datos como un store externo —y no como estado de React cargado en
 * un efecto— es justamente lo que deja el camino hecho para la base de datos:
 * cuando exista, se reemplaza el cuerpo de `read` y `persist` por llamadas al
 * backend y ningún componente cambia.
 */

type Listener = () => void;

export interface PersistentStore<T> {
  subscribe: (listener: Listener) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  /** Lectura imperativa, para handlers que necesitan el valor actual. */
  get: () => T;
  set: (next: T) => void;
  update: (recipe: (current: T) => T) => void;
  /** Vuelve al valor inicial y borra lo guardado. */
  reset: () => void;
}

interface Options<T> {
  /** Clave de localStorage. Conviene versionarla: "supertodo.pedidos.v1". */
  key: string;
  /**
   * Valor inicial. Es también lo que devuelve `getServerSnapshot`, así que el
   * HTML del servidor se arma con esto y no hay desajuste de hidratación.
   */
  seed: T;
  /**
   * Convierte lo que había guardado en un valor válido. Recibe `null` cuando no
   * hay nada guardado todavía, y tiene que tolerar datos viejos o corruptos:
   * el storage sobrevive a los deploys.
   */
  load: (stored: unknown, seed: T) => T;
}

export function createPersistentStore<T>({ key, seed, load }: Options<T>): PersistentStore<T> {
  let snapshot: T = seed;
  let initialized = false;
  const listeners = new Set<Listener>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  function readStorage(): T {
    try {
      const raw = window.localStorage.getItem(key);
      return load(raw === null ? null : (JSON.parse(raw) as unknown), seed);
    } catch {
      // Storage inaccesible o JSON roto: se arranca de cero, no se rompe la app.
      return load(null, seed);
    }
  }

  function onStorageEvent(event: StorageEvent) {
    if (event.key !== null && event.key !== key) return;
    snapshot = readStorage();
    emit();
  }

  function persist(value: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Modo incógnito o cuota llena: sigue funcionando en memoria.
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      // La primera lectura del storage ocurre acá y no durante el render: en
      // `subscribe` ya estamos en el cliente y después del primer pintado, que
      // es lo que mantiene servidor y cliente sincronizados.
      if (!initialized) {
        initialized = true;
        const stored = readStorage();
        if (stored !== snapshot) {
          snapshot = stored;
          emit();
        }
        window.addEventListener('storage', onStorageEvent);
      }

      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot: () => snapshot,
    getServerSnapshot: () => seed,
    get: () => snapshot,

    set(next) {
      snapshot = next;
      persist(next);
      emit();
    },

    update(recipe) {
      snapshot = recipe(snapshot);
      persist(snapshot);
      emit();
    },

    reset() {
      snapshot = seed;
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ídem persist */
      }
      emit();
    },
  };
}
