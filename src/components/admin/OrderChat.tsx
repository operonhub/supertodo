'use client';

import { OrderChat as SharedOrderChat } from '@/components/OrderChat';

/** Variante del panel: toda escritura sale con sender_role = owner. */
export function OrderChat({ orderId }: { orderId: string }) {
  return <SharedOrderChat orderId={orderId} role="owner" title="Chat con el cliente" />;
}
