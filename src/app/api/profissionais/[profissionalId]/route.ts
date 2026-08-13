import { db } from "@/server/db";
import { unidades, users, vinculos } from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/lib/errors";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod/v4";
import { logAudit } from "@/server/services/audit.service";
import { PROFISSOES } from "@/lib/enums";
import { isValidUUID } from "@/lib/schemas";
import { getRequestIp } from "@/server/lib/rate-limit";
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
    if (!isValidUUID(profissionalId)) return apiError(new ValidationError("ID inválido"));

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

const putSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .optional(),
  telefone: z
    .string()
    .trim()
    .max(15, "Telefone deve ter no máximo 15 caracteres")
    .nullish(),
  profissao: z.enum(PROFISSOES).nullish(),
  unidadeId: z.string().uuid("Unidade inválida").optional(),
});

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
    if (!isValidUUID(profissionalId)) return apiError(new ValidationError("ID inválido"));

    const parsed = putSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }
    const dados = parsed.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.id, profissionalId),
    });

    if (!existing || existing.role !== "PROFISSIONAL") {
      return apiError(new NotFoundError("Profissional"));
    }

    // Coordenador cuida da própria unidade, não do sistema inteiro: só edita
    // quem tem vínculo com uma unidade que ele coordena, e só move gente para
    // uma unidade que ele coordena.
    if (session.user.role === "COORDENADOR") {
      const minhas = await db.query.vinculos.findMany({
        where: and(
          eq(vinculos.userId, session.user.id),
          eq(vinculos.isCoordenador, true),
          eq(vinculos.status, "ATIVO"),
        ),
        columns: { unidadeId: true },
      });
      const minhasUnidades = new Set(minhas.map((v) => v.unidadeId));
      const doProfissional = await db.query.vinculos.findMany({
        where: eq(vinculos.userId, profissionalId),
        columns: { unidadeId: true },
      });
      if (!doProfissional.some((v) => minhasUnidades.has(v.unidadeId))) {
        return apiError(
          new ForbiddenError(
            "Você só pode editar profissionais da unidade que coordena.",
          ),
        );
      }
      if (dados.unidadeId && !minhasUnidades.has(dados.unidadeId)) {
        return apiError(
          new ForbiddenError(
            "Você só pode vincular profissionais à unidade que coordena.",
          ),
        );
      }
    }

    if (dados.unidadeId) {
      const unidade = await db.query.unidades.findFirst({
        where: eq(unidades.id, dados.unidadeId),
        columns: { id: true, ativo: true },
      });
      if (!unidade) return apiError(new NotFoundError("Unidade"));
      if (!unidade.ativo) {
        return apiError(new ValidationError("Esta unidade está inativa."));
      }
    }

    const updateData: Partial<{
      nome: string;
      telefone: string | null;
      profissao: (typeof PROFISSOES)[number] | null;
    }> = {};
    if (dados.nome !== undefined) updateData.nome = dados.nome;
    if (dados.profissao !== undefined) updateData.profissao = dados.profissao;
    if (dados.telefone !== undefined) {
      updateData.telefone = dados.telefone || null;
    }

    // A unidade que a tela chama de "principal" é o vínculo ATIVO — é esse que
    // o formulário pré-seleciona e é esse que o salvamento tem que mirar. O
    // código antigo pegava um vínculo qualquer (findFirst sem filtro) e
    // reescrevia o unidadeId em cima, estourando o índice único quando a
    // pessoa já tinha vínculo com a unidade escolhida.
    const vinculoAntes = await db.query.vinculos.findFirst({
      where: and(
        eq(vinculos.userId, profissionalId),
        eq(vinculos.status, "ATIVO"),
      ),
      columns: { unidadeId: true },
    });

    const updated = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, profissionalId))
        .returning({
          id: users.id,
          nome: users.nome,
          profissao: users.profissao,
          email: users.email,
        });

      if (dados.unidadeId) {
        const existente = await tx.query.vinculos.findFirst({
          where: and(
            eq(vinculos.userId, profissionalId),
            eq(vinculos.unidadeId, dados.unidadeId),
          ),
        });

        if (existente) {
          if (existente.status !== "ATIVO") {
            await tx
              .update(vinculos)
              .set({ status: "ATIVO", updatedAt: new Date() })
              .where(eq(vinculos.id, existente.id));
          }
        } else {
          await tx.insert(vinculos).values({
            userId: profissionalId,
            unidadeId: dados.unidadeId,
            status: "ATIVO",
          });
        }

        // Trocar de unidade principal desativa a anterior — sem isto a pessoa
        // acumula vínculos ATIVOS para sempre.
        await tx
          .update(vinculos)
          .set({ status: "INATIVO", updatedAt: new Date() })
          .where(
            and(
              eq(vinculos.userId, profissionalId),
              ne(vinculos.unidadeId, dados.unidadeId),
              eq(vinculos.status, "ATIVO"),
            ),
          );
      }

      return u;
    });

    await logAudit({
      userId: session.user.id,
      action: "PROFISSIONAL_UPDATE",
      entityType: "user",
      entityId: profissionalId,
      oldValue: {
        nome: existing.nome,
        telefone: existing.telefone,
        profissao: existing.profissao,
        unidadeId: vinculoAntes?.unidadeId ?? null,
      },
      newValue: {
        ...updateData,
        ...(dados.unidadeId ? { unidadeId: dados.unidadeId } : {}),
      },
      ipAddress: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
