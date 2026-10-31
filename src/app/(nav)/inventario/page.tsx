// /inventario — colección y personalización (FASE 8). Los cosméticos no
// llevan valor monetario y no existen cajas aleatorias: colección basada en
// logros reales del motor de insignias VANTS.
import { Backpack, BadgeCheck, Image, Palette } from 'lucide-react';
import type { Metadata } from 'next';
import { HubSeccion, PanelFaseProxima } from '@/components/vantsnet/hub-seccion';

export const metadata: Metadata = {
  title: 'Inventario — VANTSNET',
  description: 'Colección de insignias, marcos, fondos y cosméticos de tu perfil VANTS.',
};

const PIEZAS = [
  { icono: BadgeCheck, titulo: 'Colección de insignias', texto: 'Las 12 insignias oficiales VANTS, desbloqueadas con evidencia real.' },
  { icono: Image, titulo: 'Marcos y fondos', texto: 'Personaliza tu perfil con elementos desbloqueables.' },
  { icono: Palette, titulo: 'Avatar', texto: 'Tu cara frente a la red, con variantes premium de membresía.' },
  { icono: Backpack, titulo: 'Objetos cosméticos', texto: 'Premios por logros y eventos — sin cajas aleatorias de pago.' },
];

export default function InventarioPage() {
  return (
    <HubSeccion
      icono={Backpack}
      etiqueta="INVENTORY · INVENTARIO"
      titulo="Inventario"
      descripcion="Tu colección: insignias oficiales, marcos de perfil, fondos, avatar
        y objetos cosméticos desbloqueables. Todo se gana compitiendo — el motor de
        logros conecta torneos, rankings y membresías para concederlo con evidencia."
      fase={8}
      notaFuente="Sin valor monetario atribuido a objetos ni cajas aleatorias: colección por logros, no por pago."
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
          titulo="La colección se abre en la Fase 8"
          detalle="Las insignias oficiales VANTS (MEMBER, PLUS, PRO, ELITE, CREATOR, PARTNER, CHAMPION, TOP 10, RISING STAR, VETERAN, FOUNDER, VERIFIED) se mostrarán desde R2 con variantes optimizadas y progreso por insignia."
          cta={{ href: '/panel', texto: 'Ir a mi panel' }}
        />
      </div>
    </HubSeccion>
  );
}
