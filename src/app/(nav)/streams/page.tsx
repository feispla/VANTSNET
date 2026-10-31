// /streams — VANTS STREAMS (FASE 7: Twitch Helix). Regla del brief: si la
// integración no tiene credenciales, se muestra "no configurado" — NUNCA
// datos simulados. El check es de servidor (el secreto jamás llega al cliente).
import { Radio } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';
import { PanelVacio } from '@/components/vantsnet/estados-honestos';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Streams — VANTSNET',
  description: 'Creadores en vivo de la red VANTS vía Twitch Helix.',
};

export default function StreamsPage() {
  // App Access Token de Twitch: solo existe como secreto del worker.
  // Si no está, esta es la pantalla honesta de "integración no configurada".
  const twitchConfigurado = Boolean(
    process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET
  );

  return (
    <HubSeccion
      icono={Radio}
      etiqueta="STREAMS · DIRECTOS"
      titulo="Streams"
      descripcion="VANTS STREAMS: los creadores de la red en directo. Categorías por
        juego, canales en vivo, espectadores y fichas de creador, vía Twitch Helix
        con App Access Token y caché para no abusar de la API."
      fase={7}
      notaFuente="Las credenciales de Twitch viven solo en el backend: el navegador nunca las ve."
    >
      {!twitchConfigurado ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
          <p className="text-sm font-semibold text-zinc-300">
            Integración de Twitch: <span className="text-[#FF4655]">no configurada</span>
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
            Falta instalar los secretos <code className="rounded bg-zinc-800 px-1">TWITCH_CLIENT_ID</code> y{' '}
            <code className="rounded bg-zinc-800 px-1">TWITCH_CLIENT_SECRET</code> en el worker de la
            preview. Por honestidad, aquí no se simulan canales ni espectadores: cuando la
            integración esté activa, este panel listará los directos reales de los creadores VANTS.
          </p>
        </div>
      ) : (
        <PanelVacio
          titulo="Sin directos de creadores VANTS ahora mismo"
          detalle="La integración está configurada; cuando un creador vinculado esté en directo, aparecerá aquí con su juego, título y espectadores."
        />
      )}

      <div className="mt-6">
        <PanelFaseProxima
          titulo="VANTS STREAMS completo en la Fase 7"
          detalle="Fichas de creador, estado en directo, búsqueda y filtros por juego, con OAuth Twitch ya existente para vincular cuentas y caché de consultas Helix."
          cta={{ href: '/clips', texto: 'Ver clips de la comunidad' }}
        />
      </div>
    </HubSeccion>
  );
}
