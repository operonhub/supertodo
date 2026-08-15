import { MapPinIcon } from '@/components/icons';
import type { BusinessConfig, DeliveryMode, PaymentMethod } from '@/types';

export interface CheckoutValue {
  name: string;
  phone: string;
  paymentMethodId: string;
  delivery: DeliveryMode;
  address: string;
}

export const CHECKOUT_VACÍO: CheckoutValue = {
  name: '',
  phone: '',
  paymentMethodId: '',
  delivery: 'retiro',
  address: '',
};

export type CheckoutErrores = Partial<Record<'name' | 'phone' | 'paymentMethodId' | 'address', string>>;

/** Sólo obliga método de pago si el local tiene alguno activado, y dirección sólo con envío. */
export function validarCheckout(value: CheckoutValue, disponibles: PaymentMethod[]): CheckoutErrores {
  const errores: CheckoutErrores = {};

  if (!value.name.trim()) errores.name = 'Ingresá tu nombre.';
  if (!value.phone.trim()) errores.phone = 'Ingresá un teléfono de contacto.';
  if (disponibles.length > 0 && !value.paymentMethodId) errores.paymentMethodId = 'Elegí una forma de pago.';
  if (value.delivery === 'reparto' && !value.address.trim()) {
    errores.address = 'Ingresá la dirección de envío.';
  }

  return errores;
}

const campoClase =
  'w-full rounded-xl border border-verde/15 bg-white px-3.5 py-2.5 text-sm font-medium text-verde-dark outline-none transition-colors focus:border-verde/50';

function chip(activo: boolean) {
  return `rounded-full px-3.5 py-2 text-[13px] transition-colors ${
    activo
      ? 'bg-verde font-bold text-white'
      : 'border border-verde/15 bg-white font-semibold text-verde hover:border-verde/40'
  }`;
}

/** Datos del cliente antes de mandar el pedido: nombre, teléfono, pago y entrega. */
export function CheckoutFields({
  value,
  onChange,
  errors,
  paymentMethods,
  delivery,
}: {
  value: CheckoutValue;
  onChange: (next: CheckoutValue) => void;
  errors: CheckoutErrores;
  paymentMethods: PaymentMethod[];
  delivery: BusinessConfig['delivery'];
}) {
  const set = <K extends keyof CheckoutValue>(campo: K, valor: CheckoutValue[K]) =>
    onChange({ ...value, [campo]: valor });

  const disponibles = paymentMethods.filter((m) => m.enabled);

  return (
    <div className="mb-4 space-y-3.5 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-verde/90">Tus datos</p>

      <div>
        <label htmlFor="co-nombre" className="mb-1 block text-xs font-semibold text-verde/90">
          Nombre
        </label>
        <input
          id="co-nombre"
          className={campoClase}
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'co-nombre-error' : undefined}
        />
        {errors.name && (
          <p id="co-nombre-error" role="alert" className="mt-1 text-[11px] font-semibold text-rojo">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="co-tel" className="mb-1 block text-xs font-semibold text-verde/90">
          Teléfono
        </label>
        <input
          id="co-tel"
          type="tel"
          className={campoClase}
          value={value.phone}
          onChange={(e) => set('phone', e.target.value)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'co-tel-error' : undefined}
        />
        {errors.phone && (
          <p id="co-tel-error" role="alert" className="mt-1 text-[11px] font-semibold text-rojo">
            {errors.phone}
          </p>
        )}
      </div>

      {disponibles.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-verde/90">Forma de pago</p>
          <div role="radiogroup" aria-label="Forma de pago" className="flex flex-wrap gap-2">
            {disponibles.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={value.paymentMethodId === m.id}
                onClick={() => set('paymentMethodId', m.id)}
                className={chip(value.paymentMethodId === m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {errors.paymentMethodId && (
            <p role="alert" className="mt-1.5 text-[11px] font-semibold text-rojo">
              {errors.paymentMethodId}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="mb-1.5 text-xs font-semibold text-verde/90">Cómo lo recibís</p>
        <div role="radiogroup" aria-label="Modalidad de entrega" className="flex gap-2">
          {(
            [
              { id: 'retiro', label: 'Retiro por el local' },
              { id: 'reparto', label: 'Envío a domicilio' },
            ] as const
          ).map((modo) => (
            <button
              key={modo.id}
              type="button"
              role="radio"
              aria-checked={value.delivery === modo.id}
              onClick={() => set('delivery', modo.id)}
              className={`flex-1 ${chip(value.delivery === modo.id)}`}
            >
              {modo.label}
            </button>
          ))}
        </div>
      </div>

      {value.delivery === 'reparto' && (
        <div>
          <p className="mb-2.5 flex items-start gap-1.5 rounded-xl bg-verde-soft px-3 py-2.5 text-[12px] font-medium leading-snug text-verde-dark">
            <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-verde/70" />
            {delivery.note}
          </p>

          <label htmlFor="co-direccion" className="mb-1 block text-xs font-semibold text-verde/90">
            Dirección de envío
          </label>
          <input
            id="co-direccion"
            className={campoClase}
            value={value.address}
            onChange={(e) => set('address', e.target.value)}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? 'co-direccion-error' : undefined}
          />
          {errors.address && (
            <p id="co-direccion-error" role="alert" className="mt-1 text-[11px] font-semibold text-rojo">
              {errors.address}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
