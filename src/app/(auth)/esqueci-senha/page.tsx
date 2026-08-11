"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/NEP";

export default function EsqueciSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const email = new FormData(e.currentTarget).get("email") as string;
    await fetch(`${BASE_PATH}/api/auth/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    // Resposta única, dê o email que der: a tela não conta quem tem conta aqui.
    setLoading(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <AuthShell
        titulo="Verifique seu email"
        subtitulo="Se existir uma conta com esse endereço"
      >
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          Enviamos um link para escolher uma nova senha. Ele vale por 2 horas.
          Não chegou? Confira a caixa de spam e o endereço digitado.
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-[var(--link)] hover:underline"
        >
          Voltar para o login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Esqueci minha senha" subtitulo="NEP SAMU">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email da sua conta</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Enviando..." : "Enviar link de redefinição"}
        </Button>
      </form>

      <Link
        href="/login"
        className="block text-center text-sm text-[var(--link)] hover:underline"
      >
        Voltar para o login
      </Link>
    </AuthShell>
  );
}
