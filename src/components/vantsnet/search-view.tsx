'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, KeyRound, ChevronDown, ExternalLink, Database } from 'lucide-react';
import { useVantsnet } from '@/lib/store';

const REGIONS = [
  { value: 'europe', label: 'Europa' },
  { value: 'americas', label: 'América' },
  { value: 'asia', label: 'Asia' },
];

export function SearchView() {
  const search = useVantsnet((s) => s.search);
  const apiKey = useVantsnet((s) => s.apiKey);
  const [riotId, setRiotId] = useState('');
  const [region, setRegion] = useState('europe');

  const canSearch = riotId.includes('#') && riotId.length >= 3;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <span className="inline-block rounded-full border border-[#FF4655]/40 bg-[#FF4655]/10 px-4 py-1 text-xs font-bold tracking-widest text-[#FF4655]">
            PROTOTIPO · FASE 3 DEL ROADMAP
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
            VANTS<span className="text-[#FF4655]">NET</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
            Estadísticas de Valorant con la API oficial de Riot Games: perfiles,
            historial de partidas y scoreboard completo. Un solo backend, pronto toda una red multi-juego.
          </p>
        </div>

        {/* Buscador */}
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSearch) search(riotId.trim(), region);
          }}
        >
          <Input
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="Nombre#TAG — ej: Demo#VANTS"
            className="h-12 flex-1 border-slate-700 bg-slate-900/80 text-base text-white placeholder:text-slate-500 focus-visible:ring-[#FF4655]/60"
            aria-label="Riot ID del jugador"
          />
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="h-12 w-full border-slate-700 bg-slate-900/80 text-white sm:w-36" aria-label="Región">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900 text-white">
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            disabled={!canSearch}
            className="h-12 bg-[#FF4655] px-6 font-bold text-white hover:bg-[#e63a49]"
          >
            <Search className="mr-2 h-4 w-4" /> Buscar
          </Button>
        </form>

        {/* Acciones rápidas */}
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => search('Demo#VANTS', 'europe')}
            className="w-full border-emerald-600/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 sm:w-auto"
          >
            <Database className="mr-2 h-4 w-4" /> Ver demo sin API key
          </Button>
          <ApiKeyDialog />
        </div>

        {apiKey && (
          <p className="mt-3 text-xs text-emerald-400">✔ API key configurada — puedes buscar jugadores reales</p>
        )}

        {/* Cómo obtener la clave */}
        <details className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-200">
            <ChevronDown className="h-4 w-4 text-slate-400" />
            ¿Cómo obtengo mi API key de Riot? (gratis)
          </summary>
          <ol className="mt-3 space-y-2 pl-4 text-sm text-slate-400">
            <li>
              <span className="font-semibold text-slate-200">1.</span> Entra en{' '}
              <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer" className="text-[#FF4655] underline decoration-[#FF4655]/40 hover:decoration-[#FF4655]">
                developer.riotgames.com <ExternalLink className="inline h-3 w-3" />
              </a>{' '}
              con tu cuenta de Riot.
            </li>
            <li>
              <span className="font-semibold text-slate-200">2.</span> En el Dashboard, pulsa <em>&ldquo;GENERATE API KEY&rdquo;</em> (clave de desarrollo, se renueva cada 24 h).
            </li>
            <li>
              <span className="font-semibold text-slate-200">3.</span> Copia la clave <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">RGAPI-...</code> y pégala en el botón <em>API key</em> de arriba. Se guarda solo en tu navegador.
            </li>
            <li>
              <span className="font-semibold text-slate-200">4.</span> Límites de la clave de desarrollo: 20 req/s y 100 req/2 min (la plataforma cachea partidas en su base de datos).
            </li>
            <li>
              <span className="font-semibold text-slate-200">5.</span>{' '}
              <span className="text-amber-300">Política de Riot:</span> las claves de desarrollo ya <span className="font-semibold text-slate-200">no incluyen datos de partidas de Valorant</span> — solo permiten verificar cuentas (account-v1). Los datos reales de partidas requieren una <span className="font-semibold text-slate-200">clave de producción</span>; este prototipo sirve como evidencia para solicitarla. El modo demo sigue operativo.
            </li>
          </ol>
        </details>

        {/* Qué muestra la plataforma */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
          {[
            ['KDA y ACS', 'por partida y agregado'],
            ['Winrate', 'con agentes jugados'],
            ['HS %', 'precisión de tiro'],
            ['Scoreboard', 'los 10 jugadores'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-sm font-bold text-white">{t}</div>
              <div className="mt-0.5 text-xs text-slate-500">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiKeyDialog() {
  const apiKey = useVantsnet((s) => s.apiKey);
  const setApiKey = useVantsnet((s) => s.setApiKey);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(apiKey); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white sm:w-auto"
        >
          <KeyRound className="mr-2 h-4 w-4" /> API key {apiKey ? '(configurada)' : ''}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar API key de Riot</DialogTitle>
          <DialogDescription className="text-slate-400">
            Pega tu clave de desarrollo (RGAPI-...). Se guarda únicamente en tu navegador
            (localStorage) y se envía solo al backend de esta plataforma para llamar a la API oficial.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="border-slate-700 bg-slate-800 font-mono text-sm text-white placeholder:text-slate-500"
        />
        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => { setApiKey(''); setOpen(false); }}
            className="text-slate-400 hover:text-white"
          >
            Borrar
          </Button>
          <Button onClick={() => { setApiKey(value.trim()); setOpen(false); }} className="bg-[#FF4655] font-bold text-white hover:bg-[#e63a49]">
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
