import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import { getRequestIp } from "@/server/lib/rate-limit";
import type { Role } from "@/lib/enums";
import { isValidUUID } from "@/lib/schemas";
import { criarVinculo } from "@/server/services/usuario-admin.service";

const schema = z.object({
  unidadeId: z.string().uuid("Selecione uma unidade"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!hasPermission(session.user.role as Role, "usuario:manage")) {
      return apiError(new ForbiddenError());
    }

    const { userId } = await params;
    if (!isValidUUID(userId)) {
      throw new ValidationError("Identificador de usuário inválido");
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const vinculo = await criarVinculo(
      session.user.id,
      userId,
      parsed.data.unidadeId,
      {
        ip: getRequestIp(req.headers),
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    );

    return apiSuccess(vinculo, 201);
  } catch (error) {
    return apiError(error);
  }
}
