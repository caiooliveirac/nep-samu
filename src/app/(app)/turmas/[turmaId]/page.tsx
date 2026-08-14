import { db } from "@/server/db";
import { turmas, enrollments, users } from "@/server/db/schema";
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

  // Não-organizadores não podem ver turmas RASCUNHO ou CANCELADA
  if (
    session.user.role !== "ORGANIZADOR" &&
    (turma.status === "RASCUNHO" || turma.status === "CANCELADA")
  ) {
    notFound();
  }

  // Profissionais não podem acessar turmas onde não são elegíveis
  if (session.user.role === "PROFISSIONAL") {
    const profissao =
      session.user.profissao ??
      (await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { profissao: true } }))?.profissao;
    const profs = turma.profissoesElegiveis as string[] | null;
    if (profissao && Array.isArray(profs) && !profs.includes(profissao)) {
      notFound();
    }
  }

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

  // O modal de inscrição confere nome completo e WhatsApp antes de inscrever.
  const eu = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { nome: true, telefone: true },
  });

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
      meusDados={{
        nome: eu?.nome ?? session.user.name ?? "",
        telefone: eu?.telefone ?? null,
      }}
    />
  );
}
