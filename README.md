# Super Todo — Catálogo online

Catálogo público para **Super Todo**, almacén de barrio en Monte Chingolo, Lanús.
El cliente entra desde un link de WhatsApp, arma el pedido y el botón final abre
WhatsApp con el mensaje ya redactado. **No hay pago online**: el pedido se retira
y se paga en el local.

## Cómo levantarlo

```bash
npm install
```

```bash
npm run dev
```

Queda en http://localhost:3000 (el `.claude/launch.json` del entorno lo levanta en el 3030).

Otros comandos:

```bash
npm run build
```

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

## Dónde tocar cada cosa

| Quiero cambiar… | Archivo |
| --- | --- |
| Número de WhatsApp, dirección, horarios, banner de ofertas | `src/config/business.ts` |
| Productos, precios, ofertas, stock | `src/data/products.ts` |
| Categorías y sus colores | `src/data/categories.ts` |
| Texto del mensaje de WhatsApp | `src/lib/whatsapp.ts` |
| Formato de precios y cálculo de descuento | `src/lib/currency.ts` |
| Paleta y tipografía | `src/app/globals.css` |

### Ejemplo: cambiar el número de WhatsApp

Se toca en un solo lugar, `src/config/business.ts`. Va en formato internacional,
sólo dígitos (país + 9 + área + número), que es lo que exige `wa.me`:

```ts
whatsappNumber: '5491136225341',
whatsappDisplay: '+54 11 3622-5341',
```

### Ejemplo: poner un producto en oferta

Alcanza con agregarle `previousPrice`. El `−25%` sale calculado, así que no puede
quedar un cartel de descuento pegado a un precio que ya cambió:

```ts
{ id: 'yerba-playadito-1k', name: 'Yerba mate Playadito', unit: '1 kg',
  category: 'almacen', price: 4990, previousPrice: 5900, available: true },
```

Para sacarlo de oferta, se borra `previousPrice`. Para marcarlo sin stock,
`available: false` (sigue visible pero no se puede agregar).

## Estructura

```
src/
├─ app/            layout, página del catálogo y estilos globales
├─ components/     UI (11 componentes) + íconos SVG inline
├─ config/         datos del comercio — el único lugar donde viven
├─ data/           catálogo mock y categorías
├─ hooks/          useCart
├─ lib/            moneda, carrito, mensaje de WhatsApp, store de localStorage
└─ types/          modelos de dominio
```

Los datos están separados de la UI a propósito: ningún componente sabe de dónde
salen los productos. Todo pasa por `getProducts()` en `src/data/products.ts`, así
que migrar a Supabase es cambiar esa función.

## Decisiones que conviene conocer

- **El carrito vive fuera de React**, en `src/lib/cartStore.ts`, y se lee con
  `useSyncExternalStore`. `localStorage` es un sistema externo: modelarlo así evita
  renders en cascada y hace que dos pestañas abiertas compartan el mismo pedido.
- **El carrito arranca vacío en el primer pintado** y recién después aparece lo
  guardado. Es para que el HTML del servidor y el del cliente coincidan.
- **El descuento se calcula, no se guarda.**
- **El texto del botón de WhatsApp es verde oscuro, no blanco.** El verde de marca
  `#25D366` con blanco encima da 1,98:1 de contraste, ilegible. Así queda en 5,69:1
  sin perder el color reconocible.
- **Los productos sin foto muestran un monograma** sobre el degradé de su categoría.
  El campo `imageUrl` ya está en el modelo: cuando haya fotos, se completa y listo.

## Para la etapa siguiente

- **Panel de administración** para que el dueño cargue ofertas sin tocar código.
- **Supabase**: mover `PRODUCTS` a una tabla y reemplazar `getProducts()`.
- **Fotos reales** de producto (completar `imageUrl`; hoy hay placeholders).
- **Dominio propio** y deploy (Vercel), para reemplazar `supertodo.com.ar/ofertas`
  que hoy es sólo una propuesta.
- **Registro de pedidos**: hoy el pedido viaja por WhatsApp y no queda guardado.

## Referencia

En `demo/index.html` está la demo de venta original (las tres vistas: tienda, panel
y mensajes). Es la referencia visual de este MVP y se abre con doble click, sin
servidor. Este proyecto implementa **sólo la tienda**.
