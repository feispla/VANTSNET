// NavPrincipal: navegación global de VANTS COMPETITIVE NETWORK (FASE 1).
// Diez secciones del brief: HOME PLAY TORNEOS LIGAS EQUIPOS RANKINGS
// JUGADORES COMUNIDAD STREAMS INVENTARIO + "MÁS" para las rutas legacy
// (Sala, Clips, IA, Mi panel) — compatibilidad hacia atrás garantizada.
// Mantiene el puente con la SPA del hub (store Zustand) y los mega menús
// de escritorio + menú móvil.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Clapperboard,
  Gamepad2,
  Github,
  HeartHandshake,
  Medal,
  Menu,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  X,
  Backpack,
} from 'lucide-react';
import { useVantsnet } from '@/lib/store';

interface EnlaceSeccion {
  href: string;
  titulo: string;
  descripcion: string;
}

interface Seccion {
  id: string;
  etiqueta: string;
  href: string;
  icono: React.ComponentType<{ className?: string }>;
  descripcion: string;
  fase?: number; // fase del plan — muestra "en construcción" en el mega menú
  enlaces: EnlaceSeccion[];
}

// Secciones principales del brief (se muestran todas en escritorio).
const SECCIONES: Seccion[] = [
  {
    id: 'play',
    etiqueta: 'PLAY',
    href: '/play',
    icono: Gamepad2,
    descripcion: 'El centro de matchmaking: cola por región, ready check y salas.',
    fase: 4,
    enlaces: [
      { href: '/play', titulo: 'Matchmaking', descripcion: 'Elige juego, modo y entra en cola' },
      { href: '/sala#envivo', titulo: 'En vivo', descripcion: 'Quien está activo ahora mismo' },
    ],
  },
  {
    id: 'torneos',
    etiqueta: 'TORNEOS',
    href: '/torneos',
    icono: Trophy,
    descripcion: 'Competiciones de la red: calendario, inscritos y brackets.',
    enlaces: [
      { href: '/torneos#activos', titulo: 'Torneos', descripcion: 'Abiertos y en curso' },
      { href: '/torneos#juegos', titulo: 'Por juego', descripcion: 'CS2 y VALORANT' },
    ],
  },
  {
    id: 'ligas',
    etiqueta: 'LIGAS',
    href: '/ligas',
    icono: Medal,
    descripcion: 'Temporadas continuas con jornadas y ascensos.',
    fase: 3,
    enlaces: [
      { href: '/ligas', titulo: 'Ligas', descripcion: 'Sistema de ligas por temporada' },
      { href: '/torneos', titulo: 'Torneos', descripcion: 'Copias y torneos abiertos' },
    ],
  },
  {
    id: 'equipos',
    etiqueta: 'EQUIPOS',
    href: '/equipos',
    icono: Shield,
    descripcion: 'Crea tu equipo, gestiona roles y compite como roster.',
    fase: 2,
    enlaces: [
      { href: '/equipos', titulo: 'Equipos', descripcion: 'Creación, roles e invitaciones' },
      { href: '/sala#equipos', titulo: 'Roster de equipos', descripcion: 'Equipos registrados en la red' },
    ],
  },
  {
    id: 'rankings',
    etiqueta: 'RANKINGS',
    href: '/rankings',
    icono: BarChart3,
    descripcion: 'MMR, Elo, temporadas y evolución por juego.',
    fase: 5,
    enlaces: [
      { href: '/rankings', titulo: 'Rankings', descripcion: 'Regional y global' },
      { href: '/sala#jugadores', titulo: 'Rating del roster', descripcion: 'Rating VANTS real hoy' },
    ],
  },
  {
    id: 'jugadores',
    etiqueta: 'JUGADORES',
    href: '/jugadores',
    icono: Users,
    descripcion: 'Directorio de la red: perfiles, cuentas vinculadas e historial.',
    fase: 2,
    enlaces: [
      { href: '/jugadores', titulo: 'Jugadores', descripcion: 'Directorio extendido' },
      { href: '/sala#jugadores', titulo: 'Roster real', descripcion: 'Jugadores con rating hoy' },
    ],
  },
  {
    id: 'comunidad',
    etiqueta: 'COMUNIDAD',
    href: '/comunidad',
    icono: HeartHandshake,
    descripcion: 'Amigos, grupos, party y chat con moderación integrada.',
    fase: 2,
    enlaces: [
      { href: '/comunidad', titulo: 'Comunidad', descripcion: 'Sistema social de la red' },
      { href: '/clips', titulo: 'Clips', descripcion: 'Las mejores jugadas' },
    ],
  },
  {
    id: 'streams',
    etiqueta: 'STREAMS',
    href: '/streams',
    icono: Radio,
    descripcion: 'Creadores de la red en directo vía Twitch Helix.',
    fase: 7,
    enlaces: [
      { href: '/streams', titulo: 'Streams', descripcion: 'Directos de creadores VANTS' },
    ],
  },
  {
    id: 'inventario',
    etiqueta: 'INVENTARIO',
    href: '/inventario',
    icono: Backpack,
    descripcion: 'Insignias oficiales, marcos, fondos y cosméticos.',
    fase: 8,
    enlaces: [
      { href: '/inventario', titulo: 'Inventario', descripcion: 'Tu colección desbloqueable' },
    ],
  },
];

