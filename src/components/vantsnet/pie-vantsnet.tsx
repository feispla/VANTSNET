// Pie compartido de todas las páginas con navegación.
// 'use client' porque muestra el estado de la API key del store de la SPA.
'use client';

import { useVantsnet } from '@/lib/store';

export function PieVantsnet() {
  const apiKey = useVantsnet((s) => s.apiKey);
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-[#0B1120] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-slate-500">
          <span className="font-bold text-slate-400">VANTSNET</span> · Prototipo de red de estadísticas gaming
        </p>
        <p className="text-[11px] leading-relaxed text-slate-600">
          No afiliado a Riot Games. Datos: API oficial de Valorant + API viva VANTS (solo lectura).
          {apiKey ? ' Clave de developer activa.' : ' Modo demo disponible.'}
        </p>
      </div>
    </footer>
  );
}
