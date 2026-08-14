import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { getRequestIp } from "@/server/lib/rate-limit";
import {
  listarUnidadesParaTroca,
  solicitarTrocaUnidade,
} from "@/server/services/perfil.service";

const schema = z.object({
  unidadeId: z.string().uuid("Selecione uma unidade"),
});

/** As unidades para onde dá para pedir transferência, com quem decide cada uma. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    return apiSuccess(await listarUnidadesParaTroca(session.user.id));
  } catch (error) {
    return apiError(error);
  }
}

/** O pedido em si: desliga o vínculo atual e espera o coordenador de destino. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const resultado = await solicitarTrocaUnidade(
      session.user.id,
      parsed.data.unidadeId,
      {
        ip: getRequestIp(req.headers),
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    );

    return apiSuccess(resultado);
  } catch (error) {
    return apiError(error);
  }
}
