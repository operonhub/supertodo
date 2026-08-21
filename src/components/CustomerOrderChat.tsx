'use client';

import { OrderChat } from '@/components/OrderChat';

/** Variante lista para la pantalla de estado que se monta en la Fase E. */
export function CustomerOrderChat({ orderId }: { orderId: string }) {
  return <OrderChat orderId={orderId} role="customer" title="Chat con Super Todo" />;
}
