import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROFISSAO_LABELS, type Profissao } from "@/lib/enums";

export default async function ProfissionaisPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
    redirect("/painel");
  }

  const allUsers = await db.query.users.findMany({
    where: (u, { eq }) => eq(u.role, "PROFISSIONAL"),
    with: {
      vinculos: {
        with: { unidade: true },
      },
    },
    orderBy: (u, { asc }) => [asc(u.nome)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Profissionais</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {allUsers.length} profissional(is) cadastrado(s)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Cadastrar
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Profissão</th>
              <th className="px-5 py-3 font-medium">Unidade(s)</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[var(--text-muted)]">
                  Nenhum profissional cadastrado
                </td>
              </tr>
            ) : (
              allUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">{u.nome}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {u.profissao
                      ? PROFISSAO_LABELS[u.profissao as Profissao]
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.vinculos.map((v) => (
                        <Badge key={v.id} variant="outline">
                          {v.unidade?.nome}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${u.ativo ? "bg-[var(--status-success)] text-white" : "bg-[var(--status-neutral)] text-white"}`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
