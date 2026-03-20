import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ProfissionalDetail } from "./profissional-detail";

export default async function ProfissionalPage({
  params,
}: {
  params: Promise<{ profissionalId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
    redirect("/painel");
  }

  const { profissionalId } = await params;

  const profissional = await db.query.users.findFirst({
    where: eq(users.id, profissionalId),
    columns: { passwordHash: false },
    with: {
      vinculos: {
        with: {
          unidade: { with: { municipio: true } },
        },
      },
      enrollments: {
        with: {
          turma: { with: { curso: true } },
          unidade: true,
        },
        orderBy: (e, { desc }) => [desc(e.inscritoEm)],
      },
    },
  });

  if (!profissional || profissional.role !== "PROFISSIONAL") {
    redirect("/profissionais");
  }

  const allUnidades = await db.query.unidades.findMany({
    with: { municipio: true },
    orderBy: (u, { asc }) => [asc(u.nome)],
  });

  // Get turmas with open enrollment for the "enroll" action
  const turmasAbertas = await db.query.turmas.findMany({
    where: (t, { inArray }) =>
      inArray(t.status, ["INSCRICOES_ABERTAS", "LOTADA"]),
    with: { curso: true },
    orderBy: (t, { asc }) => [asc(t.dataInicio)],
  });

  return (
    <ProfissionalDetail
      profissional={profissional}
      unidades={allUnidades}
      turmasAbertas={turmasAbertas}
    />
  );
}
