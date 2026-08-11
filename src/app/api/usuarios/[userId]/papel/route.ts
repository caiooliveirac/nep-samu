import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import { getRequestIp } from "@/server/lib/rate-limit";
import { PROFISSOES, ROLES, type Role } from "@/lib/enums";
import { trocarPapel } from "@/server/services/usuario-admin.service";

const schema = z.object({
  role: z.enum(ROLES),
  unidadeId: z.string().uuid().nullish(),
  profissao: z.enum(PROFISSOES).nullish(),
});

export async function PUT(
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
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const atualizado = await trocarPapel(session.user.id, userId, parsed.data, {
      ip: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess(atualizado);
  } catch (error) {
    return apiError(error);
  }
}
