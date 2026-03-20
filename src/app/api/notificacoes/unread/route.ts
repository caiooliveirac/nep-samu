import { db } from "@/server/db";
import { notificacoes } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError(new ForbiddenError());

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificacoes)
      .where(
        and(
          eq(notificacoes.destinatarioId, session.user.id),
          inArray(notificacoes.status, ["PENDENTE", "ENVIADA"]),
        ),
      );

    return apiSuccess({ count: Number(result.count) });
  } catch (error) {
    return apiError(error);
  }
}
