import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const profissionais = await db.query.users.findMany({
      where: eq(users.role, "PROFISSIONAL"),
      with: { vinculos: { with: { unidade: true } } },
      orderBy: [desc(users.createdAt)],
      columns: {
        passwordHash: false,
      },
    });

    return apiSuccess(profissionais);
  } catch (error) {
    return apiError(error);
  }
}
