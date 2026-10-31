// /ligas — ligas de la red (FASE 3: nace con el Tournament Center).
import { Medal } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Ligas — VANTSNET',
  description: 'Ligas competitivas de la red VANTS: temporadas, jornadas y ascensos.',
};

export default function LigasPage() {
  return (
    <HubSeccion
      icono={Medal}
      etiqueta="LEAGUES · LIGAS"
      titulo="Ligas"
      descripcion="Competición continua por temporadas: jornadas regulares, ascensos de
        división y descensos. Las ligas comparten motor de torneos, ranking y logros,
        con los mismos eventos en VANTS-BUS."
      fase={3}
      notaFuente="Estado honesto: aún no hay ligas creadas. No se muestran datos de relleno."
    >
      <PanelFaseProxima
        titulo="El sistema de ligas llega con el Tournament Center (Fase 3)"
        detalle="Primero el motor de torneos y brackets; encima, temporadas de liga con jornadas y división por nivel. Cuando una liga se abra, verás aquí su calendario, clasificación y historial de campeones."
        cta={{ href: '/torneos', texto: 'Ver torneos activos' }}
      />
    </HubSeccion>
  );
}
