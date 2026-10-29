// Layout del grupo (nav): cabecera con mega menús + contenido + pie.
// Compartido por / (SPA), /sala, /torneos y /clips.
import { NavPrincipal } from '@/components/vantsnet/nav-principal';
import { PieVantsnet } from '@/components/vantsnet/pie-vantsnet';

export default function NavLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1120] text-slate-100">
      <NavPrincipal />
      <main className="flex flex-1 flex-col">{children}</main>
      <PieVantsnet />
    </div>
  );
}
