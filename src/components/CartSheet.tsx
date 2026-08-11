'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckoutFields, CHECKOUT_VACÍO, validarCheckout, type CheckoutErrores, type CheckoutValue } from '@/components/CheckoutFields';
import { CloseIcon, WhatsAppIcon } from '@/components/icons';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useSettings } from '@/hooks/useStores';
import { buildOrderItems, createOrder } from '@/lib/checkout';
import { formatARS } from '@/lib/currency';
import { describePromotion, getUnitPrice } from '@/lib/products';
import { buildOrderMessage, buildWhatsAppUrl } from '@/lib/whatsapp';
import type { CartSummary } from '@/types';

type CartSheetProps = {
  open: boolean;
  summary: CartSummary;
  onClose: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  /** El pedido ya se guardó y se abrió WhatsApp: hay que vaciar el carrito. */
  onOrderSent: () => void;
};

export function CartSheet({
  open,
  summary,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onOrderSent,
}: CartSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const settings = useSettings();

  const [checkout, setCheckout] = useState<CheckoutValue>(CHECKOUT_VACÍO);
  const [errores, setErrores] = useState<CheckoutErrores>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  /**
   * El foco entra al panel una sola vez, al abrirlo.
   *
   * Depende sólo de `open` a propósito: si dependiera también de `onClose`
   * —que llega como función nueva en cada render— el efecto se reinstalaría
   * ante cualquier cambio y el foco saltaría al botón de cerrar cada vez que
   * alguien toca "+" con el teclado.
   */
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  // Escape cierra, y mientras está abierto el fondo no scrollea: en el
  // celular, si no se bloquea, el dedo termina moviendo el catálogo de atrás.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  // Si se vacía el carrito desde adentro, no tiene sentido seguir abierto.
  useEffect(() => {
    if (open && summary.itemCount === 0) onClose();
  }, [open, summary.itemCount, onClose]);

  if (!open || summary.itemCount === 0) return null;

  const métodosDisponibles = settings.paymentMethods.filter((m) => m.enabled);
  const métodoElegido = métodosDisponibles.find((m) => m.id === checkout.paymentMethodId);

  const items = buildOrderItems(summary);
  const mensaje = buildOrderMessage({
    customer: {
      name: checkout.name,
      address: checkout.delivery === 'reparto' ? checkout.address : undefined,
    },
    items,
    total: summary.total,
    paymentMethod: métodoElegido?.label ?? '',
    delivery: checkout.delivery,
  });

  async function enviarPedido() {
    const encontrados = validarCheckout(checkout, métodosDisponibles);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    // Se reserva la pestaña ANTES del `await`: Safari bloquea los popups
    // que se abren después de una espera asíncrona, así que hay que abrirla
    // en blanco ahora mismo y recién después decidir a dónde apunta.
    const nuevaVentana = window.open('', '_blank');

    setErrorEnvio(null);
    setEnviando(true);
    try {
      const order = await createOrder(summary, {
        name: checkout.name,
        phone: checkout.phone,
        paymentMethod: métodoElegido?.label ?? 'No especificado',
        delivery: checkout.delivery,
        address: checkout.address,
      });

      const url = buildWhatsAppUrl(buildOrderMessage(order));
      if (nuevaVentana) {
        nuevaVentana.location.href = url;
      } else {
        window.location.href = url;
      }

      setCheckout(CHECKOUT_VACÍO);
      setErrores({});
      onOrderSent();
      onClose();
    } catch (err) {
      nuevaVentana?.close();
      setErrorEnvio(err instanceof Error ? err.message : 'No se pudo enviar el pedido. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="animate-fade-in absolute inset-0 bg-verde-dark/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pedido"
        className="animate-sheet-in absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-3xl bg-crema"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 id="titulo-pedido" className="text-lg font-extrabold">
            Tu pedido
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar el pedido y seguir comprando"
            className="grid h-9 w-9 place-items-center rounded-full text-verde/90 transition-colors hover:bg-verde/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5">
          <ul className="mb-4 space-y-2.5">
            {summary.lines.map((line) => (
              <li
                key={line.product.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{line.product.name}</p>
                  {/* La etiqueta de promo va acá adentro y no como columna aparte:
                      con 3x2 el subtotal es menor que cantidad × precio, y sin
                      esta marca parece un error de cuenta. `flex-wrap` la baja de
                      línea en pantallas angostas en vez de desbordar la fila. */}
                  <p className="flex flex-wrap items-center gap-1 text-[11px] text-verde/90">
                    <span>
                      {line.product.unit} · {formatARS(getUnitPrice(line.product))} c/u
                    </span>
                    {line.product.promotion && (
                      <span className="rounded-full bg-dorado-soft px-1.5 py-0.5 text-[9px] font-extrabold text-dorado-dark">
                        {describePromotion(line.product.promotion)}
                      </span>
                    )}
                  </p>
                </div>

                <QuantityStepper
                  quantity={line.quantity}
                  onIncrement={() => onIncrement(line.product.id)}
                  onDecrement={() => onDecrement(line.product.id)}
                  productName={line.product.name}
                  size="sm"
                />

                <span className="precio w-20 shrink-0 text-right text-sm font-extrabold">
                  {formatARS(line.subtotal)}
                </span>

                <button
                  type="button"
                  onClick={() => onRemove(line.product.id)}
                  aria-label={`Eliminar ${line.product.name} del pedido`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-verde/70 transition-colors hover:bg-rojo/10 hover:text-rojo"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mb-4 flex items-center justify-between rounded-xl bg-verde-soft px-4 py-3">
            <span className="text-sm font-bold">Total</span>
            <span className="precio text-2xl font-extrabold">{formatARS(summary.total)}</span>
          </div>

          <CheckoutFields
            value={checkout}
            onChange={setCheckout}
            errors={errores}
            paymentMethods={settings.paymentMethods}
          />

          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-verde/90">
            Así le llega el mensaje al local
          </p>
          <div className="mb-4 rounded-2xl rounded-tl-md bg-[#DCF8C6] px-4 py-3 shadow-sm">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1f2c24]">{mensaje}</p>
          </div>

          {errorEnvio && (
            <p role="alert" className="mb-3 text-sm font-semibold text-rojo">
              {errorEnvio}
            </p>
          )}

          <button
            type="button"
            onClick={enviarPedido}
            disabled={enviando}
            /* Texto verde oscuro y no blanco: el verde de WhatsApp con blanco
               encima da 1,98:1, muy por debajo del mínimo legible. Así el
               botón sigue siendo inconfundible y se lee. */
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-wsp py-3.5 text-[15px] font-extrabold text-verde-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {enviando ? 'Enviando pedido…' : 'Enviar pedido por WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
