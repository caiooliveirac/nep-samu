import { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { createEnrollment } from "@/server/services/enrollment.service";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { z } from "zod/v4";

const enrollSchema = z.object({
  turmaId: z.string().uuid(),
  userId: z.string().uuid(),
  unidadeId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    // Only ORGANIZADOR/COORDENADOR can enroll others
    if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
      return apiError(new ForbiddenError());
    }

    const body = await req.json();
    const parsed = enrollSchema.parse(body);

    const enrollment = await createEnrollment(
      {
        turmaId: parsed.turmaId,
        userId: parsed.userId,
        unidadeId: parsed.unidadeId,
      },
      session.user.id,
    );

    return apiSuccess(enrollment, 201);
  } catch (error) {
    return apiError(error);
  }
}
