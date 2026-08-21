import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { vinculos } from "@/server/db/schema";
import { count } from "drizzle-orm";
import { UnidadesClient } from "./unidades-client";

export default async function UnidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  // Quantas pessoas estão cadastradas em cada unidade. A tela precisa saber
  // ANTES de a organizadora clicar em excluir: é o que transforma um erro
  // depois do clique num aviso antes dele.
  const [allUnidades, allMunicipios, pessoasPorUnidade] = await Promise.all([
    db.query.unidades.findMany({
      with: { municipio: true },
    }),
    db.query.municipios.findMany({
      where: (m, { eq }) => eq(m.ativo, true),
      orderBy: (m, { asc }) => [asc(m.nome)],
    }),
    db
      .select({ unidadeId: vinculos.unidadeId, total: count() })
      .from(vinculos)
      .groupBy(vinculos.unidadeId),
  ]);

  const pessoas = new Map(
    pessoasPorUnidade.map((l) => [l.unidadeId, Number(l.total)]),
  );

  return (
    <UnidadesClient
      unidades={allUnidades.map((u) => ({
        ...u,
        pessoas: pessoas.get(u.id) ?? 0,
      }))}
      municipios={allMunicipios.map((m) => ({ id: m.id, nome: m.nome }))}
    />
  );
}