// Rutas legacy + personal, bajo "MÁS".
const MAS: Seccion = {
  id: 'mas',
  etiqueta: 'MÁS',
  href: '/panel',
  icono: User,
  descripcion: 'Rutas clásicas de VANTSNET y tu panel personal.',
  enlaces: [
    { href: '/sala', titulo: 'Sala', descripcion: 'El centro de mando: en vivo, roster y equipos' },
    { href: '/clips', titulo: 'Clips', descripcion: 'La vitrina de la comunidad' },
    { href: '/ia', titulo: 'IA Factory', descripcion: 'Agentes del cuartel y pulso del BUS' },
    { href: '/panel', titulo: 'Mi panel', descripcion: 'Tu identidad competitiva y accesos' },
  ],
};

export function NavPrincipal() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState<string | null>(null); // mega menú escritorio
  const [menuMovil, setMenuMovil] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Cierra cualquier menú al cambiar de ruta (patrón React: ajustar estado
  // durante el render al cambiar una prop — sin effect ni cascada extra).
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathnameAnterior !== pathname) {
    setPathnameAnterior(pathname);
    setAbierto(null);
    setMenuMovil(false);
  }

  // Escape cierra menus + click fuera cierra el mega menú
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(null);
        setMenuMovil(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setAbierto(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  const esActiva = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const irSpa = (vista: 'home' | 'hub') => {
    // El store sobrevive la navegación: al remontar /, page.tsx lee la vista ya fijada.
    useVantsnet.getState()[vista === 'home' ? 'goHome' : 'goHub']();
  };

  const renderMega = (sec: Seccion) => (
    <div
      className="absolute left-0 top-full z-50 w-72 pt-2"
      role="menu"
      aria-label={`Menú de ${sec.etiqueta}`}
    >
      <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur">
        <p className="px-2 pb-2 text-[11px] leading-snug text-zinc-400">{sec.descripcion}</p>
        {sec.enlaces.map((en) => (
          <Link
            key={en.href}
            href={en.href}
            role="menuitem"
            className="block rounded-lg px-2 py-2 transition-colors hover:bg-zinc-900"
          >
            <span className="block text-sm font-semibold text-zinc-100">{en.titulo}</span>
            <span className="block text-[11px] leading-snug text-zinc-500">{en.descripcion}</span>
          </Link>
        ))}
        {sec.fase && (
          <p className="mt-1 border-t border-zinc-800 px-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#FF4655]">
            Módulo en construcción · Fase {sec.fase}
          </p>
        )}
      </div>
    </div>
  );

  const claseItem = (activa: boolean) =>
    `flex items-center gap-1 rounded px-1.5 py-1.5 text-[10px] xl:text-[11px] font-bold uppercase tracking-wider transition-colors ${
      activa ? 'text-[#FF4655]' : 'text-zinc-300 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#0B0B0F]/90 backdrop-blur">
      <nav aria-label="Navegación principal" className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo → búsqueda (SPA) */}
          <Link
            href="/"
            onClick={() => irSpa('home')}
            className="flex shrink-0 items-center gap-2 text-lg font-black tracking-tight text-white"
            aria-label="VANTSNET — ir al inicio"
          >
            VANTS<span className="text-[#FF4655]">NET</span>
          </Link>

          {/* Secciones (escritorio) */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {SECCIONES.map((sec) => {
              const Icono = sec.icono;
              const activa = esActiva(sec.href);
              return (
                <div
                  key={sec.id}
                  className="relative"
                  onMouseEnter={() => setAbierto(sec.id)}
                  onMouseLeave={() => setAbierto((a) => (a === sec.id ? null : a))}
                >
                  <Link
                    href={sec.href}
                    className={claseItem(activa)}
                    aria-current={activa ? 'page' : undefined}
                    aria-haspopup={sec.enlaces.length > 1 ? 'true' : undefined}
                    aria-expanded={sec.enlaces.length > 1 ? abierto === sec.id : undefined}
                  >
                    <Icono className="h-3.5 w-3.5" aria-hidden />
                    <span className="hidden xl:inline">{sec.etiqueta}</span>
                  </Link>
                  {abierto === sec.id && sec.enlaces.length > 1 && renderMega(sec)}
                </div>
              );
            })}

            {/* MÁS (legacy + panel) */}
            <div
              className="relative"
              onMouseEnter={() => setAbierto('mas')}
              onMouseLeave={() => setAbierto((a) => (a === 'mas' ? null : a))}
            >
              <button
                type="button"
                className={claseItem(esActiva('/panel'))}
                aria-expanded={abierto === 'mas'}
                aria-haspopup="true"
              >
                MÁS <ChevronDown className={`h-3 w-3 transition-transform ${abierto === 'mas' ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {abierto === 'mas' && renderMega(MAS)}
            </div>

            {/* Competitivo (SPA hub) */}
            <button
              onClick={() => irSpa('hub')}
              className="ml-1.5 flex shrink-0 items-center gap-1.5 rounded-full border border-[#FF4655]/40 bg-[#FF4655]/10 px-2.5 py-1 text-[10px] font-bold text-[#FF4655] transition-colors hover:bg-[#FF4655]/20"
            >
              <Swords className="h-3 w-3" aria-hidden /> ESTADÍSTICAS
            </button>

            <a
              href="https://github.com/feispla/Vantsnet"
              target="_blank"
              rel="noreferrer"
              className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
              aria-label="Repositorio de VANTSNET en GitHub"
            >
              <Github className="h-4 w-4" aria-hidden />
            </a>
          </div>

          {/* Botón móvil */}
          <button
            className="rounded-md p-2 text-zinc-300 hover:text-white lg:hidden"
            onClick={() => setMenuMovil((v) => !v)}
            aria-expanded={menuMovil}
            aria-controls="menu-movil"
            aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuMovil ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>

        {/* Menú móvil */}
        {menuMovil && (
          <div id="menu-movil" className="max-h-[70vh] overflow-y-auto border-t border-zinc-800/80 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-1.5">
              {SECCIONES.map((sec) => {
                const Icono = sec.icono;
                return (
                  <Link
                    key={sec.id}
                    href={sec.href}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold uppercase tracking-wider ${
                      esActiva(sec.href)
                        ? 'border-[#FF4655]/40 bg-[#FF4655]/10 text-[#FF4655]'
                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-200'
                    }`}
                  >
                    <Icono className="h-4 w-4 shrink-0" aria-hidden /> {sec.etiqueta}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 border-t border-zinc-800 pt-3">
              {MAS.enlaces.map((en) => (
                <Link
                  key={en.href}
                  href={en.href}
                  className="block rounded-md px-2 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
                >
                  {en.titulo}
                </Link>
              ))}
              <button
                onClick={() => irSpa('hub')}
                className="mt-2 flex w-full items-center gap-2 rounded-md border border-[#FF4655]/40 bg-[#FF4655]/10 px-3 py-2 text-sm font-bold text-[#FF4655]"
              >
                <Swords className="h-4 w-4" aria-hidden /> Estadísticas
              </button>
              <a
                href="https://github.com/feispla/Vantsnet"
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:text-white"
              >
                <Github className="h-4 w-4" aria-hidden /> GitHub
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

// Iconos reexportados para las páginas de sección (coherencia visual)
export { Gamepad2, Radio, Trophy, Users, Sparkles, Clapperboard };
