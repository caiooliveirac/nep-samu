import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
    redirect("/painel");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Análises e exportações de dados — nenhum relatório foi implementado
          ainda; a lista abaixo é o que está planejado.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Ocupação por Turma",
            description: "Visualize a taxa de ocupação e fila de espera",
          },
          {
            title: "Inscrições por Unidade",
            description: "Ranking de inscrições por unidade de saúde",
          },
          {
            title: "Inscrições por Profissão",
            description: "Distribuição de inscrições por categoria profissional",
          },
          {
            title: "Taxa de Confirmação",
            description: "Percentual de confirmações por turma",
          },
          {
            title: "No-show Rate",
            description: "Taxa de ausência por turma",
          },
          {
            title: "Cotas Ociosas",
            description: "Unidades com vagas não preenchidas",
          },
        ].map((report) => (
          <div
            key={report.title}
            className="rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)] p-5"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="inline-flex rounded-md bg-[var(--bg-tertiary)] p-2">
                <BarChart3 className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
              <span className="rounded border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Em breve
              </span>
            </div>
            <h3 className="font-display text-sm font-semibold">
              {report.title}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {report.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
