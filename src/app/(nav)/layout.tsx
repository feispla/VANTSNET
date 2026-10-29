// Layout del grupo (nav): cabecera con mega menús + contenido + pie.
// Compartido por / (SPA), /sala, /torneos, /clips y /ia.
// El ProveedorMovimiento honra prefers-reduced-motion a nivel global.
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
      <div className="flex min-h-screen flex-col bg-[#0B1120] text-slate-100">
        <NavPrincipal />
        <main className="flex flex-1 flex-col">{children}</main>
        <PieVantsnet />
      </div>
    </ProveedorMovimiento>
  );
}
