import { db } from "@/server/db";
import { turmas, enrollments } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { redirect, notFound } from "next/navigation";
import { eq, and, sql, inArray } from "drizzle-orm";
import { TurmaDetail } from "./turma-detail";
import { isValidUUID } from "@/lib/schemas";

export default async function TurmaDetailPage({
  params,
}: {
  params: Promise<{ turmaId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { turmaId } = await params;
  if (!isValidUUID(turmaId)) notFound();

  const turma = await db.query.turmas.findFirst({
    where: eq(turmas.id, turmaId),
    with: {
      curso: true,
      cotas: { with: { unidade: true } },
      enrollments: {
        with: { user: true, unidade: true },
      },
    },
  });

  if (!turma) redirect("/turmas");

  const [inscritosCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.turmaId, turmaId),
        inArray(enrollments.status, [
          "INSCRITO",
          "PROMOVIDO",
          "CONFIRMADO",
          "PRESENTE",
        ]),
      ),
    );

  const [confirmadosCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.turmaId, turmaId),
        inArray(enrollments.status, ["CONFIRMADO", "PRESENTE"]),
      ),
    );

  const [filaCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.turmaId, turmaId),
        eq(enrollments.status, "FILA_ESPERA"),
      ),
    );

  // Verificar se o profissional já está inscrito
  const myEnrollment = session.user.role === "PROFISSIONAL"
    ? await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.turmaId, turmaId),
          eq(enrollments.userId, session.user.id),
        ),
      })
    : null;

  return (
    <TurmaDetail
      turma={{
        ...turma,
        enrollments: turma.enrollments.map((e) => ({
          ...e,
          user: { id: e.user.id, nome: e.user.nome, email: e.user.email, profissao: e.user.profissao },
        })),
      }}
      metrics={{
        inscritos: Number(inscritosCount.count),
        confirmados: Number(confirmadosCount.count),
        filaEspera: Number(filaCount.count),
      }}
      userRole={session.user.role as string}
      userId={session.user.id}
      myEnrollment={myEnrollment ?? null}
    />
  );
}
