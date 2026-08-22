import type { Order } from '@/types';

/**
 * Avisos del panel: sonido y notificación del navegador.
 *
 * Desde que el checkout dejó de abrir WhatsApp, un pedido entra a la base y no
 * suena nada en ningún lado. Este módulo es el reemplazo de ese aviso, y por
 * eso su regla de oro es la contraria a la de una app de escritorio: es
 * preferible interrumpir de más que dejar a un cliente esperando.
 */

export type AlertEvent =
  | { kind: 'order'; order: Order }
  | { kind: 'message'; orderId: string; body: string };

export interface AlertContext {
  /** `false` si el panel está en otra pestaña o el celular con la pantalla apagada. */
  tabVisible: boolean;
  /** `true` si el dueño ya está mirando la lista de pedidos. */
  onOrdersPage: boolean;
}

/* ================================================================
   POLÍTICA — qué merece interrumpir
================================================================ */

/**
 * Decide si un evento suena y notifica, o si sólo actualiza el contador.
 *
 * Es el único lugar donde se elige cuánto molestar. Los tres criterios que
 * están hoy, y por qué:
 *
 * 1. Un pedido nuevo SIEMPRE avisa, incluso con la lista a la vista: es plata
 *    entrando y el costo de perderlo es mucho mayor que el de un ruido de más.
 * 2. Un mensaje de chat sólo avisa si el dueño no está mirando los pedidos.
 *    Un cliente que escribe cinco líneas seguidas no puede hacer sonar el
 *    local cinco veces mientras alguien ya está atendiendo esa conversación.
 * 3. Con la pestaña oculta avisa todo, porque ahí el contador no se ve.
 */
export function shouldAnnounce(event: AlertEvent, context: AlertContext): boolean {
  if (!context.tabVisible) return true;
  if (event.kind === 'order') return true;
  return !context.onOrdersPage;
}

/* ================================================================
   SONIDO
================================================================ */

let audioContext: AudioContext | null = null;

/**
 * Prepara el audio con un gesto del usuario.
 *
 * Los navegadores no dejan sonar nada hasta que hubo un clic o una tecla, así
 * que el `AudioContext` se crea (y se despierta) desde el botón de activar
 * avisos. Sin este paso, el primer pedido del día entraría en silencio.
 */
export function primeAlertSound() {
  if (typeof window === 'undefined') return;

  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
}

/**
 * Dos notas cortas, sintetizadas en el momento.
 *
 * Se genera con WebAudio en vez de servir un mp3: no suma un archivo al
 * bundle, no depende de que la red lo traiga a tiempo y el panel puede sonar
 * aunque el celular esté con la conexión pésima del depósito.
 */
export function playAlertSound(alto = false) {
  if (!audioContext || audioContext.state !== 'running') return;

  const ahora = audioContext.currentTime;
  const notas = alto ? [880, 1174.7] : [587.3, 880];

  notas.forEach((frecuencia, i) => {
    const oscilador = audioContext!.createOscillator();
    const ganancia = audioContext!.createGain();
    const desde = ahora + i * 0.14;

    oscilador.type = 'sine';
    oscilador.frequency.value = frecuencia;

    // Rampa en vez de encendido y apagado seco: un corte abrupto de una onda
    // suena como un "clic" y en el parlante del celular se escucha peor.
    ganancia.gain.setValueAtTime(0.0001, desde);
    ganancia.gain.exponentialRampToValueAtTime(0.18, desde + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, desde + 0.28);

    oscilador.connect(ganancia).connect(audioContext!.destination);
    oscilador.start(desde);
    oscilador.stop(desde + 0.3);
  });
}

/* ================================================================
   NOTIFICACIÓN DEL NAVEGADOR
================================================================ */

export type NotificationState = 'no-soportado' | NotificationPermission;

export function notificationState(): NotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'no-soportado';
  return Notification.permission;
}

const permisoListeners = new Set<() => void>();

/**
 * El permiso del navegador, leído como store externo.
 *
 * `Notification.permission` no existe en el servidor y no emite eventos, así
 * que la alternativa —un efecto que haga `setState` al montar— es justo lo que
 * el linter de React 19 rechaza. Envolverlo acá deja que el componente lo lea
 * con `useSyncExternalStore`, igual que el carrito y los stores del panel.
 *
 * El snapshot es un string: `useSyncExternalStore` compara por identidad y un
 * objeto nuevo en cada llamada haría render infinito.
 */
export const notificationStore = {
  subscribe(listener: () => void) {
    permisoListeners.add(listener);
    return () => {
      permisoListeners.delete(listener);
    };
  },
  getSnapshot: notificationState,
  getServerSnapshot: (): NotificationState => 'no-soportado',
};

/** Se pide desde un botón, nunca al entrar: Chrome castiga los pedidos automáticos. */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'no-soportado';
  if (Notification.permission !== 'default') return Notification.permission;

  const resultado = await Notification.requestPermission();
  for (const listener of permisoListeners) listener();
  return resultado;
}

/**
 * Notificación del sistema.
 *
 * El `tag` es el id del pedido: si llegan tres mensajes del mismo pedido, el
 * sistema reemplaza la notificación anterior en vez de apilar tres. La
 * campanita del panel es la que lleva la cuenta; esto sólo tiene que hacer
 * levantar la vista.
 */
function showNotification(title: string, body: string, tag: string) {
  if (notificationState() !== 'granted') return;

  try {
    const notificacion = new Notification(title, {
      body,
      tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });

    notificacion.onclick = () => {
      window.focus();
      notificacion.close();
    };
  } catch {
    // Android exige service worker para `new Notification`. Si no se puede,
    // el sonido y el contador siguen siendo el aviso; no vale romper por esto.
  }
}

/** Punto único de entrada: consulta la política y, si corresponde, avisa. */
export function announce(event: AlertEvent, context: AlertContext) {
  if (!shouldAnnounce(event, context)) return;

  if (event.kind === 'order') {
    playAlertSound(true);
    showNotification(
      '¡Pedido nuevo!',
      `${event.order.customer.name} · ${event.order.items.length} productos`,
      `pedido-${event.order.id}`,
    );
    return;
  }

  playAlertSound();
  showNotification(
    `Mensaje del pedido #${event.orderId}`,
    event.body.slice(0, 120),
    `chat-${event.orderId}`,
  );
}
