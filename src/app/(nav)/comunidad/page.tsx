// /comunidad — amigos, grupos y chat (FASE 2). Con moderación integrada
// desde el diseño: límites de envío, bloqueo y privacidad. Sin spam.
import { HeartHandshake, MessagesSquare, Ban, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Comunidad — VANTSNET',
  description: 'Amigos, grupos y partidas de la comunidad VANTS.',
};

const PIEZAS = [
  { icono: HeartHandshake, titulo: 'Amigos y solicitudes', texto: 'Solicitudes con límite, invitaciones a partidos y bloqueos.' },
  { icono: MessagesSquare, titulo: 'Grupos y party', texto: 'Crea tu grupo, monta party y entra junto a la cola de matchmaking.' },
  { icono: Ban, titulo: 'Moderación integrada', texto: 'Límites de envío, bloqueo, control de privacidad y herramientas de gestión.' },
  { icono: ShieldAlert, titulo: 'Sin spam', texto: 'Invitaciones con tope y tasa limitada: nadie bombardea a nadie.' },
];

export default function ComunidadPage() {
  return (
    <HubSeccion
      icono={HeartHandshake}
      etiqueta="COMMUNITY · COMUNIDAD"
      titulo="Comunidad"
      descripcion="El tejido social de la red: amigos, solicitudes, grupos, party system
        y chat. Toda interacción social nace con moderación y límites desde el
        primer día — no se permiten invitaciones ilimitadas ni spam."
      fase={2}
      notaFuente="Estado honesto: el sistema social se activa en la Fase 2 junto con las identidades competitivas."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {PIEZAS.map((p) => {
          const Icono = p.icono;
          return (
            <div key={p.titulo} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <Icono className="h-5 w-5 text-[#FF4655]" aria-hidden />
              <h2 className="mt-2 text-sm font-bold text-zinc-100">{p.titulo}</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{p.texto}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6">
        <PanelFaseProxima
          titulo="El sistema social llega en la Fase 2"
          detalle="Cuando tu perfil competitivo esté activo podrás añadir amigos, crear grupos y montar party para entrar juntos en la cola."
          cta={{ href: '/panel', texto: 'Preparar mi perfil' }}
        />
      </div>
    </HubSeccion>
  );
}
