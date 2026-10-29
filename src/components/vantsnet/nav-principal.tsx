// NavPrincipal: navegación SALA · TORNEOS · CLIPS con mega menús (escritorio)
// y menú desplegable (móvil). Mantiene el puente con la SPA del hub (store Zustand):
// el logo vuelve a la búsqueda y "Competitivo" abre el hub competitivo.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Clapperboard,
  Gamepad2,
  Github,
  Menu,
  Radio,
  Swords,
  Trophy,
  Users,
  X,
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
  enlaces: EnlaceSeccion[];
}

const SECCIONES: Seccion[] = [
  {
    id: 'sala',
    etiqueta: 'SALA',
    href: '/sala',
    icono: Radio,
    descripcion: 'El centro de mando: quién está en vivo, jugadores y equipos.',
    enlaces: [
      { href: '/sala#envivo', titulo: 'En vivo', descripcion: 'Jugadores conectados ahora mismo' },
      { href: '/sala#jugadores', titulo: 'Jugadores', descripcion: 'Roster con rating VANTS' },
      { href: '/sala#equipos', titulo: 'Equipos', descripcion: 'Equipos registrados en la plataforma' },
    ],
  },
  {
    id: 'torneos',
    etiqueta: 'TORNEOS',
    href: '/torneos',
    icono: Trophy,
    descripcion: 'Competiciones de la red: calendario, inscritos y brackets.',
    enlaces: [
      { href: '/torneos#activos', titulo: 'Torneos', descripcion: 'Torneos abiertos y en curso' },
      { href: '/torneos#juegos', titulo: 'Por juego', descripcion: 'CS2 y VALORANT' },
    ],
  },
  {
    id: 'clips',
    etiqueta: 'CLIPS',
    href: '/clips',
    icono: Clapperboard,
    descripcion: 'La vitrina: las mejores jugadas de la comunidad.',
    enlaces: [
      { href: '/clips#destacados', titulo: 'Destacados', descripcion: 'Selección de la semana' },
    ],
  },
];

export function NavPrincipal() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState<string | null>(null); // mega menú escritorio
  const [menuMovil, setMenuMovil] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Cierra cualquier menú al cambiar de ruta
  useEffect(() => {
    setAbierto(null);
    setMenuMovil(false);
  }, [pathname]);

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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
      <nav ref={navRef} aria-label="Navegación principal" className="mx-auto max-w-4xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo → búsqueda (SPA) */}
          <Link
            href="/"
            onClick={() => irSpa('home')}
            className="flex items-center gap-2 text-lg font-black tracking-tight text-white"
            aria-label="VANTSNET — ir al buscador"
          >
            VANTS<span className="text-[#FF4655]">NET</span>
            <span className="hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:inline">
              valorant stats
            </span>
          </Link>

          {/* Secciones (escritorio) */}
          <div className="hidden items-center gap-1 md:flex">
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
                  <div className="flex items-center">
                    <Link
                      href={sec.href}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                        activa ? 'text-[#FF4655]' : 'text-slate-300 hover:text-white'
                      }`}
                      aria-current={activa ? 'page' : undefined}
                      aria-expanded={abierto === sec.id}
                      aria-haspopup="true"
                    >
                      <Icono className="h-3.5 w-3.5" />
                      {sec.etiqueta}
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${abierto === sec.id ? 'rotate-180' : ''}`}
                      />
                    </Link>
                  </div>

                  {/* Mega menú */}
                  {abierto === sec.id && (
                    <div
                      className="absolute left-0 top-full z-50 w-72 pt-2"
                      role="menu"
                      aria-label={`Menú de ${sec.etiqueta}`}
                    >
                      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
                        <p className="px-2 pb-2 text-[11px] leading-snug text-slate-400">
                          {sec.descripcion}
                        </p>
                        {sec.enlaces.map((en) => (
                          <Link
                            key={en.href}
                            href={en.href}
                            role="menuitem"
                            className="block rounded-lg px-2 py-2 transition-colors hover:bg-slate-800"
                          >
                            <span className="block text-sm font-semibold text-slate-100">{en.titulo}</span>
                            <span className="block text-[11px] leading-snug text-slate-500">
                              {en.descripcion}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Competitivo (SPA hub) */}
            <button
              onClick={() => irSpa('hub')}
              className="ml-2 flex items-center gap-1.5 rounded-full border border-[#FF4655]/40 bg-[#FF4655]/10 px-3 py-1 text-xs font-bold text-[#FF4655] transition-colors hover:bg-[#FF4655]/20"
            >
              <Swords className="h-3.5 w-3.5" /> Competitivo
            </button>

            <a
              href="https://github.com/feispla/VANTSnetwork"
              target="_blank"
              rel="noreferrer"
              className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-white"
              aria-label="Repositorio de VANTSNET en GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>

          {/* Botón móvil */}
          <button
            className="rounded-md p-2 text-slate-300 hover:text-white md:hidden"
            onClick={() => setMenuMovil((v) => !v)}
            aria-expanded={menuMovil}
            aria-controls="menu-movil"
            aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuMovil ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menú móvil */}
        {menuMovil && (
          <div id="menu-movil" className="border-t border-slate-800/80 py-3 md:hidden">
            {SECCIONES.map((sec) => {
              const Icono = sec.icono;
              return (
                <div key={sec.id} className="py-1">
                  <Link
                    href={sec.href}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold uppercase tracking-wider ${
                      esActiva(sec.href) ? 'text-[#FF4655]' : 'text-slate-200'
                    }`}
                  >
                    <Icono className="h-4 w-4" /> {sec.etiqueta}
                  </Link>
                  <div className="ml-6 border-l border-slate-800 pl-3">
                    {sec.enlaces.map((en) => (
                      <Link
                        key={en.href}
                        href={en.href}
                        className="block py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        {en.titulo}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => {
                irSpa('hub');
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-md border border-[#FF4655]/40 bg-[#FF4655]/10 px-3 py-2 text-sm font-bold text-[#FF4655]"
            >
              <Swords className="h-4 w-4" /> Competitivo
            </button>
            <a
              href="https://github.com/feispla/VANTSnetwork"
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:text-white"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}

// Iconos reexportados para las páginas de sección (coherencia visual)
export { Gamepad2, Radio, Trophy, Users };
