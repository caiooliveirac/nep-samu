import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import { getRequestIp } from "@/server/lib/rate-limit";
import type { Role } from "@/lib/enums";
import { isValidUUID } from "@/lib/schemas";
import { alterarStatusVinculo } from "@/server/services/usuario-admin.service";

const schema = z.object({
  status: z.enum(["ATIVO", "INATIVO"]),
});

/**
 * Aprovar, desativar ou reativar um vínculo. Além do organizador, o
 * coordenador também passa pelo portão (`profissional:validate`) — o service
 * restringe ao que é da unidade dele.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; vinculoId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    const role = session.user.role as Role;
    if (
      !hasPermission(role, "usuario:manage") &&
      !hasPermission(role, "profissional:validate")
    ) {
      return apiError(new ForbiddenError());
    }

    const { userId, vinculoId } = await params;
    if (!isValidUUID(userId) || !isValidUUID(vinculoId)) {
      throw new ValidationError("Identificador inválido");
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const vinculo = await alterarStatusVinculo(
      { id: session.user.id, role },
      userId,
      vinculoId,
      parsed.data.status,
      {
        ip: getRequestIp(req.headers),
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    );

    return apiSuccess(vinculo);
  } catch (error) {
    return apiError(error);
  }
}
