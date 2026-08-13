import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { unidades, users, vinculos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";
import { eq, desc } from "drizzle-orm";
import { hasPermission } from "@/server/auth/rbac";
import type { Role } from "@/lib/enums";
import { profissionalCreateSchema } from "@/lib/schemas";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    // A lista expõe email, telefone e CPF de todo mundo: é para quem gere
    // profissionais, não para qualquer conta logada.
    if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
      return apiError(new ForbiddenError());
    }

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
    // O login compara com igualdade exata: um cadastro com maiúsculas
    // trancaria a pessoa do lado de fora.
    const email = parsed.email.trim().toLowerCase();

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return apiError(new ConflictError("Email já cadastrado no sistema"));
    }

    const unidade = await db.query.unidades.findFirst({
      where: eq(unidades.id, parsed.unidadeId),
      with: { municipio: true },
    });
    if (!unidade) return apiError(new NotFoundError("Unidade"));
    if (!unidade.ativo) {
      return apiError(new ValidationError("Esta unidade está inativa."));
    }

    const passwordHash = await bcrypt.hash(parsed.senha, 10);

    const created = await db.transaction(async (tx) => {
      const [novo] = await tx
        .insert(users)
        .values({
          nome: parsed.nome,
          email,
          telefone: parsed.telefone,
          profissao: parsed.profissao,
          passwordHash,
          role: "PROFISSIONAL",
        })
        .returning({
          id: users.id,
          nome: users.nome,
          email: users.email,
          profissao: users.profissao,
          ativo: users.ativo,
        });

      const [vinculo] = await tx
        .insert(vinculos)
        .values({
          userId: novo.id,
          unidadeId: parsed.unidadeId,
          status: "ATIVO",
        })
        .returning({ id: vinculos.id, status: vinculos.status });

      return { ...novo, vinculo };
    });

    // A resposta espelha a forma da listagem: a tabela insere a linha nova sem
    // recarregar, e antes ela aparecia sem unidade até o próximo reload.
    return apiSuccess(
      {
        id: created.id,
        nome: created.nome,
        email: created.email,
        profissao: created.profissao,
        ativo: created.ativo,
        vinculos: [
          {
            id: created.vinculo.id,
            status: created.vinculo.status,
            unidade: {
              id: unidade.id,
              nome: unidade.nome,
              municipio: unidade.municipio
                ? { id: unidade.municipio.id, nome: unidade.municipio.nome }
                : null,
            },
          },
        ],
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
