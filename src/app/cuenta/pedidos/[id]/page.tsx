import type { Metadata } from 'next';
import { CustomerOrderPage } from '@/components/CustomerOrderPage';

export const metadata: Metadata = {
  title: 'Estado del pedido — Super Todo',
  description: 'Seguí el estado de tu pedido y hablá con Super Todo.',
};

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerOrderPage orderId={id} />;
}
