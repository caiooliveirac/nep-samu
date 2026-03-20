import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { convites, users, vinculos, notificacoes } from "@/server/db/schema";
import { apiError, apiSuccess } from "@/server/lib/utils";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/server/lib/errors";
import { conviteRegistrarSchema } from "@/lib/schemas";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const convite = await db.query.convites.findFirst({
      where: eq(convites.token, token),
      with: {
        unidade: { with: { municipio: true } },
      },
    });

    if (!convite) return apiError(new NotFoundError("Convite"));
    if (new Date() > convite.expiraEm) {
      return apiError(new ValidationError("Este link expirou"));
    }

    return apiSuccess({
      unidade: convite.unidade,
      token: convite.token,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const convite = await db.query.convites.findFirst({
      where: eq(convites.token, token),
      with: {
        unidade: { with: { municipio: true } },
      },
    });

    if (!convite) return apiError(new NotFoundError("Convite"));
    if (new Date() > convite.expiraEm) {
      return apiError(new ValidationError("Este link expirou"));
    }

    const body = await req.json();
    const parsed = conviteRegistrarSchema.parse(body);

    // Check email uniqueness
    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.email),
    });

    if (existing) {
      // If user exists, check if already has vínculo with this unidade
      const existingVinculo = await db.query.vinculos.findFirst({
        where: and(
          eq(vinculos.userId, existing.id),
          eq(vinculos.unidadeId, convite.unidadeId),
        ),
      });
      if (existingVinculo) {
        return apiError(
          new ConflictError("Você já está cadastrado nesta unidade"),
        );
      }
      // Add vínculo to existing user
      await db.insert(vinculos).values({
        userId: existing.id,
        unidadeId: convite.unidadeId,
        status: "PENDENTE_VALIDACAO",
      });

      // Notify coordinator
      await db.insert(notificacoes).values({
        tipo: "CONVITE_CADASTRO",
        destinatarioId: convite.criadoPor,
        titulo: "Novo cadastro via link",
        corpo: `${existing.nome} se cadastrou na unidade ${convite.unidade?.nome ?? ""}`,
        payload: {
          userId: existing.id,
          unidadeId: convite.unidadeId,
          conviteId: convite.id,
        },
        status: "PENDENTE",
      });

      return apiSuccess({ message: "Vínculo criado com sucesso" }, 201);
    }

    // Create new user
    const passwordHash = await bcrypt.hash(parsed.senha, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        nome: parsed.nome,
        email: parsed.email,
        telefone: parsed.telefone,
        profissao: parsed.profissao,
        passwordHash,
        role: "PROFISSIONAL",
      })
      .returning({ id: users.id, nome: users.nome });

    // Create vínculo
    await db.insert(vinculos).values({
      userId: newUser.id,
      unidadeId: convite.unidadeId,
      status: "PENDENTE_VALIDACAO",
    });

    // Notify coordinator
    await db.insert(notificacoes).values({
      tipo: "CONVITE_CADASTRO",
      destinatarioId: convite.criadoPor,
      titulo: "Novo cadastro via link",
      corpo: `${newUser.nome} se cadastrou na unidade ${convite.unidade?.nome ?? ""}`,
      payload: {
        userId: newUser.id,
        unidadeId: convite.unidadeId,
        conviteId: convite.id,
      },
      status: "PENDENTE",
    });

    return apiSuccess({ message: "Cadastro realizado com sucesso" }, 201);
  } catch (error) {
    return apiError(error);
  }
}
