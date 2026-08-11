import { BUSINESS } from '@/config/business';

type LogoProps = {
  className?: string;
  /** Color del óvalo y del texto. Por defecto, dorado sobre verde. */
  fill?: string;
  textFill?: string;
};

/**
 * Wordmark en un óvalo, siguiendo el logo real del local (la misma tipografía
 * dentro de una insignia ovalada). Es SVG para que se vea nítido en cualquier
 * tamaño y no dependa de ninguna imagen externa.
 *
 * Pendiente: reemplazarlo por el archivo oficial del cliente cuando lo mande.
 */
export function Logo({ className, fill = '#F2C230', textFill = '#1B5E3B' }: LogoProps) {
  return (
    <svg viewBox="0 0 150 62" className={className} role="img" aria-label={BUSINESS.name}>
      <ellipse cx="75" cy="31" rx="72" ry="28" fill={fill} />
      <ellipse cx="75" cy="31" rx="65" ry="22.5" fill="none" stroke={textFill} strokeWidth="2.5" />
      <text
        x="75"
        y="36"
        textAnchor="middle"
        fill={textFill}
        fontFamily="var(--font-bricolage), sans-serif"
        fontWeight="800"
        fontSize="17"
        letterSpacing=".5"
      >
        SUPER TODO
      </text>
    </svg>
  );
}
