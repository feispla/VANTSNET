// /play — centro de matchmaking (FASE 4 del plan). El motor de matchmaking
// existente vive en producción (solo lectura); la cola D1 de la preview se
// construye en FASE 4. Aquí no hay cola simulada: estado honesto.
import { Gamepad2, Swords, Users, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Play — VANTSNET',
  description: 'Centro de matchmaking de la red VANTS: cola, salas y ready check.',
};

const PASOS = [
  { icono: Gamepad2, titulo: 'Elige juego y modo', texto: 'CS2 o VALORANT · individual o con tu equipo.' },
  { icono: Users, titulo: 'Entra en la cola', texto: 'Cola por región con tu MMR/Elo actual.' },
  { icono: Swords, titulo: 'Encuentro y ready check', texto: 'Acepta la partida con tu rival en la sala de encuentro.' },
  { icono: Clock, titulo: 'Historial', texto: 'Cada partida queda registrada con su resultado validado.' },
];

export default function PlayPage() {
  return (
    <HubSeccion
      icono={Gamepad2}
      etiqueta="PLAY · MATCHMAKING"
      titulo="Centro de matchmaking"
      descripcion="Encontrar rivales y entrar en cola con tu equipo o en individual.
        La cola, los tickets y los ready checks persistirán en la D1 de la preview,
        coordinando el tiempo real con Durable Objects — sin segundas bases de datos."
      fase={4}
      notaFuente="Estado honesto: la cola de la preview aún no está abierta. El motor existente de producción no se duplica."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {PASOS.map((p) => {
          const Icono = p.icono;
          return (
            <div key={p.titulo} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF4655]/30 bg-[#FF4655]/10">
                  <Icono className="h-4 w-4 text-[#FF4655]" aria-hidden />
                </span>
                <h2 className="text-sm font-bold text-zinc-100">{p.titulo}</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{p.texto}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <PanelFaseProxima
          titulo="La cola se abre en la Fase 4"
          detalle="Estamos construyendo primero la identidad competitiva (equipos, perfiles) y el Tournament Center. Cuando la cola D1 esté lista, entras desde aquí con un clic. Mientras tanto, el roster real y los torneos vivos siguen en la Sala y en Torneos."
          cta={{ href: '/sala', texto: 'Ver la Sala en vivo' }}
        />
      </div>
    </HubSeccion>
  );
}
