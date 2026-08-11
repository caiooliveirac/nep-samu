"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/painel";
  const authError = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Credenciais inválidas");
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm space-y-6 p-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--samu-orange)]">
            <span className="font-display text-2xl font-bold text-white">
              N
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            NEP SAMU
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Núcleo de Ensino Permanente
          </p>
        </div>

        {/* Form */}
        {authError && (
          <div className="rounded-md bg-red-900/30 border border-red-700/50 p-3 text-sm text-red-300">
            Erro de autenticação. Tente novamente.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <Link
          href="/esqueci-senha"
          className="block text-center text-sm text-[var(--samu-orange)] hover:underline"
        >
          Esqueci minha senha
        </Link>

        <p className="text-center text-xs text-[var(--text-muted)]">
          SAMU — Regional Metropolitana de Salvador
        </p>
      </div>
    </div>
  );
}
