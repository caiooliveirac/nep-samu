import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { getRequestIp, isRateLimited } from "@/server/lib/rate-limit";
import { ValidationError } from "@/server/lib/errors";
import {
  consumePasswordReset,
  getPasswordResetToken,
} from "@/server/services/auth.service";

const schema = z.object({ password: z.string().min(1) });

/** A tela de redefinir usa isto só para saber se o link ainda vale. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const reset = await getPasswordResetToken(token);
    if (!reset) {
      throw new ValidationError("Este link é inválido ou já expirou.");
    }
    return apiSuccess({ valido: true, email: reset.email });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    if (isRateLimited(getRequestIp(req.headers))) {
      throw new ValidationError("Muitas tentativas. Aguarde alguns minutos.");
    }

    const { token } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError("Informe a nova senha.");
    }

    await consumePasswordReset(token, parsed.data.password);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
