import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { UnidadesClient } from "./unidades-client";

export default async function UnidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ORGANIZADOR") redirect("/painel");

  const [allUnidades, allMunicipios] = await Promise.all([
    db.query.unidades.findMany({
      with: { municipio: true },
    }),
    db.query.municipios.findMany({
      where: (m, { eq }) => eq(m.ativo, true),
      orderBy: (m, { asc }) => [asc(m.nome)],
    }),
  ]);

  return (
    <UnidadesClient
      unidades={allUnidades}
      municipios={allMunicipios.map((m) => ({ id: m.id, nome: m.nome }))}
    />
  );
}
