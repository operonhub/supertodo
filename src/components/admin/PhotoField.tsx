'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { CameraIcon, ImageIcon, TrashIcon } from '@/components/icons';
import { deleteProductPhoto, esFotoPropia, uploadProductPhoto } from '@/lib/photos';

/**
 * Foto del producto: sacarla con la cámara o elegirla de la galería.
 *
 * Son dos `<input type="file">` separados y no uno solo porque `capture`
 * cambia el comportamiento: con `capture="environment"` el celular abre
 * directo la cámara trasera, sin él abre el carrete. Un solo input obligaría
 * a elegir siempre en un menú intermedio, y cargar un producto con el celular
 * en la mano tiene que ser de un toque.
 *
 * En escritorio `capture` se ignora y los dos botones abren el explorador de
 * archivos — inofensivo, y evita esconder el botón según el dispositivo.
 */
export function PhotoField({
  value,
  onChange,
}: {
  /** URL de la foto actual, o cadena vacía. */
  value: string;
  onChange: (url: string) => void;
}) {
  const cámaraRef = useRef<HTMLInputElement>(null);
  const galeríaRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Se limpia el input enseguida: si no, elegir dos veces seguidas la misma
    // foto no vuelve a disparar `change`.
    e.target.value = '';
    if (!file) return;

    const anterior = value;

    setError(null);
    setSubiendo(true);
    try {
      const url = await uploadProductPhoto(file);
      onChange(url);

      // Recién ahora se borra la vieja: si la subida falla, la foto que ya
      // estaba sigue intacta.
      if (anterior && esFotoPropia(anterior)) await deleteProductPhoto(anterior);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  function quitar() {
    const anterior = value;
    onChange('');
    setError(null);
    if (anterior && esFotoPropia(anterior)) deleteProductPhoto(anterior);
  }

  const botón =
    'flex flex-1 items-center justify-center gap-2 rounded-xl border border-verde/20 px-3 py-2.5 text-xs font-bold text-verde transition-colors hover:bg-verde/5 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold text-verde/90">Foto</p>

      <div className="flex items-start gap-3">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-verde/15 bg-white">
          {value ? (
            <Image
              src={value}
              alt="Foto del producto"
              fill
              unoptimized
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-verde/25" />
          )}

          {subiendo && (
            <div className="absolute inset-0 grid place-items-center bg-white/80">
              <span className="text-[10px] font-bold text-verde">Subiendo…</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={subiendo}
              onClick={() => cámaraRef.current?.click()}
              className={botón}
            >
              <CameraIcon className="h-4 w-4" />
              Sacar foto
            </button>

            <button
              type="button"
              disabled={subiendo}
              onClick={() => galeríaRef.current?.click()}
              className={botón}
            >
              <ImageIcon className="h-4 w-4" />
              Galería
            </button>
          </div>

          {value ? (
            <button
              type="button"
              disabled={subiendo}
              onClick={quitar}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-verde/70 transition-colors hover:text-rojo disabled:opacity-60"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Quitar foto
            </button>
          ) : (
            <p className="mt-2 text-[11px] text-verde/90">
              Sin foto se muestra el color de la categoría.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rojo">
          {error}
        </p>
      )}

      <input
        ref={cámaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onArchivo}
        className="hidden"
      />
      <input ref={galeríaRef} type="file" accept="image/*" onChange={onArchivo} className="hidden" />
    </div>
  );
}
