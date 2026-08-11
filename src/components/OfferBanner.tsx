import { ZapIcon } from '@/components/icons';
import { BUSINESS } from '@/config/business';

/**
 * Franja de ofertas de la tanda. Si `offerBanner` está en `null` en la
 * configuración, no se dibuja nada.
 */
export function OfferBanner() {
  const banner = BUSINESS.offerBanner;
  if (!banner) return null;

  return (
    <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-dorado px-4 py-3">
      <ZapIcon className="h-5 w-5 shrink-0 text-verde-dark" />
      <p className="text-[13px] font-bold leading-snug text-verde-dark">
        {banner.title} <span className="font-semibold text-verde-dark/85">— {banner.detail}</span>
      </p>
    </div>
  );
}
