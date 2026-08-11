'use client';

import { MinusIcon, PlusIcon, TrashIcon } from '@/components/icons';

type QuantityStepperProps = {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Nombre del producto: se usa en los aria-label, nunca se muestra. */
  productName: string;
  size?: 'sm' | 'md';
};

/**
 * Control − N + del carrito.
 *
 * En 1 unidad el botón de restar muestra un tacho en vez de un menos: deja
 * claro que el siguiente toque saca el producto del pedido, en lugar de
 * hacerlo desaparecer sin aviso.
 */
export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  productName,
  size = 'md',
}: QuantityStepperProps) {
  const botón = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const icono = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const vaARemover = quantity === 1;

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-verde text-white shadow-md">
      <button
        type="button"
        onClick={onDecrement}
        aria-label={vaARemover ? `Quitar ${productName} del pedido` : `Quitar una unidad de ${productName}`}
        className={`${botón} grid place-items-center rounded-full transition-colors hover:bg-verde-dark`}
      >
        {vaARemover ? <TrashIcon className={icono} /> : <MinusIcon className={icono} />}
      </button>

      <span className="precio min-w-5 text-center text-sm font-extrabold" aria-live="polite">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Agregar una unidad de ${productName}`}
        className={`${botón} grid place-items-center rounded-full transition-colors hover:bg-verde-dark`}
      >
        <PlusIcon className={icono} />
      </button>
    </div>
  );
}
