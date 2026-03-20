import { db } from "@/server/db";
import {
  enrollments,
  turmas,
  users,
  vinculos,
  cotas,
  turmasMunicipios,
  turmasUnidades,
  unidades,
} from "@/server/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { ConflictError, ValidationError, NotFoundError } from "@/server/lib/errors";
import { logAudit } from "./audit.service";

interface EnrollmentInput {
  turmaId: string;
  userId: string;
  unidadeId: string;
}

export async function createEnrollment(
  input: EnrollmentInput,
  actorId: string,
) {
  const turma = await db.query.turmas.findFirst({
    where: eq(turmas.id, input.turmaId),
  });

  if (!turma) throw new NotFoundError("Turma");

  // 1. Turma deve estar com inscrições abertas ou lotada (fila de espera)
  if (
    turma.status !== "INSCRICOES_ABERTAS" &&
    !(turma.status === "LOTADA" && turma.filaEsperaHabilitada)
  ) {
    throw new ValidationError("Inscrições não estão abertas para esta turma");
  }

  // 2. Verificar vínculo ativo do profissional com a unidade
  const vinculo = await db.query.vinculos.findFirst({
    where: and(
      eq(vinculos.userId, input.userId),
      eq(vinculos.unidadeId, input.unidadeId),
      eq(vinculos.status, "ATIVO"),
    ),
  });

  if (!vinculo) {
    throw new ValidationError(
      "Profissional não possui vínculo ativo com esta unidade",
    );
  }

  // 3. Verificar elegibilidade de profissão
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
  });

  if (!user?.profissao) {
    throw new ValidationError("Profissional sem profissão cadastrada");
  }

  const profissoesElegiveis = turma.profissoesElegiveis as string[];
  if (!profissoesElegiveis.includes(user.profissao)) {
    throw new ValidationError(
      "Sua profissão não é elegível para esta turma",
    );
  }

  // 4. Verificar elegibilidade geográfica
  await checkGeographicEligibility(turma, input.unidadeId);

  // 5. Verificar inscrição duplicada
  const existing = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.turmaId, input.turmaId),
      eq(enrollments.userId, input.userId),
    ),
  });

  if (existing && !["CANCELADO", "CANCELADO_NAO_CONFIRMOU"].includes(existing.status)) {
    throw new ConflictError("Profissional já inscrito nesta turma");
  }

  // 6. Verificar vagas
  const activeEnrollments = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.turmaId, input.turmaId),
        inArray(enrollments.status, [
          "INSCRITO",
          "PROMOVIDO",
          "CONFIRMADO",
          "PRESENTE",
        ]),
      ),
    );

  const enrolledCount = Number(activeEnrollments[0].count);
  const hasGlobalVacancy = enrolledCount < turma.vagasTotais;

  // 7. Verificar cotas se aplicável
  if (hasGlobalVacancy && turma.modoCota !== "LIVRE") {
    const hasQuota = await checkQuotaAvailability(
      turma.id,
      turma.modoCota,
      input.unidadeId,
      turma.redistribuirOciosas,
      turma.dataRedistribuicao,
    );

    if (!hasQuota && !turma.filaEsperaHabilitada) {
      throw new ValidationError("Cota da sua unidade está esgotada");
    }

    if (!hasQuota) {
      // Vai para fila de espera
      return createWaitlistEntry(input, actorId);
    }
  }

  if (!hasGlobalVacancy) {
    if (!turma.filaEsperaHabilitada) {
      throw new ValidationError("Não há vagas disponíveis");
    }
    return createWaitlistEntry(input, actorId);
  }

  // Criar inscrição normal
  const [enrollment] = await db
    .insert(enrollments)
    .values({
      turmaId: input.turmaId,
      userId: input.userId,
      unidadeId: input.unidadeId,
      status: "INSCRITO",
    })
    .returning();

  await logAudit({
    userId: actorId,
    action: "ENROLLMENT_CREATE",
    entityType: "enrollment",
    entityId: enrollment.id,
    newValue: { turmaId: input.turmaId, userId: input.userId, status: "INSCRITO" },
  });

  return enrollment;
}

async function createWaitlistEntry(input: EnrollmentInput, actorId: string) {
  // Pegar próxima posição da fila
  const lastInQueue = await db
    .select({ maxPos: sql<number>`coalesce(max(posicao_fila), 0)` })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.turmaId, input.turmaId),
        eq(enrollments.status, "FILA_ESPERA"),
      ),
    );

  const nextPos = Number(lastInQueue[0].maxPos) + 1;

  const [enrollment] = await db
    .insert(enrollments)
    .values({
      turmaId: input.turmaId,
      userId: input.userId,
      unidadeId: input.unidadeId,
      status: "FILA_ESPERA",
      posicaoFila: nextPos,
    })
    .returning();

  await logAudit({
    userId: actorId,
    action: "ENROLLMENT_WAITLIST",
    entityType: "enrollment",
    entityId: enrollment.id,
    newValue: { turmaId: input.turmaId, userId: input.userId, status: "FILA_ESPERA", posicaoFila: nextPos },
  });

  return enrollment;
}

