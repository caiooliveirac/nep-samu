import { db } from "@/server/db";
import { enrollments } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { eq, and, asc } from "drizzle-orm";
import type { Role } from "@/lib/enums";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "turma:manage_enrollments")) {
      return apiError(new ForbiddenError());
    }

    const { turmaId } = await params;

    const fila = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.turmaId, turmaId),
        eq(enrollments.status, "FILA_ESPERA"),
      ),
      with: { user: true, unidade: true },
      orderBy: [asc(enrollments.posicaoFila)],
    });

    return apiSuccess(fila);
  } catch (error) {
    return apiError(error);
  }
}
