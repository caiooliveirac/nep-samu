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
    if (convite.usado) {
      return apiError(
        new ValidationError("Este link já foi usado — peça um novo ao coordenador."),
      );
    }
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
    // Cada link vale um cadastro: é o que as colunas usado/usadoPor sempre
    // prometeram e nunca era gravado — o mesmo link servia por 30 dias para
    // quantas contas quisessem.
    if (convite.usado) {
      return apiError(
        new ValidationError("Este link já foi usado — peça um novo ao coordenador."),
      );
    }
    if (new Date() > convite.expiraEm) {
      return apiError(new ValidationError("Este link expirou"));
    }

    const body = await req.json();
    const parsed = conviteRegistrarSchema.parse(body);
    // O login compara com igualdade exata: cadastro com maiúsculas trancaria
    // a pessoa do lado de fora.
    const email = parsed.email.trim().toLowerCase();

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      // Quem já tem conta só está pedindo um vínculo novo com esta unidade.
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

      await db.transaction(async (tx) => {
        await tx.insert(vinculos).values({
          userId: existing.id,
          unidadeId: convite.unidadeId,
          status: "PENDENTE_VALIDACAO",
        });

        await tx
          .update(convites)
          .set({ usado: true, usadoPor: existing.id })
          .where(eq(convites.id, convite.id));

        await tx.insert(notificacoes).values({
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
      });

      return apiSuccess(
        { message: "Vínculo criado com sucesso", existente: true },
        201,
      );
    }

    const passwordHash = await bcrypt.hash(parsed.senha, 10);

    const { newUser } = await db.transaction(async (tx) => {
      // A conta nasce desativada: a tela de sucesso sempre prometeu "acesso
      // após a aprovação", mas a conta nascia ativa e o login nunca olhava o
      // vínculo — qualquer pessoa com o link entrava na hora. Aprovar o
      // vínculo pendente é o que liga a conta.
      const [criado] = await tx
        .insert(users)
        .values({
          nome: parsed.nome,
          email,
          telefone: parsed.telefone,
          profissao: parsed.profissao,
          passwordHash,
          role: "PROFISSIONAL",
          ativo: false,
        })
        .returning({ id: users.id, nome: users.nome });

      await tx.insert(vinculos).values({
        userId: criado.id,
        unidadeId: convite.unidadeId,
        status: "PENDENTE_VALIDACAO",
      });

      await tx
        .update(convites)
        .set({ usado: true, usadoPor: criado.id })
        .where(eq(convites.id, convite.id));

      await tx.insert(notificacoes).values({
        tipo: "CONVITE_CADASTRO",
        destinatarioId: convite.criadoPor,
        titulo: "Novo cadastro via link",
        corpo: `${criado.nome} se cadastrou na unidade ${convite.unidade?.nome ?? ""}`,
        payload: {
          userId: criado.id,
          unidadeId: convite.unidadeId,
          conviteId: convite.id,
        },
        status: "PENDENTE",
      });

      return { newUser: criado };
    });

    return apiSuccess(
      {
        message: "Cadastro realizado com sucesso",
        existente: false,
        userId: newUser.id,
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
