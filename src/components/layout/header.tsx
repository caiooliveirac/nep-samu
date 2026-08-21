"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CircleQuestionMark, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { EVENTO_TOUR } from "@/components/tour-painel";
import { EVENTO_MENU } from "@/components/layout/sidebar";
import { apiFetch } from "@/lib/api-client";

export function Header({
  nome,
  role,
}: {
  nome: string | null;
  role: string;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Refaz a contagem a cada navegação: a página de notificações marca tudo
  // como lido ao abrir, então ao sair dela a resposta já vem zerada.
  useEffect(() => {
    apiFetch<{ count: number }>("/api/notificacoes/unread")
      .then((data) => setUnread(data.count))
      .catch(() => {});
  }, [pathname]);

  // Estando na própria lista, o aviso não tem o que avisar.
  const temNovas = unread > 0 && pathname !== "/notificacoes";

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        className="md:hidden"
        onClick={() => window.dispatchEvent(new Event(EVENTO_MENU))}
      >
        <Menu className="h-4 w-4" />
      </Button>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Rever o tutorial do painel"
          title="Rever o tutorial"
          onClick={() => window.dispatchEvent(new Event(EVENTO_TOUR))}
        >
          <CircleQuestionMark className="h-4 w-4" />
        </Button>

        <span data-tour="tema">
          <ThemeToggle />
        </span>

        {/* Notification bell */}
        <Button
          data-tour="notificacoes"
          asChild
          variant="ghost"
          size="icon"
          className="relative"
        >
          {/* Sem prefetch: abrir a página marca tudo como lido, e isso não
              pode acontecer só porque o mouse passou por cima. */}
          <Link
            prefetch={false}
            href="/notificacoes"
            aria-label={temNovas ? "Notificações não lidas" : "Notificações"}
          >
            <Bell className="h-4 w-4" />
            {/* Ponto, não contador: avisa que há algo novo e some assim que a
                pessoa abre a lista. */}
            {temNovas && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--solid-orange)]" />
            )}
          </Link>
        </Button>

        {/* User */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
            <User className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {session?.user?.name ?? nome ?? "Usuário"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {session?.user?.role ?? role}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
