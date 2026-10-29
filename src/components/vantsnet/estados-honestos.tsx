// Paneles de estados honestos: sin datos reales no se inventa nada.
// Se muestran motivos exactos (http_503, timeout, vacío) y qué hacer después.
import { AlertTriangle, Inbox } from 'lucide-react';

export function PanelVacio({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
      <Inbox className="mx-auto h-6 w-6 text-slate-600" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-slate-300">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{detalle}</p>
    </div>
  );
}

export function PanelError({
  titulo,
  motivo,
}: {
  titulo: string;
  motivo: string;
}) {
  const detalleHumano =
    motivo === 'timeout'
      ? 'La API viva tardó demasiado en responder (timeout de 8 s).'
      : motivo === 'red'
        ? 'No se pudo conectar con la API viva (error de red).'
        : motivo.startsWith('http_')
          ? `La API viva respondió con estado ${motivo.slice(5)}.`
          : `Motivo técnico: ${motivo}`;
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-6 text-center"
    >
      <AlertTriangle className="mx-auto h-6 w-6 text-rose-500" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-rose-200">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-rose-300/80">
        {detalleHumano} Es un estado honesto: no se muestran datos inventados.
      </p>
    </div>
  );
}
