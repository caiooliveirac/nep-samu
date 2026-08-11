import { redirect } from "next/navigation";
import { auth } from "@/server/auth/config";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* O papel vem daqui, do servidor: se o menu dependesse só do useSession,
          ele apareceria cortado a cada navegação enquanto a sessão carrega. */}
      <Sidebar role={session.user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header nome={session.user.name ?? null} role={session.user.role} />
        <main className="flex-1 overflow-y-auto bg-[var(--bg-primary)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
