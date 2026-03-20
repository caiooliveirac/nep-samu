import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/server/db";
import { convites } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { conviteCreateSchema } from "@/lib/schemas";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "profissional:invite")) {
      return apiError(new ForbiddenError());
    }

    const where =
      role === "ORGANIZADOR"
        ? undefined
        : eq(convites.criadoPor, session.user.id);

    const list = await db.query.convites.findMany({
      where,
      with: {
        unidade: { with: { municipio: true } },
        criadoPorUser: { columns: { nome: true } },
      },
      orderBy: [desc(convites.createdAt)],
    });

    return apiSuccess(list);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "profissional:invite")) {
      return apiError(new ForbiddenError());
    }

    const body = await req.json();
    const parsed = conviteCreateSchema.parse(body);

    const token = randomBytes(24).toString("base64url");
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 30);

    const [created] = await db
      .insert(convites)
      .values({
        token,
        unidadeId: parsed.unidadeId,
        criadoPor: session.user.id,
        expiraEm,
      })
      .returning();

    const conviteWithUnidade = await db.query.convites.findFirst({
      where: eq(convites.id, created.id),
      with: {
        unidade: { with: { municipio: true } },
        criadoPorUser: { columns: { nome: true } },
      },
    });

    return apiSuccess(conviteWithUnidade, 201);
  } catch (error) {
    return apiError(error);
  }
}
