import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { changeOwnPassword } from "@/server/services/auth.service";

const schema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ForbiddenError("Faça login primeiro.");

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError("Informe a senha atual e a nova senha.");
    }

    await changeOwnPassword(
      session.user.id,
      parsed.data.senhaAtual,
      parsed.data.novaSenha,
    );
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
