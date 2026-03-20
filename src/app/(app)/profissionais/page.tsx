import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { ProfissionaisClient } from "./profissionais-client";

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
        with: { unidade: { with: { municipio: true } } },
      },
    },
    orderBy: (u, { asc }) => [asc(u.nome)],
  });

  // Get all unidades for filter dropdown
  const allUnidades = await db.query.unidades.findMany({
    with: { municipio: true },
    orderBy: (u, { asc }) => [asc(u.nome)],
  });

  return (
    <ProfissionaisClient
      profissionais={allUsers}
      unidades={allUnidades}
    />
  );
}
