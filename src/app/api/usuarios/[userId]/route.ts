import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/server/auth/config";
import { apiError, apiSuccess } from "@/server/lib/utils";
import { ForbiddenError, ValidationError } from "@/server/lib/errors";
import { hasPermission } from "@/server/auth/rbac";
import { getRequestIp } from "@/server/lib/rate-limit";
import { PROFISSOES, type Role } from "@/lib/enums";
import { isValidUUID } from "@/lib/schemas";
import { editarUsuario, trocarEmail } from "@/server/services/usuario-admin.service";

const schema = z
  .object({
    email: z.email("Email inválido").optional(),
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
    ativo: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Informe ao menos um campo para alterar",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return apiError(new ForbiddenError());
    if (!hasPermission(session.user.role as Role, "usuario:manage")) {
      return apiError(new ForbiddenError());
    }

    const { userId } = await params;
    if (!isValidUUID(userId)) {
      throw new ValidationError("Identificador de usuário inválido");
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error?.issues[0]?.message ?? "Dados inválidos",
      );
    }

    const ctx = {
      ip: getRequestIp(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
    };

    const { email, telefone, ...resto } = parsed.data;
    let atualizado: Record<string, unknown> = { id: userId };

    if (email !== undefined) {
      atualizado = {
        ...atualizado,
        ...(await trocarEmail(session.user.id, userId, email, ctx)),
      };
    }

    const dados = {
      ...resto,
      // Campo limpo no formulário chega como "": no banco isso é NULL.
      ...(telefone !== undefined ? { telefone: telefone || null } : {}),
    };
    if (Object.values(dados).some((v) => v !== undefined)) {
      atualizado = {
        ...atualizado,
        ...(await editarUsuario(session.user.id, userId, dados, ctx)),
      };
    }

    return apiSuccess(atualizado);
  } catch (error) {
    return apiError(error);
  }
}
