"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { CampoNovaSenha } from "@/components/campo-nova-senha";
import { Button } from "@/components/ui/button";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/NEP";

export default function RedefinirSenhaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [estado, setEstado] = useState<"checando" | "valido" | "invalido">(
    "checando",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BASE_PATH}/api/auth/password-reset/${token}`)
      .then((r) => setEstado(r.ok ? "valido" : "invalido"))
      .catch(() => setEstado("invalido"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const novaSenha = form.get("novaSenha") as string;

    if (novaSenha !== form.get("repetirSenha")) {
      toast.error("As duas senhas não são iguais.");
      return;
    }

    setLoading(true);
    const res = await fetch(`${BASE_PATH}/api/auth/password-reset/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: novaSenha }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error || "Não foi possível redefinir a senha.");
      return;
    }

    toast.success("Senha redefinida. Entre com a nova senha.");
    router.push("/login");
  }

  if (estado === "checando") {
    return (
      <AuthShell titulo="Redefinir senha" subtitulo="Conferindo o link...">
        <div />
      </AuthShell>
    );
  }

  if (estado === "invalido") {
    return (
      <AuthShell titulo="Link inválido" subtitulo="NEP SAMU">
        <div className="caixa-erro rounded-md p-3 text-sm">
          Este link é inválido ou já expirou. Peça um novo em &ldquo;Esqueci
          minha senha&rdquo;.
        </div>
        <Link
          href="/esqueci-senha"
          className="block text-center text-sm text-[var(--link)] hover:underline"
        >
          Pedir um novo link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell titulo="Escolha uma nova senha" subtitulo="NEP SAMU">
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoNovaSenha />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
