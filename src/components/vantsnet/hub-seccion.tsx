// HubSeccion: cabecera y chasis estándar para las secciones de la red.
// Identidad VANTSNET: carbón + grafito + rojo, tarjetas compactas.
// Toda sección nueva nace con estado honesto: nada de datos inventados.
import Link from 'next/link';
import { Construction, ArrowRight } from 'lucide-react';
import { AnimAparecer } from '@/components/vantsnet/motion';

interface Props {
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string; // nombre corto de sección (menú)
  titulo: string;
  descripcion: string;
  fase: number; // fase del plan de construcción
  notaFuente?: string; // de dónde salen los datos (honestidad)
  children?: React.ReactNode;
}

export function HubSeccion({
  icono: Icono,
  etiqueta,
  titulo,
  descripcion,
  fase,
  notaFuente,
  children,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {etiqueta}
        </p>
        <span className="flex items-center gap-1.5 rounded-full border border-[#FF4655]/30 bg-[#FF4655]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF4655]">
          <Construction className="h-3 w-3" aria-hidden /> Fase {fase} en construcción
        </span>
      </div>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-white">
        <Icono className="h-6 w-6 text-[#FF4655]" aria-hidden /> {titulo}
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">{descripcion}</p>
      {notaFuente && (
        <p className="mt-2 text-[11px] text-zinc-600">{notaFuente}</p>
      )}

      <AnimAparecer className="mt-8">{children}</AnimAparecer>
    </div>
  );
}

// Panel "módulo preparado, aún sin datos": honesto y con camino claro.
export function PanelFaseProxima({
  titulo,
  detalle,
  cta,
}: {
  titulo: string;
  detalle: string;
  cta?: { href: string; texto: string };
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
      <p className="text-sm font-semibold text-zinc-200">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">{detalle}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#FF4655]/40 bg-[#FF4655]/10 px-3 py-1.5 text-xs font-bold text-[#FF4655] transition-colors hover:bg-[#FF4655]/20"
        >
          {cta.texto} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
