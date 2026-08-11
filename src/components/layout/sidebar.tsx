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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useState } from "react";

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

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const role = session?.user?.role;

  const filteredItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] transition-all duration-200",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-[var(--sidebar-border)] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--samu-orange)] text-sm font-bold text-white">
          N
        </div>
        {!collapsed && (
          <span className="font-display text-base font-bold text-white">
            NEP SAMU
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-3">
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
        className="flex h-10 items-center justify-center border-t border-[var(--sidebar-border)] text-[var(--sidebar-muted-foreground)] hover:text-white transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
