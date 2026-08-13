import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { vinculos } from "@/server/db/schema";
import { createEnrollment } from "@/server/services/enrollment.service";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { z } from "zod/v4";

const enrollSchema = z.object({
  // A tela de auto-inscrição não pede unidade: o vínculo ATIVO da pessoa
  // responde por ela. Antes o campo era obrigatório e o cliente mandava "",
  // então a auto-inscrição falhava na validação todas as vezes.
  unidadeId: z.string().uuid().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ turmaId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const { turmaId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = enrollSchema.parse(body);

    let unidadeId = parsed.unidadeId;
    if (!unidadeId) {
      const vinculo = await db.query.vinculos.findFirst({
        where: and(
          eq(vinculos.userId, session.user.id),
          eq(vinculos.status, "ATIVO"),
        ),
        orderBy: [desc(vinculos.updatedAt)],
        columns: { unidadeId: true },
      });
      if (!vinculo) {
        throw new ValidationError(
          "Você não tem vínculo ativo com nenhuma unidade — fale com o coordenador para validar seu cadastro.",
        );
      }
      unidadeId = vinculo.unidadeId;
    }

    const enrollment = await createEnrollment(
      {
        turmaId,
        userId: session.user.id,
        unidadeId,
      },
      session.user.id,
    );

    return apiSuccess(enrollment, 201);
  } catch (error) {
    return apiError(error);
  }
}
