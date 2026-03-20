import { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { createEnrollment } from "@/server/services/enrollment.service";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { z } from "zod/v4";

const enrollSchema = z.object({
  unidadeId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const { turmaId } = await params;
    const body = await req.json();
    const parsed = enrollSchema.parse(body);

    const enrollment = await createEnrollment(
      {
        turmaId,
        userId: session.user.id,
        unidadeId: parsed.unidadeId,
      },
      session.user.id,
    );

    return apiSuccess(enrollment, 201);
  } catch (error) {
    return apiError(error);
  }
}
