// /equipos — hub de equipos (FASE 2: identidad competitiva en D1 preview).
import { Shield, UserPlus, Crown, ArrowLeftRight } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Equipos — VANTSNET',
  description: 'Crea tu equipo, invita compañeros y compite en la red VANTS.',
};

const ROLES = [
  { icono: Crown, titulo: 'Capitán', texto: 'Crea el equipo, inscribe a torneos y gestiona roles.' },
  { icono: UserPlus, titulo: 'Jugadores y suplentes', texto: 'Aceptan invitaciones o solicitan ingreso al equipo.' },
  { icono: ArrowLeftRight, titulo: 'Entrenadores', texto: 'Acceso al historial competitivo y preparación de partidos.' },
];

export default function EquiposPage() {
  return (
    <HubSeccion
      icono={Shield}
      etiqueta="TEAMS · EQUIPOS"
      titulo="Equipos"
      descripcion="Identidad competitiva colectiva: nombre y etiqueta, logo, región,
        videojuegos y roster con roles. Las invitaciones, solicitudes y el historial
        del equipo persisten en D1 y emiten eventos a VANTS-BUS (team.created,
        team.invitation.accepted…)."
      fase={2}
      notaFuente="Estado honesto: la creación de equipos se activa en la Fase 2. Los equipos del roster real siguen visibles en la Sala."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => {
          const Icono = r.icono;
          return (
            <div key={r.titulo} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <Icono className="h-5 w-5 text-[#FF4655]" aria-hidden />
              <h2 className="mt-2 text-sm font-bold text-zinc-100">{r.titulo}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{r.texto}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6">
        <PanelFaseProxima
          titulo="La creación de equipos llega en la Fase 2"
          detalle="Con tu sesión conectada (Discord o FACEIT) podrás fundar tu equipo, invitar a tu roster y llevar el historial competitivo compartido. Los equipos ya registrados en la red se listan en la Sala."
          cta={{ href: '/sala#equipos', texto: 'Ver equipos del roster' }}
        />
      </div>
    </HubSeccion>
  );
}
