import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function UnidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  const allUnidades = await db.query.unidades.findMany({
    with: { municipio: true },
    orderBy: (u, { asc }) => [asc(u.nome)],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Unidades</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {allUnidades.length} unidade(s) cadastrada(s)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Município</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {allUnidades.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[var(--text-muted)]">
                  Nenhuma unidade cadastrada
                </td>
              </tr>
            ) : (
              allUnidades.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">{u.nome}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {u.tipo}
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {u.municipio?.nome || "—"}
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
