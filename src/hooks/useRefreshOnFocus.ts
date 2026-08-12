'use client';

import { useEffect, useRef } from 'react';

/**
 * Vuelve a cargar los datos cuando la pantalla se vuelve a mirar.
 *
 * Está pensado para el momento real de trabajo del almacén: llega el WhatsApp
 * con un pedido, el dueño pasa de WhatsApp al panel — y justo ahí el panel
 * tiene que estar al día. Sin esto, la lista sigue mostrando lo que había
 * cuando abrió la pestaña, que puede ser de hace horas.
 *
 * Escucha `visibilitychange` y `focus` porque cubren casos distintos: en el
 * celular cambiar de app dispara el primero, y en escritorio pasar de una
 * ventana a otra sin ocultar la pestaña dispara sólo el segundo.
 */
export function useRefreshOnFocus(refrescar: () => Promise<void>) {
  // Por ref para que cambiar la función en cada render no reinstale los
  // listeners (y de paso no dispare consultas de más).
  const refrescarRef = useRef(refrescar);

  useEffect(() => {
    refrescarRef.current = refrescar;
  }, [refrescar]);

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      // Se traga el error a propósito: es un refresco que el usuario no pidió,
      // así que si falla se queda con lo que ya tenía en vez de comerse un
      // cartel rojo por algo que no hizo. El botón manual sí lo muestra.
      refrescarRef.current().catch(() => {});
    };

    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);

    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);
}
