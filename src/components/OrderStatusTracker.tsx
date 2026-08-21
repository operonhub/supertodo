import type { OrderStatus } from '@/types';

const STAGES = ['Recibido', 'Preparando', 'Listo'] as const;

export function getCustomerOrderStage(status: OrderStatus): number | null {
  switch (status) {
    case 'sin_confirmar':
    case 'nuevo':
      return 0;
    case 'preparando':
      return 1;
    case 'listo':
    case 'en_reparto':
    case 'entregado':
      return 2;
    case 'cancelado':
      return null;
  }
}

export function getCustomerOrderStatusLabel(status: OrderStatus): string {
  if (status === 'cancelado') return 'Cancelado';
  return STAGES[getCustomerOrderStage(status) ?? 0];
}

function statusDescription(status: OrderStatus): string {
  switch (status) {
    case 'sin_confirmar':
      return 'Estamos confirmando que el pedido haya ingresado correctamente.';
    case 'nuevo':
      return 'El local recibió tu pedido.';
    case 'preparando':
      return 'Estamos preparando tus productos.';
    case 'listo':
      return 'Tu pedido está listo para retirar.';
    case 'en_reparto':
      return 'Tu pedido está listo y salió para la entrega.';
    case 'entregado':
      return 'El pedido fue entregado.';
    case 'cancelado':
      return 'El pedido fue cancelado. Podés escribirnos en el chat si necesitás ayuda.';
  }
}

export function OrderStatusTracker({ status }: { status: OrderStatus }) {
  const currentStage = getCustomerOrderStage(status);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card" aria-label="Estado del pedido">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-verde/70">Estado actual</p>
          <h2 className="text-xl font-extrabold text-verde-dark">
            {getCustomerOrderStatusLabel(status)}
          </h2>
        </div>
        <span className="rounded-full bg-verde-soft px-3 py-1 text-xs font-extrabold text-verde">
          3 etapas
        </span>
      </div>

      {status === 'cancelado' && (
        <div role="alert" className="mb-5 rounded-xl bg-rojo/10 px-4 py-3 text-sm font-bold text-rojo">
          Este pedido fue cancelado.
        </div>
      )}

      <ol className="grid grid-cols-3" aria-label="Progreso del pedido">
        {STAGES.map((label, index) => {
          const reached = currentStage !== null && currentStage >= index;
          const current = currentStage === index;

          return (
            <li key={label} className="relative flex flex-col items-center text-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 ${
                    reached ? 'bg-verde' : 'bg-verde/15'
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-xs font-extrabold ring-4 ring-white ${
                  reached ? 'bg-verde text-white' : 'bg-verde-soft text-verde/60'
                }`}
              >
                {reached && !current ? '✓' : index + 1}
              </span>
              <span
                className={`mt-2 text-xs font-extrabold ${
                  reached ? 'text-verde-dark' : 'text-verde/50'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 rounded-xl bg-crema px-4 py-3 text-sm font-semibold text-verde/90" aria-live="polite">
        {statusDescription(status)}
      </p>
    </section>
  );
}
