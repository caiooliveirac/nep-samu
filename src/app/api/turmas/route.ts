import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { turmas, users } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { logAudit } from "@/server/services/audit.service";
import { turmaSchema } from "@/lib/schemas";
import { desc, notInArray, eq } from "drizzle-orm";
import type { Role } from "@/lib/enums";

const HIDDEN_STATUSES = ["RASCUNHO", "CANCELADA"] as const;

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user?.role as Role) || "PROFISSIONAL";

    const allTurmas = await db.query.turmas.findMany({
      with: { curso: true },
      ...(role !== "ORGANIZADOR" && {
        where: notInArray(turmas.status, [...HIDDEN_STATUSES]),
      }),
    });

    let result = allTurmas;

    // Profissionais só veem turmas para as quais são elegíveis
    if (role === "PROFISSIONAL" && session?.user?.id) {
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

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "turma:create")) {
      return apiError(new ForbiddenError());
    }

    const body = await req.json();
    const parsed = turmaSchema.parse(body);

    const [created] = await db
      .insert(turmas)
      .values({
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
        criadoPor: session.user.id,
      })
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "TURMA_CREATE",
      entityType: "turma",
      entityId: created.id,
      newValue: created,
    });

    return apiSuccess(created, 201);
  } catch (error) {
    return apiError(error);
  }
}
