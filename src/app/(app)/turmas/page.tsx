import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { enrollments, turmas, users } from "@/server/db/schema";
import { notInArray, eq, inArray, sql } from "drizzle-orm";
import { TurmasClient } from "./turmas-client";
import type { Role } from "@/lib/enums";

const HIDDEN_STATUSES = ["RASCUNHO", "CANCELADA"] as const;

export default async function TurmasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;

  const allTurmas = await db.query.turmas.findMany({
    with: { curso: true },
    ...(role !== "ORGANIZADOR" && {
      where: notInArray(turmas.status, [...HIDDEN_STATUSES]),
    }),
  });

  let result = allTurmas;

  // Profissionais só veem turmas para as quais são elegíveis
  if (role === "PROFISSIONAL") {
    const profissao =
      session.user.profissao ??
      (await db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { profissao: true } }))?.profissao;

    if (profissao) {
      result = result.filter((t) => {
        const profs = t.profissoesElegiveis as string[] | null;
        return Array.isArray(profs) && profs.includes(profissao);
      });
    }
  }

  // Inscrições abertas primeiro (por data ASC), depois o resto (por data ASC)
  result.sort((a, b) => {
    const aOpen = a.status === "INSCRICOES_ABERTAS" ? 0 : 1;
    const bOpen = b.status === "INSCRICOES_ABERTAS" ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return a.dataInicio.localeCompare(b.dataInicio);
  });

  /*
   * Ocupação de cada turma na própria lista. Sem isto, saber quais turmas
   * estão enchendo e quais estão vazias exigia abrir uma a uma.
   */
  const contagens = await db
    .select({
      turmaId: enrollments.turmaId,
      ocupando: sql<number>`count(*) filter (where ${enrollments.status} in ('INSCRITO','PROMOVIDO','CONFIRMADO','PRESENTE'))`,
      confirmados: sql<number>`count(*) filter (where ${enrollments.status} in ('CONFIRMADO','PRESENTE'))`,
      fila: sql<number>`count(*) filter (where ${enrollments.status} = 'FILA_ESPERA')`,
    })
    .from(enrollments)
    .where(
      inArray(
        enrollments.turmaId,
        result.length > 0 ? result.map((t) => t.id) : [""],
      ),
    )
    .groupBy(enrollments.turmaId);

  const porTurma = new Map(contagens.map((c) => [c.turmaId, c]));

  const comOcupacao = result.map((t) => {
    const c = porTurma.get(t.id);
    return {
      ...t,
      ocupando: Number(c?.ocupando ?? 0),
      confirmados: Number(c?.confirmados ?? 0),
      fila: Number(c?.fila ?? 0),
    };
  });

  return (
    <TurmasClient turmas={comOcupacao} role={session.user.role} />
  );
}
