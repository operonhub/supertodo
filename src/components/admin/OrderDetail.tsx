'use client';

import { Badge, DeleteButton, Modal, selectClass } from '@/components/admin/ui';
import { AlertIcon, WhatsAppIcon } from '@/components/icons';
import { useSettings } from '@/hooks/useStores';
import { formatARS } from '@/lib/currency';
import { formatDateTime, formatTime } from '@/lib/dates';
import {
  DELIVERY_LABEL,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_LABEL,
  PAYMENT_STYLE,
} from '@/lib/orders';
import { buildPrepMessage, buildTeamWhatsAppUrl } from '@/lib/whatsapp';
import type { Order } from '@/types';

/**
 * Enviar la preparación al equipo.
 *
 * Cada persona tiene su botón. Si todavía no tiene teléfono cargado el botón
 * queda deshabilitado y se explica por qué: es preferible eso a generar un link
 * `wa.me` roto que abre WhatsApp sin destinatario.
 */
function TeamDispatch({ order }: { order: Order }) {
  const settings = useSettings();
  const mensaje = buildPrepMessage(order);
  const faltanTeléfonos = settings.team.some((m) => !m.phone.trim());

  return (
    <section className="mt-5 rounded-2xl border border-verde/15 bg-white p-4">
      <h3 className="mb-1 text-sm font-extrabold">Enviar preparación al equipo</h3>
      <p className="mb-3 text-[11px] text-verde/90">
        Se abre WhatsApp con el detalle de lo que hay que preparar.
      </p>

      <div className="flex flex-wrap gap-2">
        {settings.team.map((member) => {
          const url = buildTeamWhatsAppUrl(member, mensaje);

          if (!url) {
            return (
              <button
                key={member.name}
                type="button"
                disabled
                title={`Falta cargar el teléfono de ${member.name} en Configuración`}
                className="flex cursor-not-allowed items-center gap-2 rounded-xl bg-verde/10 px-4 py-2.5 text-sm font-bold text-verde/70"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {member.name}
                <span className="text-[10px] font-semibold">· sin teléfono</span>
              </button>
            );
          }

          return (
            <a
              key={member.name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-wsp px-4 py-2.5 text-sm font-extrabold text-verde-dark transition hover:brightness-105"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Mandar a {member.name}
            </a>
          );
        })}
      </div>

      {faltanTeléfonos && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          Cargá los teléfonos del equipo en Configuración para poder enviarles los pedidos.
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-bold text-verde/90">
          Ver el mensaje que se envía
        </summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-crema px-3 py-2 font-sans text-[12px] leading-relaxed text-verde-dark">
          {mensaje}
        </pre>
      </details>
    </section>
  );
}

export function OrderDetail({
  order,
  onClose,
  onStatusChange,
  onPaymentChange,
  onDelete,
}: {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (id: string, status: Order['status']) => void;
  onPaymentChange: (id: string, payment: Order['payment']) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  if (!order) return null;

  return (
    <Modal open onClose={onClose} title={`Pedido #${order.id}`} side>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className={ORDER_STATUS_STYLE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
        <Badge className={PAYMENT_STYLE[order.payment]}>{PAYMENT_LABEL[order.payment]}</Badge>
        <Badge className="bg-verde/10 text-verde">{DELIVERY_LABEL[order.delivery]}</Badge>
        <Badge className="bg-verde/10 text-verde">{order.paymentMethod}</Badge>
        <span className="ml-auto text-[11px] text-verde/90">{formatDateTime(order.createdAt)}</span>
      </div>

      {order.status === 'sin_confirmar' && (
        <section className="mb-4 rounded-2xl bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-extrabold text-amber-900">Falta confirmar</h3>
          <p className="mb-3 text-[13px] leading-relaxed text-amber-900">
            El cliente armó este pedido en la tienda, pero mandar el WhatsApp lo tiene que hacer
            él. Confirmalo cuando te llegue el mensaje con el código <strong>#{order.id}</strong>.
            Hasta entonces no suma a los números del día.
          </p>
          <button
            type="button"
            onClick={() => onStatusChange(order.id, 'nuevo')}
            className="w-full rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-verde-dark"
          >
            Confirmar pedido
          </button>
        </section>
      )}

      <section className="mb-4 rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-extrabold">Cliente</h3>
        <p className="mb-2 text-sm font-extrabold">{order.customer.name}</p>

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-[11px] font-semibold text-verde/70">Teléfono</dt>
            <dd>
              <a
                href={`tel:${order.customer.phone.replace(/\D/g, '')}`}
                className="precio text-verde underline-offset-2 hover:underline"
              >
                {order.customer.phone}
              </a>
            </dd>
          </div>

          {order.customer.dni && (
            <div>
              <dt className="text-[11px] font-semibold text-verde/70">DNI</dt>
              <dd className="precio text-verde-dark">{order.customer.dni}</dd>
            </div>
          )}

          {order.customer.accountAddress && (
            <div>
              <dt className="text-[11px] font-semibold text-verde/70">Dirección de la cuenta</dt>
              <dd className="break-words text-verde-dark">{order.customer.accountAddress}</dd>
            </div>
          )}

          {order.delivery === 'reparto' &&
            order.customer.address &&
            order.customer.address !== order.customer.accountAddress && (
              <div>
                <dt className="text-[11px] font-semibold text-verde/70">
                  {order.customer.accountAddress ? 'Entrega de este pedido' : 'Dirección de entrega'}
                </dt>
                <dd className="break-words text-verde-dark">{order.customer.address}</dd>
              </div>
            )}
        </dl>
      </section>

      <section className="mb-4 rounded-2xl bg-white p-4">
        <h3 className="mb-3 text-sm font-extrabold">Productos</h3>
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-baseline gap-3 text-sm">
              <span className="precio shrink-0 font-extrabold text-verde">{item.quantity}x</span>
              <span className="min-w-0 flex-1">
                {item.name}
                <span className="text-[11px] text-verde/90"> · {item.unit}</span>
                <span className="flex flex-wrap items-center gap-1 text-[11px] text-verde/90">
                  <span className="precio">{formatARS(item.unitPrice)} c/u</span>
                  {item.promotionLabel && (
                    <span className="rounded-full bg-dorado-soft px-1.5 py-0.5 text-[9px] font-extrabold text-dorado-dark">
                      {item.promotionLabel}
                    </span>
                  )}
                </span>
              </span>
              <span className="precio shrink-0 font-extrabold">{formatARS(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-verde/10 pt-3">
          <span className="text-sm font-bold">Total</span>
          <span className="precio text-xl font-extrabold">{formatARS(order.total)}</span>
        </div>
      </section>

      {order.notes && (
        <section className="mb-4 rounded-2xl bg-amber-50 p-4">
          <h3 className="mb-1 text-sm font-extrabold text-amber-900">Nota</h3>
          <p className="text-sm text-amber-900">{order.notes}</p>
        </section>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="detalle-estado" className="mb-1 block text-xs font-semibold text-verde/90">
            Estado del pedido
          </label>
          <select
            id="detalle-estado"
            className={selectClass}
            value={order.status}
            onChange={(e) => onStatusChange(order.id, e.target.value as Order['status'])}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="detalle-pago" className="mb-1 block text-xs font-semibold text-verde/90">
            Pago
          </label>
          <select
            id="detalle-pago"
            className={selectClass}
            value={order.payment}
            onChange={(e) => onPaymentChange(order.id, e.target.value as Order['payment'])}
          >
            <option value="falta_pagar">Falta pagar</option>
            <option value="pagado">Pagado</option>
          </select>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4">
        <h3 className="mb-3 text-sm font-extrabold">Historial</h3>
        <ol className="space-y-2.5">
          {order.history.map((evento, i) => (
            <li key={`${evento.status}-${evento.at}`} className="flex items-center gap-3 text-sm">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  i === order.history.length - 1 ? 'bg-verde' : 'bg-verde/25'
                }`}
              />
              <span className="flex-1 font-semibold">{ORDER_STATUS_LABEL[evento.status]}</span>
              <span className="precio text-[11px] text-verde/90">{formatTime(evento.at)}</span>
            </li>
          ))}
        </ol>
      </section>

      <TeamDispatch order={order} />

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl border border-verde/20 px-5 py-2.5 text-sm font-bold text-verde transition-colors hover:bg-verde/5"
      >
        Cerrar
      </button>

      {/* Para un pedido real que no se entrega conviene el estado "Cancelado",
          que lo deja en la historia del día. Borrar es para la basura: los
          sin confirmar que nunca llegaron y las pruebas. */}
      <DeleteButton
        label="Eliminar pedido"
        question={`¿Eliminar el pedido #${order.id} de ${order.customer.name}? No se puede deshacer.`}
        onDelete={() => onDelete(order.id)}
      />
    </Modal>
  );
}
