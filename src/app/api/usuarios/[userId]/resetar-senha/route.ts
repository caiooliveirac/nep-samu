import { NextRequest } from "next/server";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import { getRequestIp } from "@/server/lib/rate-limit";
import type { Role } from "@/lib/enums";
import { resetarSenha } from "@/server/services/usuario-admin.service";

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
    // A senha em claro volta uma vez só, para o organizador entregar à pessoa.
    const resultado = await resetarSenha(session.user.id, userId, {
      ip: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess(resultado);
  } catch (error) {
    return apiError(error);
  }
}
