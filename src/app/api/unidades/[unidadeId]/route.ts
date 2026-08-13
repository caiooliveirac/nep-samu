import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { db } from "@/server/db";
import {
  convites,
  cotas,
  enrollments,
  municipios,
  turmasUnidades,
  unidades,
  vinculos,
} from "@/server/db/schema";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import { UNIDADE_TIPO, type Role } from "@/lib/enums";
import { isValidUUID } from "@/lib/schemas";
import { logAudit } from "@/server/services/audit.service";
import { getRequestIp } from "@/server/lib/rate-limit";
import { eq } from "drizzle-orm";

const updateSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Nome deve ter no mínimo 3 caracteres")
      .optional(),
    tipo: z.enum(UNIDADE_TIPO).optional(),
    municipioId: z.string().uuid("Selecione um município").optional(),
    endereco: z.string().trim().nullish(),
    // Unidade não é apagada: desativar preserva vínculos e histórico de
    // matrículas que apontam para ela.
    ativo: z.boolean().optional(),
    // "Excluir" na tela = oculta:true. A linha continua no banco, com todo
    // o histórico; só some da lista por padrão.
    oculta: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Informe ao menos um campo para alterar",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ unidadeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!hasPermission(session.user.role as Role, "unidade:edit")) {
      return apiError(new ForbiddenError());
    }

    const { unidadeId } = await params;
    if (!isValidUUID(unidadeId)) {
      throw new ValidationError("Identificador de unidade inválido");
    }

    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }
    const dados = parsed.data;

    const existente = await db.query.unidades.findFirst({
      where: eq(unidades.id, unidadeId),
    });
    if (!existente) return apiError(new NotFoundError("Unidade"));

    if (dados.municipioId) {
      const municipio = await db.query.municipios.findFirst({
        where: eq(municipios.id, dados.municipioId),
      });
      if (!municipio) return apiError(new NotFoundError("Município"));
    }

    const mudancas: Partial<{
      nome: string;
      tipo: string;
      municipioId: string;
      endereco: string | null;
      ativo: boolean;
      oculta: boolean;
    }> = {};
    if (dados.nome !== undefined) mudancas.nome = dados.nome;
    if (dados.tipo !== undefined) mudancas.tipo = dados.tipo;
    if (dados.municipioId !== undefined) mudancas.municipioId = dados.municipioId;
    if (dados.endereco !== undefined) mudancas.endereco = dados.endereco || null;
    if (dados.ativo !== undefined) mudancas.ativo = dados.ativo;
    if (dados.oculta !== undefined) mudancas.oculta = dados.oculta;

    const [atualizada] = await db
      .update(unidades)
      .set(mudancas)
      .where(eq(unidades.id, unidadeId))
      .returning();

    await logAudit({
      userId: session.user.id,
      action: "unidade.atualizada",
      entityType: "unidade",
      entityId: unidadeId,
      oldValue: {
        nome: existente.nome,
        tipo: existente.tipo,
        municipioId: existente.municipioId,
        endereco: existente.endereco,
        ativo: existente.ativo,
        oculta: existente.oculta,
      },
      newValue: mudancas,
      ipAddress: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess(atualizada);
  } catch (error) {
    return apiError(error);
  }
}

// Apagar é permitido só quando a unidade nunca foi usada: sem vínculo,
// turma elegível, cota, matrícula ou convite apontando pra ela. Havendo
// qualquer um desses, a unidade fica só desativável — apagar apagaria
// histórico de outras entidades junto.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ unidadeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!hasPermission(session.user.role as Role, "unidade:delete")) {
      return apiError(new ForbiddenError());
    }

    const { unidadeId } = await params;
    if (!isValidUUID(unidadeId)) {
      throw new ValidationError("Identificador de unidade inválido");
    }

    const existente = await db.query.unidades.findFirst({
      where: eq(unidades.id, unidadeId),
    });
    if (!existente) return apiError(new NotFoundError("Unidade"));

    const [
      vinculo,
      turmaElegivel,
      cota,
      matricula,
      convite,
    ] = await Promise.all([
      db.query.vinculos.findFirst({ where: eq(vinculos.unidadeId, unidadeId) }),
      db.query.turmasUnidades.findFirst({
        where: eq(turmasUnidades.unidadeId, unidadeId),
      }),
      db.query.cotas.findFirst({ where: eq(cotas.unidadeId, unidadeId) }),
      db.query.enrollments.findFirst({
        where: eq(enrollments.unidadeId, unidadeId),
      }),
      db.query.convites.findFirst({ where: eq(convites.unidadeId, unidadeId) }),
    ]);

    if (vinculo || turmaElegivel || cota || matricula || convite) {
      throw new ConflictError(
        "Unidade possui vínculos, turmas, matrículas ou convites associados e não pode ser excluída. Desative-a para preservar o histórico.",
      );
    }

    await db.delete(unidades).where(eq(unidades.id, unidadeId));

    await logAudit({
      userId: session.user.id,
      action: "unidade.excluida",
      entityType: "unidade",
      entityId: unidadeId,
      oldValue: {
        nome: existente.nome,
        tipo: existente.tipo,
        municipioId: existente.municipioId,
      },
      ipAddress: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return apiSuccess({ id: unidadeId });
  } catch (error) {
    return apiError(error);
  }
}
