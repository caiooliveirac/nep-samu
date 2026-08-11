"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { CampoNovaSenha } from "@/components/campo-nova-senha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/NEP";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const novaSenha = form.get("novaSenha") as string;

    if (novaSenha !== form.get("repetirSenha")) {
      toast.error("As duas senhas não são iguais.");
      return;
    }

    setLoading(true);
    const res = await fetch(`${BASE_PATH}/api/auth/trocar-senha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senhaAtual: form.get("senhaAtual"),
        novaSenha,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error || "Não foi possível trocar a senha.");
      return;
    }

    // Sem este update() o JWT continuaria marcando "precisa trocar" e o
    // middleware devolveria a pessoa para esta mesma tela.
    await update();
    toast.success("Senha trocada.");
    router.push("/painel");
  }

  return (
    <AuthShell
      titulo="Troque sua senha"
      subtitulo="Sua senha atual é provisória"
    >
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-secondary)]">
        Escolha uma senha só sua para continuar. Enquanto isso não for feito, o
        resto do sistema fica indisponível.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="senhaAtual">Senha provisória</Label>
          <Input
            id="senhaAtual"
            name="senhaAtual"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <CampoNovaSenha />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
