'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Field, Toast, inputClass } from '@/components/admin/ui';
import { AlertIcon } from '@/components/icons';
import { useSettings } from '@/hooks/useStores';
import { updateSettings } from '@/lib/stores';
import type { BusinessConfig, TeamMember } from '@/types';

export default function ConfiguracionPage() {
  const settings = useSettings();

  /**
   * Se guardan sólo los campos tocados y el formulario se **deriva** de la
   * configuración vigente. Evita tener una copia que haya que resincronizar
   * cuando el store termina de hidratar desde localStorage.
   */
  const [cambios, setCambios] = useState<Partial<BusinessConfig> | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const sucio = cambios !== null;
  const form: BusinessConfig = cambios ? { ...settings, ...cambios } : settings;

  function set<K extends keyof BusinessConfig>(campo: K, valor: BusinessConfig[K]) {
    setCambios((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function setTeam(i: number, parche: Partial<TeamMember>) {
    set(
      'team',
      form.team.map((m, j) => (j === i ? { ...m, ...parche } : m)),
    );
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (cambios) updateSettings(cambios);
    setCambios(null);
    setAviso('Configuración guardada');
  }

  return (
    <form onSubmit={guardar}>
      <PageHeader
        title="Configuración"
        subtitle="Los datos que ve tu cliente y los que usa el panel"
        actions={
          <button
            type="submit"
            disabled={!sucio}
            className="rounded-xl bg-verde px-5 py-2.5 text-sm font-extrabold text-white shadow-card transition-colors hover:bg-verde-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sucio ? 'Guardar cambios' : 'Todo guardado'}
          </button>
        }
      />

      <div className="grid gap-4 pb-10 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-4 text-sm font-extrabold">Datos del comercio</h2>

          <Field label="Nombre" htmlFor="c-nombre">
            <input
              id="c-nombre"
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <Field label="Calle y número" htmlFor="c-calle">
            <input
              id="c-calle"
              className={inputClass}
              value={form.address.street}
              onChange={(e) => set('address', { ...form.address, street: e.target.value })}
            />
          </Field>

          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Barrio" htmlFor="c-barrio">
              <input
                id="c-barrio"
                className={inputClass}
                value={form.address.neighborhood}
                onChange={(e) => set('address', { ...form.address, neighborhood: e.target.value })}
              />
            </Field>

            <Field label="Localidad" htmlFor="c-ciudad">
              <input
                id="c-ciudad"
                className={inputClass}
                value={form.address.city}
                onChange={(e) => set('address', { ...form.address, city: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="WhatsApp del comercio"
            htmlFor="c-wsp"
            hint="Sólo números, con código de país: 5491136225341"
          >
            <input
              id="c-wsp"
              inputMode="numeric"
              className={inputClass}
              value={form.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value.replace(/\D/g, ''))}
            />
          </Field>

          <Field label="Cómo se muestra el teléfono" htmlFor="c-wsp-visible">
            <input
              id="c-wsp-visible"
              className={inputClass}
              value={form.whatsappDisplay}
              onChange={(e) => set('whatsappDisplay', e.target.value)}
            />
          </Field>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <h2 className="mb-4 text-sm font-extrabold">Horarios</h2>

          {form.hours.map((h, i) => (
            <div key={h.label} className="mb-3 grid grid-cols-2 gap-3">
              <Field label="Días" htmlFor={`c-hora-label-${i}`}>
                <input
                  id={`c-hora-label-${i}`}
                  className={inputClass}
                  value={h.label}
                  onChange={(e) =>
                    set(
                      'hours',
                      form.hours.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                />
              </Field>

              <Field label="Horario" htmlFor={`c-hora-valor-${i}`}>
                <input
                  id={`c-hora-valor-${i}`}
                  className={inputClass}
                  value={h.value}
                  onChange={(e) =>
                    set(
                      'hours',
                      form.hours.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                    )
                  }
                />
              </Field>
            </div>
          ))}

          <div className="mt-4 border-t border-verde/10 pt-4">
            <Field
              label="Las ofertas del día valen hasta"
              htmlFor="c-limite"
              hint="Se muestra en la pantalla de Ofertas"
            >
              <input
                id="c-limite"
                type="time"
                className={`${inputClass} w-40`}
                value={form.offerDeadline}
                onChange={(e) => set('offerDeadline', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6 lg:col-span-2">
          <h2 className="mb-1 text-sm font-extrabold">Equipo que prepara los pedidos</h2>
          <p className="mb-4 text-[11px] text-verde/90">
            A estos números se les manda la preparación desde el detalle de cada pedido.
          </p>

          <div className="grid gap-x-4 sm:grid-cols-2">
            {form.team.map((member, i) => (
              <div key={member.name || i} className="mb-2">
                <Field label="Nombre" htmlFor={`c-team-nombre-${i}`}>
                  <input
                    id={`c-team-nombre-${i}`}
                    className={inputClass}
                    value={member.name}
                    onChange={(e) => setTeam(i, { name: e.target.value })}
                  />
                </Field>

                <Field
                  label="WhatsApp"
                  htmlFor={`c-team-tel-${i}`}
                  hint="Sólo números, con código de país"
                >
                  <input
                    id={`c-team-tel-${i}`}
                    inputMode="numeric"
                    placeholder="5491100000000"
                    className={inputClass}
                    value={member.phone}
                    onChange={(e) => setTeam(i, { phone: e.target.value.replace(/\D/g, '') })}
                  />
                </Field>
              </div>
            ))}
          </div>

          {form.team.some((m) => !m.phone.trim()) && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] font-semibold text-amber-900">
              <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
              Falta cargar algún teléfono. Hasta que estén, el botón de enviar el pedido a esa
              persona aparece deshabilitado.
            </p>
          )}
        </section>

        {/* Nota honesta sobre el alcance: sin backend esto no sale de esta computadora. */}
        <p className="text-[11px] leading-relaxed text-verde/90 lg:col-span-2">
          Por ahora la configuración se guarda en este navegador. Cuando conectemos la base de datos
          va a quedar guardada en el servidor y a verse desde cualquier dispositivo.
        </p>
      </div>

      <Toast message={aviso} onDone={() => setAviso(null)} />
    </form>
  );
}