async function checkGeographicEligibility(
  turma: { id: string; escopoElegibilidade: string },
  unidadeId: string,
) {
  if (turma.escopoElegibilidade === "REGIONAL_INTEIRA") return;

  const unidade = await db.query.unidades.findFirst({
    where: eq(unidades.id, unidadeId),
  });

  if (!unidade) throw new NotFoundError("Unidade");

  if (turma.escopoElegibilidade === "MUNICIPIOS_ESPECIFICOS") {
    const eligible = await db.query.turmasMunicipios.findFirst({
      where: and(
        eq(turmasMunicipios.turmaId, turma.id),
        eq(turmasMunicipios.municipioId, unidade.municipioId),
      ),
    });
    if (!eligible) {
      throw new ValidationError(
        "Seu município não é elegível para esta turma",
      );
    }
  }

  if (turma.escopoElegibilidade === "UNIDADES_ESPECIFICAS") {
    const eligible = await db.query.turmasUnidades.findFirst({
      where: and(
        eq(turmasUnidades.turmaId, turma.id),
        eq(turmasUnidades.unidadeId, unidadeId),
      ),
    });
    if (!eligible) {
      throw new ValidationError(
        "Sua unidade não é elegível para esta turma",
      );
    }
  }
}

async function checkQuotaAvailability(
  turmaId: string,
  modoCota: string,
  unidadeId: string,
  redistribuirOciosas: boolean,
  dataRedistribuicao: string | null,
): Promise<boolean> {
  let quota;

  if (modoCota === "POR_UNIDADE") {
    quota = await db.query.cotas.findFirst({
      where: and(eq(cotas.turmaId, turmaId), eq(cotas.unidadeId, unidadeId)),
    });
  } else if (modoCota === "POR_MUNICIPIO") {
    const unidade = await db.query.unidades.findFirst({
      where: eq(unidades.id, unidadeId),
    });
    if (!unidade) return false;

    quota = await db.query.cotas.findFirst({
      where: and(
        eq(cotas.turmaId, turmaId),
        eq(cotas.municipioId, unidade.municipioId),
      ),
    });
  }

  if (!quota) return true; // Sem cota definida = sem restrição

  // Contar inscritos na cota
  let usedSlots;

  if (modoCota === "POR_UNIDADE") {
    usedSlots = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.turmaId, turmaId),
          eq(enrollments.unidadeId, unidadeId),
          inArray(enrollments.status, [
            "INSCRITO",
            "PROMOVIDO",
            "CONFIRMADO",
            "PRESENTE",
          ]),
        ),
      );
  } else {
    // POR_MUNICIPIO: join com unidades para filtrar pelo municipio da unidade
    const unidade = await db.query.unidades.findFirst({
      where: eq(unidades.id, unidadeId),
    });
    if (!unidade) return false;

    usedSlots = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .innerJoin(unidades, eq(enrollments.unidadeId, unidades.id))
      .where(
        and(
          eq(enrollments.turmaId, turmaId),
          eq(unidades.municipioId, unidade.municipioId),
          inArray(enrollments.status, [
            "INSCRITO",
            "PROMOVIDO",
            "CONFIRMADO",
            "PRESENTE",
          ]),
        ),
      );
  }

  const used = Number(usedSlots[0].count);

  if (used < quota.limite) return true;

  // Verificar redistribuição
  if (redistribuirOciosas && dataRedistribuicao) {
    const now = new Date();
    const redistDate = new Date(dataRedistribuicao);
    if (now >= redistDate) return true; // Redistribuição ativa, sem limite de cota
  }

  return false;
}

export async function cancelEnrollment(
  enrollmentId: string,
  actorId: string,
) {
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
  });

  if (!enrollment) throw new NotFoundError("Inscrição");

  if (["PRESENTE", "AUSENTE"].includes(enrollment.status)) {
    throw new ValidationError("Não é possível cancelar após registro de presença");
  }

  const [updated] = await db
    .update(enrollments)
    .set({
      status: "CANCELADO",
      canceladoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrollmentId))
    .returning();

  await logAudit({
    userId: actorId,
    action: "ENROLLMENT_CANCEL",
    entityType: "enrollment",
    entityId: enrollmentId,
    oldValue: { status: enrollment.status },
    newValue: { status: "CANCELADO" },
  });

  return updated;
}

export async function confirmEnrollment(
  enrollmentId: string,
  actorId: string,
) {
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
  });

  if (!enrollment) throw new NotFoundError("Inscrição");

  if (!["INSCRITO", "PROMOVIDO"].includes(enrollment.status)) {
    throw new ValidationError("Inscrição não está em estado de confirmação");
  }

  const [updated] = await db
    .update(enrollments)
    .set({
      status: "CONFIRMADO",
      confirmadoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrollmentId))
    .returning();

  await logAudit({
    userId: actorId,
    action: "ENROLLMENT_CONFIRM",
    entityType: "enrollment",
    entityId: enrollmentId,
    oldValue: { status: enrollment.status },
    newValue: { status: "CONFIRMADO" },
  });

  return updated;
}
