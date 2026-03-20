import { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { confirmEnrollment } from "@/server/services/enrollment.service";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { db } from "@/server/db";
import { enrollments } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const { turmaId } = await params;

    // Find the user's enrollment for this turma
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.turmaId, turmaId),
        eq(enrollments.userId, session.user.id),
      ),
    });

    if (!enrollment) {
      return apiError(new ForbiddenError("Inscrição não encontrada"));
    }

    const updated = await confirmEnrollment(enrollment.id, session.user.id);
    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
