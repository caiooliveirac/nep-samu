import { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { hasPermission } from "@/server/auth/rbac";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { db } from "@/server/db";
import { enrollments } from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { logAudit } from "@/server/services/audit.service";
import { z } from "zod/v4";
import type { Role } from "@/lib/enums";

const presencaSchema = z.object({
  registros: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      presente: z.boolean(),
    }),
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "turma:manage_attendance")) {
      return apiError(new ForbiddenError());
    }

    const { turmaId } = await params;
    const body = await req.json();
    const parsed = presencaSchema.parse(body);

    const results = [];

    for (const registro of parsed.registros) {
      const enrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.id, registro.enrollmentId),
          eq(enrollments.turmaId, turmaId),
        ),
      });

      if (!enrollment) continue;

      if (!["CONFIRMADO"].includes(enrollment.status)) continue;

      const [updated] = await db
        .update(enrollments)
        .set({
          status: registro.presente ? "PRESENTE" : "AUSENTE",
          presente: registro.presente,
          checkinMetodo: "MANUAL",
          checkinEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, registro.enrollmentId))
        .returning();

      await logAudit({
        userId: session.user.id,
        action: registro.presente
          ? "ATTENDANCE_PRESENT"
          : "ATTENDANCE_ABSENT",
        entityType: "enrollment",
        entityId: registro.enrollmentId,
        oldValue: { status: enrollment.status },
        newValue: {
          status: updated.status,
          presente: registro.presente,
        },
      });

      results.push(updated);
    }

    return apiSuccess({ updated: results.length });
  } catch (error) {
    return apiError(error);
  }
}
