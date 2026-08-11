import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { getRequestIp, isRateLimited } from "@/server/lib/rate-limit";
import { isEmailConfigured, sendEmail } from "@/server/lib/email";
import { createPasswordReset } from "@/server/services/auth.service";

const schema = z.object({ email: z.email() });

// Env própria de propósito: AUTH_URL é do next-auth e aponta para o endpoint de
// auth — usar aquela aqui quebra o login inteiro.
const BASE_URL = (
  process.env.NEP_PUBLIC_URL?.trim() || "https://mnrs.com.br/NEP"
).replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    if (isRateLimited(getRequestIp(req.headers))) {
      return apiSuccess({ error: "Muitas tentativas. Aguarde alguns minutos." }, 429);
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    // Corpo inválido responde igual ao caso feliz: a tela nunca diz se o email
    // existe ou não.
    if (!parsed.success) return apiSuccess({ ok: true });

    const resultado = await createPasswordReset(parsed.data.email);

    if (resultado.created && resultado.token && isEmailConfigured()) {
      try {
        await sendEmail({
          to: parsed.data.email.trim().toLowerCase(),
          subject: "Redefinição de senha — NEP SAMU",
          text: [
            "Recebemos um pedido para redefinir sua senha no NEP SAMU.",
            "",
            "Abra este link para escolher uma nova senha (vale por 2 horas):",
            `${BASE_URL}/redefinir-senha/${resultado.token}`,
            "",
            "Se você não pediu a redefinição, ignore esta mensagem — sua senha continua a mesma.",
          ].join("\n"),
        });
      } catch (error) {
        console.error("[password-reset] falha ao enviar email", error);
      }
    }

    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
