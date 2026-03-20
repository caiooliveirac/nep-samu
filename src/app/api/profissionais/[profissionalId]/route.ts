import { db } from "@/server/db";
import { users, vinculos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { eq } from "drizzle-orm";
import { logAudit } from "@/server/services/audit.service";
import { PROFISSOES } from "@/lib/enums";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ profissionalId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
      return apiError(new ForbiddenError());
    }

    const { profissionalId } = await params;

    const profissional = await db.query.users.findFirst({
      where: eq(users.id, profissionalId),
      columns: { passwordHash: false },
      with: {
        vinculos: {
          with: {
            unidade: { with: { municipio: true } },
          },
        },
        enrollments: {
          with: {
            turma: {
              with: { curso: true },
            },
            unidade: true,
          },
          orderBy: (e, { desc }) => [desc(e.inscritoEm)],
        },
      },
    });

    if (!profissional || profissional.role !== "PROFISSIONAL") {
      return apiError(new NotFoundError("Profissional"));
    }

    return apiSuccess(profissional);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ profissionalId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!["ORGANIZADOR", "COORDENADOR"].includes(session.user.role)) {
      return apiError(new ForbiddenError());
    }

    const { profissionalId } = await params;
    const body = await req.json();

    const existing = await db.query.users.findFirst({
      where: eq(users.id, profissionalId),
    });

    if (!existing || existing.role !== "PROFISSIONAL") {
      return apiError(new NotFoundError("Profissional"));
    }

    // Validate profissao if provided
    if (body.profissao && !PROFISSOES.includes(body.profissao)) {
      return apiError(new ValidationError("Profissão inválida"));
    }

    const updateData: Record<string, unknown> = {};
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.profissao !== undefined) updateData.profissao = body.profissao;
    if (body.telefone !== undefined) updateData.telefone = body.telefone;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, profissionalId))
      .returning({
        id: users.id,
        nome: users.nome,
        profissao: users.profissao,
        email: users.email,
      });

    // Handle vinculo update
    if (body.unidadeId) {
      const existingVinculo = await db.query.vinculos.findFirst({
        where: eq(vinculos.userId, profissionalId),
      });

      if (existingVinculo) {
        await db
          .update(vinculos)
          .set({ unidadeId: body.unidadeId, updatedAt: new Date() })
          .where(eq(vinculos.id, existingVinculo.id));
      } else {
        await db.insert(vinculos).values({
          userId: profissionalId,
          unidadeId: body.unidadeId,
          status: "ATIVO",
        });
      }
    }

    await logAudit({
      userId: session.user.id,
      action: "PROFISSIONAL_UPDATE",
      entityType: "user",
      entityId: profissionalId,
      oldValue: {
        nome: existing.nome,
        profissao: existing.profissao,
      },
      newValue: updateData,
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
