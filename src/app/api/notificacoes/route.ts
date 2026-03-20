import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { notificacoes } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError(new ForbiddenError());

    const userNotifs = await db.query.notificacoes.findMany({
      where: eq(notificacoes.destinatarioId, session.user.id),
      orderBy: [desc(notificacoes.createdAt)],
      limit: 50,
    });

    return apiSuccess(userNotifs);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError(new ForbiddenError());

    const { id } = await req.json();

    await db
      .update(notificacoes)
      .set({ status: "LIDA", lidaEm: new Date() })
      .where(
        and(
          eq(notificacoes.id, id),
          eq(notificacoes.destinatarioId, session.user.id),
        ),
      );

    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
