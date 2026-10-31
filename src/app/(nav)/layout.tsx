// Layout del grupo (nav): cabecera con navegación global (10 secciones)
// + contenido + pie. Compartido por / (SPA), /sala, /torneos, /clips, /ia
// y las secciones nuevas (play, ligas, equipos, rankings, jugadores,
// comunidad, streams, inventario, panel).
// El ProveedorMovimiento honra prefers-reduced-motion a nivel global.
// Paleta VANTS COMPETITIVE NETWORK: carbón #0B0B0F · grafito · rojo VANTS.
import { NavPrincipal } from '@/components/vantsnet/nav-principal';
import { PieVantsnet } from '@/components/vantsnet/pie-vantsnet';
import { ProveedorMovimiento } from '@/components/vantsnet/motion';

export default function NavLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProveedorMovimiento>
      <div className="flex min-h-screen flex-col bg-[#0B0B0F] text-zinc-100">
        <NavPrincipal />
        <main className="flex flex-1 flex-col">{children}</main>
        <PieVantsnet />
      </div>
    </ProveedorMovimiento>
  );
}
