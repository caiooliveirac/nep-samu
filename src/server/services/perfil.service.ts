import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { notificacoes, unidades, users, vinculos } from "@/server/db/schema";
import { logAudit } from "@/server/services/audit.service";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";

/**
 * O que a própria pessoa mexe na conta dela: os dados de contato e a unidade
 * onde trabalha. Tudo aqui age sobre `userId` da sessão — nenhuma função
 * recebe "de quem", justamente para não virar caminho de editar terceiros.
 */

export async function atualizarMeusDados(
  userId: string,
  dados: { nome: string; telefone: string },
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const atual = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, nome: true, telefone: true },
  });
  if (!atual) throw new NotFoundError("Usuário");

  const nome = dados.nome.trim().replace(/\s+/g, " ");
  const telefone = dados.telefone.trim();

  if (nome === atual.nome && telefone === (atual.telefone ?? "")) {
    return { id: userId, nome, telefone };
  }

  const [atualizado] = await db
    .update(users)
    .set({ nome, telefone, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      nome: users.nome,
      telefone: users.telefone,
    });

  await logAudit({
    userId,
    action: "perfil.dados_alterados",
    entityType: "user",
    entityId: userId,
    oldValue: { nome: atual.nome, telefone: atual.telefone },
    newValue: { nome, telefone },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return atualizado;
}

/** Quem responde por uma unidade — é o nome que o aviso de troca precisa dizer. */
async function coordenadorDa(unidadeId: string) {
  const vinculo = await db.query.vinculos.findFirst({
    where: and(
      eq(vinculos.unidadeId, unidadeId),
      eq(vinculos.isCoordenador, true),
      eq(vinculos.status, "ATIVO"),
    ),
    with: { user: { columns: { id: true, nome: true } } },
  });
  return vinculo?.user ?? null;
}

/**
 * As unidades para onde a pessoa pode pedir transferência, cada uma com o nome
 * de quem vai decidir. A unidade atual vem marcada.
 */
export async function listarUnidadesParaTroca(userId: string) {
  const [lista, meus] = await Promise.all([
    db.query.unidades.findMany({
      where: eq(unidades.ativo, true),
      with: { municipio: { columns: { nome: true } } },
      orderBy: [asc(unidades.nome)],
    }),
    db.query.vinculos.findMany({
      where: eq(vinculos.userId, userId),
      with: { unidade: { columns: { id: true, nome: true } } },
    }),
  ]);

  const atual = meus.find((v) => v.status === "ATIVO") ?? null;
  const pendente = meus.find((v) => v.status === "PENDENTE_VALIDACAO") ?? null;

  const comCoordenador = await Promise.all(
    lista.map(async (u) => ({
      id: u.id,
      nome: u.nome,
      municipio: u.municipio?.nome ?? null,
      coordenador: (await coordenadorDa(u.id))?.nome ?? null,
      atual: u.id === atual?.unidadeId,
    })),
  );

  return {
    unidades: comCoordenador,
    atual: atual
      ? { id: atual.unidadeId, nome: atual.unidade?.nome ?? "" }
      : null,
    pendente: pendente
      ? { id: pendente.unidadeId, nome: pendente.unidade?.nome ?? "" }
      : null,
  };
}

/**
 * A própria pessoa pede para mudar de unidade. É um pedido, não uma mudança:
 * o vínculo novo nasce PENDENTE_VALIDACAO, o antigo é desligado, a conta fica
 * desativada e o coordenador da unidade de destino recebe a notificação. Quem
 * aprova o vínculo religa o acesso (ver `alterarStatusVinculo`).
 */
export async function solicitarTrocaUnidade(
  userId: string,
  unidadeId: string,
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const pessoa = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, nome: true, role: true },
  });
  if (!pessoa) throw new NotFoundError("Usuário");

  if (pessoa.role !== "PROFISSIONAL") {
    throw new ValidationError(
      "Coordenação e organização mudam de unidade pela tela de Usuários, não por pedido.",
    );
  }

  const destino = await db.query.unidades.findFirst({
    where: eq(unidades.id, unidadeId),
    columns: { id: true, nome: true, ativo: true },
  });
  if (!destino) throw new NotFoundError("Unidade");
  if (!destino.ativo) throw new ValidationError("Esta unidade está inativa.");

  const existente = await db.query.vinculos.findFirst({
    where: and(eq(vinculos.userId, userId), eq(vinculos.unidadeId, unidadeId)),
  });
  if (existente?.status === "ATIVO") {
    throw new ConflictError("Você já está nesta unidade.");
  }
  if (existente?.status === "PENDENTE_VALIDACAO") {
    throw new ConflictError(
      "Seu pedido para esta unidade já está aguardando aprovação.",
    );
  }

  const coordenador = await coordenadorDa(unidadeId);

  await db.transaction(async (tx) => {
    // O vínculo antigo sai de cena junto com o acesso: enquanto o pedido não
    // for aprovado, a pessoa não pertence a lugar nenhum.
    await tx
      .update(vinculos)
      .set({ status: "INATIVO", updatedAt: new Date() })
      .where(
        and(
          eq(vinculos.userId, userId),
          ne(vinculos.unidadeId, unidadeId),
          eq(vinculos.status, "ATIVO"),
        ),
      );

    if (existente) {
      await tx
        .update(vinculos)
        .set({ status: "PENDENTE_VALIDACAO", updatedAt: new Date() })
        .where(eq(vinculos.id, existente.id));
    } else {
      await tx.insert(vinculos).values({
        userId,
        unidadeId,
        status: "PENDENTE_VALIDACAO",
      });
    }

    await tx
      .update(users)
      .set({ ativo: false, updatedAt: new Date() })
      .where(eq(users.id, userId));

    if (coordenador) {
      await tx.insert(notificacoes).values({
        tipo: "TROCA_UNIDADE_SOLICITADA",
        destinatarioId: coordenador.id,
        titulo: "Pedido de transferência de unidade",
        corpo: `${pessoa.nome} pediu para passar a trabalhar em ${destino.nome} e aguarda sua aprovação.`,
        payload: { userId, unidadeId },
        status: "PENDENTE",
      });
    }
  });

  await logAudit({
    userId,
    action: "perfil.troca_unidade_solicitada",
    entityType: "vinculo",
    entityId: userId,
    newValue: { unidadeId, status: "PENDENTE_VALIDACAO" },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return {
    unidade: { id: destino.id, nome: destino.nome },
    coordenador: coordenador?.nome ?? null,
    // Sem coordenador na unidade de destino, quem aprova é o organizador pela
    // tela de Usuários — a tela precisa dizer isso.
    semCoordenador: !coordenador,
  };
}
