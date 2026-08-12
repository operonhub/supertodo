'use client';

import Image from 'next/image';
import { getCategoryTint } from '@/data/categories';
import { useSettings } from '@/hooks/useStores';
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
 * Mientras `imageUrl` esté vacío se ve el degradé con el monograma. Es a
 * propósito: un placeholder derivado de la categoría hace que la grilla se lea
 * ordenada en vez de rota, y cuando llega la foto real sigue siendo el fondo
 * mientras carga.
 *
 * Toma el color de la configuración —donde el dueño edita las categorías— en
 * vez de recibirlo por props: se dibuja en cuatro lugares distintos (tienda y
 * tres pantallas del panel) y pasarlo a mano por cada uno no aportaba nada.
 */
export function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  const settings = useSettings();
  const [from, to] = getCategoryTint(settings.categories, product.category);

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
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 260px"
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
