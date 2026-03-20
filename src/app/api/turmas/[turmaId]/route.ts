import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { turmas } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { logAudit } from "@/server/services/audit.service";
import { turmaSchema, isValidUUID } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import type { Role, TurmaStatus } from "@/lib/enums";

const VALID_TRANSITIONS: Record<string, string[]> = {
  RASCUNHO: ["PUBLICADA", "CANCELADA"],
  PUBLICADA: ["INSCRICOES_ABERTAS", "RASCUNHO", "CANCELADA"],
  INSCRICOES_ABERTAS: ["INSCRICOES_ENCERRADAS", "LOTADA", "CANCELADA"],
  LOTADA: ["INSCRICOES_ENCERRADAS", "INSCRICOES_ABERTAS", "CANCELADA"],
  INSCRICOES_ENCERRADAS: ["EM_ANDAMENTO", "CANCELADA"],
  EM_ANDAMENTO: ["CONCLUIDA", "CANCELADA"],
  CONCLUIDA: [],
  CANCELADA: [],
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const { turmaId } = await params;
    if (!isValidUUID(turmaId)) return apiError(new ValidationError("ID inválido"));

    const turma = await db.query.turmas.findFirst({
      where: eq(turmas.id, turmaId),
      with: { curso: true },
    });
    if (!turma) return apiError(new NotFoundError("Turma não encontrada"));
    return apiSuccess(turma);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "turma:edit")) {
      return apiError(new ForbiddenError());
    }

    const { turmaId } = await params;
    if (!isValidUUID(turmaId)) return apiError(new ValidationError("ID inválido"));

    const existing = await db.query.turmas.findFirst({
      where: eq(turmas.id, turmaId),
    });
    if (!existing) return apiError(new NotFoundError("Turma não encontrada"));

    const body = await req.json();
    const parsed = turmaSchema.parse(body);

    const [updated] = await db
      .update(turmas)
      .set({
        cursoId: parsed.cursoId,
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        dataInicio: parsed.dataInicio,
        dataFim: parsed.dataFim,
        horaInicio: parsed.horaInicio,
        horaFim: parsed.horaFim,
        local: parsed.local,
        modalidade: parsed.modalidade,
        vagasTotais: parsed.vagasTotais,
        modoCota: parsed.modoCota,
        redistribuirOciosas: parsed.redistribuirOciosas,
        dataRedistribuicao: parsed.dataRedistribuicao,
        filaEsperaHabilitada: parsed.filaEsperaHabilitada,
        profissoesElegiveis: parsed.profissoesElegiveis,
        escopoElegibilidade: parsed.escopoElegibilidade,
        inscricaoInicio: new Date(parsed.inscricaoInicio),
        inscricaoFim: new Date(parsed.inscricaoFim),
        prazoConfirmacaoDias: parsed.prazoConfirmacaoDias,
        updatedAt: new Date(),
      })
      .where(eq(turmas.id, turmaId))
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "TURMA_UPDATE",
      entityType: "turma",
      entityId: turmaId,
      oldValue: existing,
      newValue: updated,
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "turma:edit")) {
      return apiError(new ForbiddenError());
    }

    const { turmaId } = await params;
    if (!isValidUUID(turmaId)) return apiError(new ValidationError("ID inválido"));

    const existing = await db.query.turmas.findFirst({
      where: eq(turmas.id, turmaId),
    });
    if (!existing) return apiError(new NotFoundError("Turma não encontrada"));

    const body = await req.json();
    const { status } = body as { status: TurmaStatus };

    if (!status) {
      return apiError(new ValidationError("Status é obrigatório"));
    }

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      return apiError(
        new ValidationError(
          `Transição de "${existing.status}" para "${status}" não é permitida`,
        ),
      );
    }

    const [updated] = await db
      .update(turmas)
      .set({ status, updatedAt: new Date() })
      .where(eq(turmas.id, turmaId))
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "TURMA_STATUS_CHANGE",
      entityType: "turma",
      entityId: turmaId,
      oldValue: { status: existing.status },
      newValue: { status },
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
