import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { users, vinculos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ConflictError } from "@/server/lib/errors";
import { eq, desc } from "drizzle-orm";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { profissionalCreateSchema } from "@/lib/schemas";
import bcrypt from "bcryptjs";

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());

    const role = session.user.role as Role;
    if (!hasPermission(role, "profissional:create")) {
      return apiError(new ForbiddenError());
    }

    const body = await req.json();
    const parsed = profissionalCreateSchema.parse(body);

    // Check if email already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.email),
    });
    if (existing) {
      return apiError(new ConflictError("Email já cadastrado no sistema"));
    }

    const passwordHash = await bcrypt.hash(parsed.senha, 10);

    const [created] = await db
      .insert(users)
      .values({
        nome: parsed.nome,
        email: parsed.email,
        telefone: parsed.telefone,
        profissao: parsed.profissao,
        passwordHash,
        role: "PROFISSIONAL",
      })
      .returning({ id: users.id, nome: users.nome, email: users.email });

    // Create vínculo with the selected unidade
    await db.insert(vinculos).values({
      userId: created.id,
      unidadeId: parsed.unidadeId,
      status: "ATIVO",
    });

    return apiSuccess(created, 201);
  } catch (error) {
    return apiError(error);
  }
}
