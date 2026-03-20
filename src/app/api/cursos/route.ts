import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { cursos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { logAudit } from "@/server/services/audit.service";
import { cursoSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import type { Role } from "@/lib/enums";

export async function GET() {
  try {
    const allCursos = await db.query.cursos.findMany({
      where: eq(cursos.ativo, true),
      with: { categoria: true },
      orderBy: (cursos, { asc }) => [asc(cursos.nome)],
    });
    return apiSuccess(allCursos);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "curso:create")) {
      return apiError(new ForbiddenError());
    }

    const body = await req.json();
    const parsed = cursoSchema.parse(body);

    const [created] = await db
      .insert(cursos)
      .values({
        nome: parsed.nome,
        descricao: parsed.descricao,
        categoriaId: parsed.categoriaId,
        cargaHoraria: parsed.cargaHoraria,
        publicoAlvoDescritivo: parsed.publicoAlvoDescritivo,
      })
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "CURSO_CREATE",
      entityType: "curso",
      entityId: created.id,
      newValue: created,
    });

    return apiSuccess(created, 201);
  } catch (error) {
    return apiError(error);
  }
}
