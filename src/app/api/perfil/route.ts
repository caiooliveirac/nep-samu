import { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { getRequestIp } from "@/server/lib/rate-limit";
import { meusDadosSchema } from "@/lib/schemas";
import { atualizarMeusDados } from "@/server/services/perfil.service";

/** Os dados que a própria pessoa corrige: nome completo e WhatsApp. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const parsed = meusDadosSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const atualizado = await atualizarMeusDados(session.user.id, parsed.data, {
      ip: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess(atualizado);
  } catch (error) {
    return apiError(error);
  }
}
