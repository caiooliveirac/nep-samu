"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Troca claro/escuro. Qual ícone aparece é decidido por CSS a partir da classe
 * que o next-themes põe no <html> — sem estado de "montado", sem trocar o ícone
 * depois da hidratação.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Alternar entre tema claro e escuro"
      title="Alternar tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="[.light_&]:hidden" />
      <Moon className="hidden [.light_&]:block" />
    </Button>
  );
}
