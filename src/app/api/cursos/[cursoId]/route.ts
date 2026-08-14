import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { cursos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { logAudit } from "@/server/services/audit.service";
import { cursoSchema, isValidUUID } from "@/lib/schemas";
import { eq, and } from "drizzle-orm";
import type { Role } from "@/lib/enums";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cursoId: string }> },
) {
  try {
    const { cursoId } = await params;
    if (!isValidUUID(cursoId)) return apiError(new ValidationError("ID inválido"));
    const curso = await db.query.cursos.findFirst({
      where: and(eq(cursos.id, cursoId), eq(cursos.ativo, true)),
      with: { categoria: true },
    });
    if (!curso) return apiError(new NotFoundError("Curso não encontrado"));
    return apiSuccess(curso);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ cursoId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "curso:edit")) {
      return apiError(new ForbiddenError());
    }

    const { cursoId } = await params;
    if (!isValidUUID(cursoId)) return apiError(new ValidationError("ID inválido"));
    const existing = await db.query.cursos.findFirst({
      where: eq(cursos.id, cursoId),
    });
    if (!existing) return apiError(new NotFoundError("Curso não encontrado"));

    const body = await req.json();
    const parsed = cursoSchema.parse(body);

    const [updated] = await db
      .update(cursos)
      .set({
        nome: parsed.nome,
        descricao: parsed.descricao,
        cargaHoraria: parsed.cargaHoraria,
        publicoAlvoProfissoes: parsed.publicoAlvoProfissoes,
        publicoAlvoDescritivo: parsed.publicoAlvoDescritivo,
        updatedAt: new Date(),
      })
      .where(eq(cursos.id, cursoId))
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "CURSO_UPDATE",
      entityType: "curso",
      entityId: cursoId,
      oldValue: existing,
      newValue: updated,
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
