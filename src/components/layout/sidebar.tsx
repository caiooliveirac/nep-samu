"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Building2,
  Users,
  ShieldCheck,
  Bell,
  BarChart3,
  CircleUser,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: "Painel",
    href: "/painel",
    icon: LayoutDashboard,
  },
  {
    label: "Meu Perfil",
    href: "/perfil",
    icon: CircleUser,
  },
  {
    label: "Cursos",
    href: "/cursos",
    icon: BookOpen,
    roles: ["ORGANIZADOR"],
  },
  {
    label: "Turmas",
    href: "/turmas",
    icon: CalendarDays,
  },
  {
    label: "Unidades",
    href: "/unidades",
    icon: Building2,
    roles: ["ORGANIZADOR"],
  },
  {
    label: "Profissionais",
    href: "/profissionais",
    icon: Users,
    roles: ["ORGANIZADOR", "COORDENADOR"],
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: ShieldCheck,
    roles: ["ORGANIZADOR"],
  },
  {
    label: "Notificações",
    href: "/notificacoes",
    icon: Bell,
  },
  {
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    roles: ["ORGANIZADOR", "COORDENADOR"],
  },
];

/** O header dispara isto para abrir a gaveta no celular. */
export const EVENTO_MENU = "nep:alternar-menu";

export function Sidebar({ role: roleDoServidor }: { role: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [aberto, setAberto] = useState(false);
  // O papel do servidor manda; a sessão do cliente só serve para refletir uma
  // troca de papel sem recarregar a página. Sem esse fallback o menu encolhe a
  // cada navegação, enquanto o useSession ainda está carregando.
  const role = session?.user?.role ?? roleDoServidor;

  const filteredItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  useEffect(() => {
    const alternar = () => setAberto((a) => !a);
    window.addEventListener(EVENTO_MENU, alternar);
    return () => window.removeEventListener(EVENTO_MENU, alternar);
  }, []);

  return (
    <>
      {/* Fundo que fecha a gaveta; só existe no celular, com ela aberta. */}
      {aberto && (
        <button
          aria-label="Fechar menu"
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] transition-all duration-200",
          // No celular a barra sai do fluxo e desliza por cima: 224px fixos em
          // tela de 390 deixavam 166px para o conteúdo inteiro.
          "fixed inset-y-0 left-0 z-40 w-56 md:static md:z-auto md:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-56",
        )}
      >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-[var(--sidebar-border)] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--solid-orange)] text-sm font-bold text-white">
          N
        </div>
        {!collapsed && (
          <span className="font-display text-base font-bold text-white">
            NEP SAMU
          </span>
        )}
      </div>

      {/* Nav */}
      <nav data-tour="menu" className="flex-1 space-y-1 px-2 py-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-[var(--sidebar-accent)] text-white"
                  : "text-[var(--sidebar-muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
              // No celular a gaveta some ao escolher o destino; sem isto ela
              // fica por cima da página que acabou de abrir.
              onClick={() => setAberto(false)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expandir menu" : "Encolher menu"}
        className="hidden h-10 items-center justify-center border-t border-[var(--sidebar-border)] text-[var(--sidebar-muted-foreground)] transition-colors hover:text-white md:flex"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
      </aside>
    </>
  );
}
