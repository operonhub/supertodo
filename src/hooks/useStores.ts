'use client';

import { useSyncExternalStore } from 'react';
import { orderStore, productStore, settingsStore } from '@/lib/stores';
import type { BusinessConfig, Order, Product } from '@/types';

/**
 * Lectura de los stores desde React.
 *
 * `useSyncExternalStore` se encarga de la suscripción y de devolver el valor
 * correcto durante el render del servidor, que es lo que evita el desajuste de
 * hidratación sin tener que escribir un efecto por store.
 */

export function useProducts(): Product[] {
  return useSyncExternalStore(
    productStore.subscribe,
    productStore.getSnapshot,
    productStore.getServerSnapshot,
  );
}

export function useOrders(): Order[] {
  return useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getSnapshot,
    orderStore.getServerSnapshot,
  );
}

/**
 * Momento de la última carga de pedidos, o `null` si todavía no hubo ninguna.
 *
 * Funciona como snapshot porque es un número: `useSyncExternalStore` compara
 * por identidad, y un objeto nuevo en cada llamada haría render infinito.
 */
export function useOrdersUpdatedAt(): number | null {
  return useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getUpdatedAt,
    orderStore.getServerUpdatedAt,
  );
}

export function useSettings(): BusinessConfig {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getServerSnapshot,
  );
}

/**
 * `true` recién después del primer pintado en el cliente.
 *
 * Sirve para las pantallas que muestran la fecha de hoy o los pedidos: en el
 * servidor esos datos no existen todavía, así que se dibuja un esqueleto hasta
 * que hay datos reales.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNada,
    () => true,
    () => false,
  );
}

/** El valor nunca cambia después de hidratar, así que no hay a qué suscribirse. */
const subscribeNada = () => () => {};
