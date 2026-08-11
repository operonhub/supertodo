import type { CateringInquiry } from '@/types';

/**
 * Consultas de catering de muestra.
 *
 * La sección está deliberadamente sin desarrollar: falta definir con el dueño
 * cómo cotiza, qué menús ofrece y cómo maneja la seña. Hasta entonces esto es
 * sólo un listado visual para validar el flujo con él.
 *
 * Las fechas de evento son fijas (no relativas como en pedidos) porque son
 * fechas futuras concretas que el dueño reconoce, no "hace tanto tiempo".
 */
export const CATERING_INQUIRIES: CateringInquiry[] = [
  {
    id: 'CAT-014',
    customer: { name: 'Hernán Bianchi', phone: '+54 11 3344-9977' },
    event: 'Cumpleaños de 50',
    eventDate: '2026-08-22',
    people: 60,
    status: 'presupuesto',
    notes: 'Salón en Lanús, a diez cuadras. Pidió salado, mesa dulce y torta.',
  },
  {
    id: 'CAT-013',
    customer: { name: 'Colegio San Martín', phone: '+54 11 4400-1188' },
    event: 'Acto de fin de curso',
    eventDate: '2026-08-29',
    people: 80,
    status: 'confirmado',
    notes: 'Combo Merienda. Facturan a nombre de la cooperadora.',
  },
  {
    id: 'CAT-012',
    customer: { name: 'Vanina Suárez', phone: '+54 11 6677-3322' },
    event: 'Bautismo',
    eventDate: '2026-08-30',
    people: 30,
    status: 'confirmado',
    notes: 'En casa particular. Combo Picada.',
  },
  {
    id: 'CAT-015',
    customer: { name: 'Nicolás Fontana', phone: '+54 11 2211-8899' },
    event: 'Despedida de soltero',
    eventDate: '2026-09-05',
    people: 25,
    status: 'nueva',
    notes: 'Preguntó por opciones sin TACC.',
  },
  {
    id: 'CAT-016',
    customer: { name: 'Andrea Salas', phone: '+54 11 5544-7766' },
    event: 'Cumpleaños infantil',
    eventDate: '2026-09-12',
    people: 40,
    status: 'nueva',
  },
  {
    id: 'CAT-011',
    customer: { name: 'Familia Ríos', phone: '+54 11 9988-4433' },
    event: 'Aniversario',
    eventDate: '2026-08-02',
    people: 45,
    status: 'realizado',
    notes: 'Salió todo bien. Pidieron la factura después del evento.',
  },
];
