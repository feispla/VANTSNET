// /rankings — ranking competitivo (FASE 5). Solo métricas reales: el rating
// VANTS del roster ya existe en producción; las temporadas y gráficas de
// evolución llegan con la Fase 5. Sin estadísticas ficticias.
import { BarChart3 } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Rankings — VANTSNET',
  description: 'Ranking competitivo de la red VANTS: MMR, Elo, temporadas y rangos.',
};

export default function RankingsPage() {
  return (
    <HubSeccion
      icono={BarChart3}
      etiqueta="RANKINGS · PROGRESIÓN"
      titulo="Rankings"
      descripcion="Progresión competitiva de la red: MMR y Elo por juego, victorias,
        derrotas, winrate y K/D reales, ranking regional y global, temporadas y
        gráficas de evolución. Las integraciones (FACEIT, Riot) solo aportan
        métricas permitidas y verificables."
      fase={5}
      notaFuente="Estado honesto: el rating VANTS real ya existe en el roster de la Sala; las temporadas y gráficas de la preview llegan en la Fase 5."
    >
      <PanelFaseProxima
        titulo="Temporadas y evolución en la Fase 5"
        detalle="Cuando el ciclo torneos → matchmaking → resultado validado esté activo, cada partida alimentará tu MMR y tu posición en el ranking regional y global. Mientras tanto, consulta tu rating real del roster."
        cta={{ href: '/sala#jugadores', texto: 'Ver rating del roster' }}
      />
    </HubSeccion>
  );
}
