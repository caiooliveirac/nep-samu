import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { listarUsuarios } from "@/server/services/usuario-admin.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!hasPermission(session.user.role as Role, "usuario:manage")) {
      return apiError(new ForbiddenError());
    }

    return apiSuccess(await listarUsuarios());
  } catch (error) {
    return apiError(error);
  }
}
