import type { Metadata } from 'next';
import { CustomerAccountPage } from '@/components/CustomerAccountPage';

export const metadata: Metadata = {
  title: 'Mi cuenta — Super Todo',
  description: 'Consultá tus pedidos y los datos de tu cuenta de Super Todo.',
};

export default function CuentaPage() {
  return <CustomerAccountPage />;
}
