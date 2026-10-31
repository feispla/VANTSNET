// /jugadores — directorio de jugadores. El roster real vive en /sala (API viva
// de producción, solo lectura). Esta página es la puerta del directorio y no
// duplica la fuente de datos: enlaza al roster y describe la Fase 2.
import { Users, Search, Link2, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Jugadores — VANTSNET',
  description: 'Directorio de jugadores de la red VANTS: perfiles, cuentas y equipos.',
};

const PERFILES = [
  { icono: Search, titulo: 'Identidad competitiva', texto: 'Riot ID, FACEIT, Steam, Discord y Twitch vinculados a tu perfil.' },
  { icono: Link2, titulo: 'Historial unificado', texto: 'Estadísticas reales por juego, equipo actual y próximas competiciones.' },
  { icono: Lock, titulo: 'Privacidad por diseño', texto: 'Sin correos, tokens ni IDs internos expuestos. Controles de visibilidad.' },
];

export default function JugadoresPage() {
  return (
    <HubSeccion
      icono={Users}
      etiqueta="PLAYERS · JUGADORES"
      titulo="Jugadores"
      descripcion="El directorio completo de la red: perfiles con cuentas vinculadas,
        equipo, insignias, historial y actividad pública. El roster con rating real
        ya está disponible en la Sala; el perfil extendido con privacidad llega en
        la Fase 2."
      fase={2}
      notaFuente="Estado honesto: esta página no duplica el roster. Fuente real: API viva de producción vía /sala (solo lectura)."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {PERFILES.map((p) => {
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
          titulo="El directorio extendido llega en la Fase 2"
          detalle="Perfiles con avatares, insignias destacadas, vinculación de cuentas y controles de privacidad. El roster con rating VANTS real ya está en la Sala."
          cta={{ href: '/sala#jugadores', texto: 'Abrir roster de jugadores' }}
        />
      </div>
    </HubSeccion>
  );
}
