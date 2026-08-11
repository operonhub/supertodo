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

## Las dos partes

| Ruta | Qué es | Quién la usa |
| --- | --- | --- |
| `/` | Catálogo público. Se comparte por WhatsApp. | El cliente, desde el celular |
| `/admin` | Panel interno: resumen, productos, ofertas, pedidos, catering y configuración. | El dueño, desde la computadora |

> ⚠️ **`/admin` no tiene login todavía.** Está abierta para poder trabajar y validar
> el flujo con el dueño. Antes de producción hay que protegerla: el chequeo de sesión
> va en `src/app/admin/layout.tsx`, que envuelve a todas las pantallas del panel.

## Dónde tocar cada cosa

| Quiero cambiar… | Archivo |
| --- | --- |
| Número de WhatsApp, dirección, horarios, equipo, banner | `src/config/business.ts` |
| Productos, precios, ofertas, stock | `src/data/products.ts` |
| Pedidos de muestra | `src/data/orders.ts` |
| Consultas de catering de muestra | `src/data/catering.ts` |
| Categorías y sus colores | `src/data/categories.ts` |
| Texto de los mensajes de WhatsApp | `src/lib/whatsapp.ts` |
| Formato de precios y cálculo de descuento | `src/lib/currency.ts` |
| Fechas y horas (zona Buenos Aires) | `src/lib/dates.ts` |
| Filtros, orden y etiquetas de pedidos | `src/lib/orders.ts` |
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
├─ app/
│  ├─ page.tsx     catálogo público
│  └─ admin/       una carpeta por sección del panel
├─ components/
│  └─ admin/       componentes exclusivos del panel
├─ config/         datos del comercio — el único lugar donde viven
├─ data/           mocks: catálogo, pedidos, catering, categorías
├─ hooks/          useCart y lectura de los stores
├─ lib/            moneda, fechas, pedidos, productos, WhatsApp, stores
└─ types/          modelos de dominio
```

Los datos están separados de la UI a propósito: ningún componente sabe de dónde
salen los productos. Todo pasa por `getProducts()` en `src/data/products.ts`, así
que migrar a Supabase es cambiar esa función.

## Decisiones que conviene conocer

- **El carrito vive fuera de React**, en `src/lib/cartStore.ts`, y se lee con
  `useSyncExternalStore`. `localStorage` es un sistema externo: modelarlo así evita
  renders en cascada y hace que dos pestañas abiertas compartan el mismo pedido.
- **Los datos del panel usan el mismo patrón** (`src/lib/createStore.ts` +
  `src/lib/stores.ts`). Cuando exista la base de datos se reemplaza de dónde leen y
  escriben esas funciones, y ninguna pantalla cambia.
- **Los ítems de un pedido guardan nombre y precio congelados** al momento de la
  compra, no una referencia al producto: si mañana sube el aceite, el pedido de hoy
  tiene que seguir diciendo lo que costó hoy.
- **El estado del pedido va separado del pago.** Un pedido puede estar entregado y
  sin pagar (fiado), o pagado por transferencia y todavía sin preparar.
- **Todas las fechas se formatean en `America/Argentina/Buenos_Aires`** con `Intl`,
  nunca con `getHours()`. Y se calculan en el cliente: las páginas se prerenderizan
  en el build, así que resolver "hoy" durante el render dejaría la fecha del deploy
  congelada en el HTML.
- **Los teléfonos del equipo arrancan vacíos** y el botón de WhatsApp queda
  deshabilitado hasta cargarlos, en vez de generar un `wa.me` roto.
- **El carrito arranca vacío en el primer pintado** y recién después aparece lo
  guardado. Es para que el HTML del servidor y el del cliente coincidan.
- **El descuento se calcula, no se guarda.**
- **El texto del botón de WhatsApp es verde oscuro, no blanco.** El verde de marca
  `#25D366` con blanco encima da 1,98:1 de contraste, ilegible. Así queda en 5,69:1
  sin perder el color reconocible.
- **Los productos sin foto muestran un monograma** sobre el degradé de su categoría.
  El campo `imageUrl` ya está en el modelo: cuando haya fotos, se completa y listo.

## Alcance de esta etapa

El panel funciona con **datos de muestra guardados en el navegador**. Eso alcanza
para que el dueño lo use y diga qué le falta, pero conviene tenerlo claro:

- Lo que edita en su computadora **no llega al celular de un cliente**.
- Los pedidos que se ven son inventados: **todavía no hay forma de que un pedido
  real entre al panel**. Hoy el cliente aprieta "Enviar pedido" y eso abre un
  WhatsApp; nadie lo registra en ningún lado.

## Para la etapa siguiente

1. **Supabase + login del panel.** Mover productos, pedidos y configuración a
   tablas, y proteger `/admin`.
2. **Cómo entran los pedidos.** Es la decisión de fondo: o se integra la API de
   WhatsApp Business, o el catálogo crea el pedido en la base antes de abrir el
   chat. La segunda es mucho más barata y da el 90% del valor.
3. **Fotos reales** de producto: el campo `imageUrl` ya existe y el formulario ya
   lo acepta; falta resolver dónde se suben.
4. **Catering**, cuando el dueño defina menús, precios, seña y logística.
5. **Dominio propio**, para reemplazar el link de Vercel.

## Referencia

En `demo/index.html` está la demo de venta original (las tres vistas: tienda, panel
y mensajes). Es la referencia visual de este MVP y se abre con doble click, sin
servidor. Este proyecto implementa **sólo la tienda**.
