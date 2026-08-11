"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bell, CircleQuestionMark, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { EVENTO_TOUR } from "@/components/tour-painel";
import { apiFetch } from "@/lib/api-client";

export function Header({
  nome,
  role,
}: {
  nome: string | null;
  role: string;
}) {
  const { data: session } = useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiFetch<{ count: number }>("/api/notificacoes/unread")
      .then((data) => setUnread(data.count))
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-6">
      <div />

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
        <Button data-tour="notificacoes" variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--solid-orange)] text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
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
