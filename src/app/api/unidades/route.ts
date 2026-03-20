import { db } from "@/server/db";
import { unidades } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const allUnidades = await db.query.unidades.findMany({
      with: { municipio: true },
      orderBy: [desc(unidades.createdAt)],
    });

    return apiSuccess(allUnidades);
  } catch (error) {
    return apiError(error);
  }
}
