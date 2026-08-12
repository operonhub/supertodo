import { BagIcon, ClockIcon, MapPinIcon, WhatsAppIcon } from '@/components/icons';
import { BUSINESS, FULL_ADDRESS } from '@/config/business';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

/**
 * Datos del local al pie del catálogo: dónde queda, cuándo abre y cómo se
 * retira. Todo sale de `config/business.ts`.
 */
export function StoreInfo() {
  return (
    <footer className="mt-6 border-t border-verde/10 bg-white/60 px-4 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
            <MapPinIcon className="h-4 w-4 text-verde/70" />
            Dónde estamos
          </h2>
          <p className="text-sm leading-relaxed text-verde/90">{FULL_ADDRESS}</p>
          <a
            href={buildWhatsAppUrl(`Hola ${BUSINESS.name}, tengo una consulta:`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-wsp px-3.5 py-2 text-xs font-extrabold text-verde-dark transition hover:brightness-105"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            {BUSINESS.whatsappDisplay}
          </a>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
            <ClockIcon className="h-4 w-4 text-verde/70" />
            Horarios
          </h2>
          <dl className="space-y-1.5">
            {BUSINESS.hours.map((h) => (
              <div key={h.label} className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="text-verde/90">{h.label}</dt>
                <dd className="precio font-semibold">{h.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="sm:col-span-2">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
            <BagIcon className="h-4 w-4 text-verde/70" />
            {BUSINESS.pickup.title}
          </h2>
          <p className="text-sm leading-relaxed text-verde/90">{BUSINESS.pickup.detail}</p>
        </section>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-center text-[11px] text-verde/90">
        {BUSINESS.name} — {BUSINESS.address.neighborhood}, {BUSINESS.address.city}
      </p>
    </footer>
  );
}
