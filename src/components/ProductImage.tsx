import Image from 'next/image';
import { CATEGORY_TINTS } from '@/data/categories';
import type { Product } from '@/types';

/** Iniciales del producto: "Aceite de girasol Natura" → "AN". */
function monogram(name: string): string {
  const palabrasUtiles = name
    .split(' ')
    .filter((w) => w.length > 2 && !['de', 'del', 'la', 'el', 'los', 'las', 'con'].includes(w.toLowerCase()));

  return palabrasUtiles
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Imagen del producto con degradé por categoría de fondo.
 *
 * Mientras `imageUrl` esté vacío —hoy, en todo el catálogo— se ve el degradé
 * con el monograma. Es a propósito: un placeholder derivado de la categoría
 * hace que la grilla se lea ordenada en vez de rota, y cuando lleguen las
 * fotos reales sólo hay que completar el campo.
 */
export function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  const [from, to] = CATEGORY_TINTS[product.category];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, 220px"
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="select-none text-2xl font-extrabold tracking-tight text-verde-dark/25"
        >
          {monogram(product.name)}
        </span>
      )}
    </div>
  );
}
