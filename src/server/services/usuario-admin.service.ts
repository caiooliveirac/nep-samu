import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/server/db";
import type { Profissao, Role, VinculoStatus } from "@/lib/enums";
import { unidades, users, vinculos } from "@/server/db/schema";
import { logAudit } from "@/server/services/audit.service";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/lib/errors";

/**
 * Administração de contas pelo organizador: trocar o email de quem não recebe
 * correio e devolver acesso a quem esqueceu a senha, sem passar pelo banco.
 *
 * Boa parte do cadastro herdado da EC2 usa domínios que não existem
 * (@nep.samu.ba.gov.br, @samu.local): para essas contas o link de "esqueci
 * minha senha" nunca chega, e a senha provisória daqui é o único caminho.
 */

// Sem I, O, 0 e 1: a senha vai ser ditada por telefone e escrita à mão.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarSenhaProvisoria() {
  const bytes = crypto.randomBytes(16);
  const chars = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

/**
 * Um domínio sem MX não recebe correio: para essas contas o "esqueci minha
 * senha" responde normalmente e o link nunca chega. A tela mostra isso em vez
 * de deixar o organizador descobrir pelo silêncio.
 */
const cacheMx = new Map<string, boolean>();

async function dominioRecebeEmail(dominio: string) {
  const emCache = cacheMx.get(dominio);
  if (emCache !== undefined) return emCache;

  try {
    const { resolveMx } = await import("node:dns/promises");
    const registros = await resolveMx(dominio);
    const recebe = registros.length > 0;
    cacheMx.set(dominio, recebe);
    return recebe;
  } catch {
    cacheMx.set(dominio, false);
    return false;
  }
}

export async function listarUsuarios() {
  const lista = await db.query.users.findMany({
    columns: { passwordHash: false },
    with: { vinculos: { with: { unidade: true } } },
    orderBy: [asc(users.nome)],
  });

  const dominios = [...new Set(lista.map((u) => u.email.split("@")[1] ?? ""))];
  const entrega = new Map(
    await Promise.all(
      dominios.map(
        async (d) => [d, await dominioRecebeEmail(d)] as [string, boolean],
      ),
    ),
  );

  return lista.map((u) => ({
    ...u,
    emailRecebe: entrega.get(u.email.split("@")[1] ?? "") ?? false,
  }));
}

/**
 * A forma que a tela de Usuários consome — a MESMA no primeiro render e no
 * refetch do cliente. Quando cada lado achatava a lista do seu jeito, a coluna
 * de unidade sumia da tabela logo depois de qualquer salvamento.
 */
export async function listarUsuariosParaTela() {
  const lista = await listarUsuarios();
  return lista.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: u.role,
    profissao: u.profissao,
    telefone: u.telefone,
    ativo: u.ativo,
    mustChangePassword: u.mustChangePassword,
    emailRecebe: u.emailRecebe,
    vinculos: (u.vinculos ?? []).map((v) => ({
      id: v.id,
      unidadeId: v.unidadeId,
      unidadeNome: v.unidade?.nome ?? "",
      status: v.status,
      isCoordenador: v.isCoordenador,
    })),
  }));
}

async function carregar(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
      profissao: true,
      telefone: true,
    },
  });
  if (!user) throw new NotFoundError("Usuário");
  return user;
}

/**
 * O último organizador ativo é a chave da porta: rebaixá-lo ou desativá-lo
 * deixaria o sistema sem ninguém capaz de administrar contas.
 */
async function garantirOutroOrganizadorAtivo(userId: string, acao: string) {
  const organizadores = await db.query.users.findMany({
    where: eq(users.role, "ORGANIZADOR"),
    columns: { id: true, ativo: true },
  });
  const outrosAtivos = organizadores.filter(
    (u) => u.id !== userId && u.ativo,
  ).length;
  if (outrosAtivos === 0) {
    throw new ValidationError(
      `Este é o único organizador ativo — promova outra pessoa antes de ${acao}.`,
    );
  }
}

export async function trocarEmail(
  adminId: string,
  userId: string,
  novoEmail: string,
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const email = novoEmail.trim().toLowerCase();
  const alvo = await carregar(userId);

  if (email === alvo.email) {
    throw new ValidationError("O email informado é o mesmo já cadastrado.");
  }

  const emUso = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (emUso && emUso.id !== userId) {
    throw new ConflictError("Este email já pertence a outra conta.");
  }

  const [atualizado] = await db
    .update(users)
    .set({ email, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, nome: users.nome, email: users.email });

  await logAudit({
    userId: adminId,
    action: "usuario.email_alterado",
    entityType: "user",
    entityId: userId,
    oldValue: { email: alvo.email },
    newValue: { email },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return atualizado;
}

/**
 * Gera uma senha provisória e obriga a troca no próximo login. A senha em claro
 * volta uma única vez, para o organizador entregar à pessoa — não fica guardada
 * em lugar nenhum, nem no log de auditoria.
 */
export async function resetarSenha(
  adminId: string,
  userId: string,
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const alvo = await carregar(userId);
  const senhaProvisoria = gerarSenhaProvisoria();

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(senhaProvisoria, 10),
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await logAudit({
    userId: adminId,
    action: "usuario.senha_resetada",
    entityType: "user",
    entityId: userId,
    newValue: { mustChangePassword: true },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { nome: alvo.nome, email: alvo.email, senhaProvisoria };
}

/**
 * Troca o papel da pessoa e, quando o papel exige lugar, o vínculo com a
 * unidade. Coordenador é sempre coordenador DE uma unidade: o vínculo marcado
 * com `isCoordenador` é o que diz de onde.
 *
 * Duas travas, ambas para ninguém se trancar do lado de fora: o organizador não
 * muda o próprio papel, e o último organizador ativo não pode ser rebaixado.
 */
export async function trocarPapel(
  adminId: string,
  userId: string,
  dados: { role: Role; unidadeId?: string | null; profissao?: Profissao | null },
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const alvo = await carregar(userId);

  if (adminId === userId && dados.role !== "ORGANIZADOR") {
    throw new ValidationError(
      "Você não pode rebaixar a própria conta — peça a outro organizador.",
    );
  }

  if (alvo.role === "ORGANIZADOR" && dados.role !== "ORGANIZADOR") {
    await garantirOutroOrganizadorAtivo(userId, "rebaixá-lo");
  }

  if (dados.role !== "ORGANIZADOR" && !dados.unidadeId) {
    throw new ValidationError(
      dados.role === "COORDENADOR"
        ? "Escolha a unidade que a pessoa vai coordenar."
        : "Escolha a unidade da pessoa.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        role: dados.role,
        profissao:
          dados.role === "PROFISSIONAL" ? (dados.profissao ?? null) : alvo.profissao,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    if (!dados.unidadeId) return;

    // Só um vínculo por vez carrega a coordenação: sem isto, quem muda de
    // unidade continuaria coordenando a anterior.
    await tx
      .update(vinculos)
      .set({ isCoordenador: false, updatedAt: new Date() })
      .where(eq(vinculos.userId, userId));

    const existente = await tx.query.vinculos.findFirst({
      where: and(
        eq(vinculos.userId, userId),
        eq(vinculos.unidadeId, dados.unidadeId),
      ),
    });

    const coordena = dados.role === "COORDENADOR";

    if (existente) {
      await tx
        .update(vinculos)
        .set({ isCoordenador: coordena, status: "ATIVO", updatedAt: new Date() })
        .where(eq(vinculos.id, existente.id));
    } else {
      await tx.insert(vinculos).values({
        userId,
        unidadeId: dados.unidadeId,
        status: "ATIVO",
        isCoordenador: coordena,
      });
    }

    // A unidade escolhida aqui é onde a pessoa está agora: sem esta linha, quem
    // muda de unidade acumula vínculos ATIVOS para sempre — segue contando (e
    // podendo se matricular) pela unidade antiga.
    await tx
      .update(vinculos)
      .set({ status: "INATIVO", updatedAt: new Date() })
      .where(
        and(
          eq(vinculos.userId, userId),
          ne(vinculos.unidadeId, dados.unidadeId),
          eq(vinculos.status, "ATIVO"),
        ),
      );
  });

  await logAudit({
    userId: adminId,
    action: "usuario.papel_alterado",
    entityType: "user",
    entityId: userId,
    oldValue: { role: alvo.role },
    newValue: { role: dados.role, unidadeId: dados.unidadeId ?? null },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { id: userId, role: dados.role };
}

/**
 * Edita os dados cadastrais que a tela de Usuários mostra mas não deixava
 * tocar: nome, telefone e profissão. `ativo` entra junto porque desativar a
 * conta é a forma de "remover" alguém sem perder histórico de matrículas e
 * auditoria — não existe apagar usuário.
 */
export async function editarUsuario(
  adminId: string,
  userId: string,
  dados: {
    nome?: string;
    telefone?: string | null;
    profissao?: Profissao | null;
    ativo?: boolean;
  },
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const alvo = await carregar(userId);

  if (dados.ativo === false && alvo.ativo) {
    if (adminId === userId) {
      throw new ValidationError(
        "Você não pode desativar a própria conta — peça a outro organizador.",
      );
    }
    if (alvo.role === "ORGANIZADOR") {
      await garantirOutroOrganizadorAtivo(userId, "desativá-lo");
    }
  }

  const mudancas: Partial<{
    nome: string;
    telefone: string | null;
    profissao: Profissao | null;
    ativo: boolean;
  }> = {};
  if (dados.nome !== undefined && dados.nome !== alvo.nome) {
    mudancas.nome = dados.nome;
  }
  if (dados.telefone !== undefined && dados.telefone !== alvo.telefone) {
    mudancas.telefone = dados.telefone;
  }
  if (dados.profissao !== undefined && dados.profissao !== alvo.profissao) {
    mudancas.profissao = dados.profissao;
  }
  if (dados.ativo !== undefined && dados.ativo !== alvo.ativo) {
    mudancas.ativo = dados.ativo;
  }

  if (Object.keys(mudancas).length === 0) {
    throw new ValidationError("Nenhum dado foi alterado.");
  }

  const [atualizado] = await db
    .update(users)
    .set({ ...mudancas, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      nome: users.nome,
      telefone: users.telefone,
      profissao: users.profissao,
      ativo: users.ativo,
    });

  const antes: Record<string, unknown> = {};
  for (const campo of Object.keys(mudancas)) {
    antes[campo] = alvo[campo as keyof typeof alvo] ?? null;
  }

  await logAudit({
    userId: adminId,
    action:
      mudancas.ativo !== undefined
        ? "usuario.ativo_alterado"
        : "usuario.dados_alterados",
    entityType: "user",
    entityId: userId,
    oldValue: antes,
    newValue: mudancas,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return atualizado;
}

/**
 * Vínculo nunca é apagado: INATIVO preserva o histórico (as matrículas contam
 * a unidade da época) e o índice único (userId, unidadeId) transforma a
 * "re-adição" em reativação da mesma linha.
 */
export async function criarVinculo(
  adminId: string,
  userId: string,
  unidadeId: string,
  ctx: { ip?: string; userAgent?: string } = {},
) {
  await carregar(userId);

  const unidade = await db.query.unidades.findFirst({
    where: eq(unidades.id, unidadeId),
    columns: { id: true, nome: true, ativo: true },
  });
  if (!unidade) throw new NotFoundError("Unidade");
  if (!unidade.ativo) {
    throw new ValidationError("Esta unidade está inativa.");
  }

  const existente = await db.query.vinculos.findFirst({
    where: and(eq(vinculos.userId, userId), eq(vinculos.unidadeId, unidadeId)),
  });

  if (existente?.status === "ATIVO") {
    throw new ConflictError("A pessoa já tem vínculo ativo com esta unidade.");
  }

  let vinculoId: string;
  if (existente) {
    await db
      .update(vinculos)
      .set({ status: "ATIVO", updatedAt: new Date() })
      .where(eq(vinculos.id, existente.id));
    vinculoId = existente.id;
  } else {
    const [novo] = await db
      .insert(vinculos)
      .values({ userId, unidadeId, status: "ATIVO", isCoordenador: false })
      .returning({ id: vinculos.id });
    vinculoId = novo.id;
  }

  await logAudit({
    userId: adminId,
    action: existente ? "vinculo.reativado" : "vinculo.criado",
    entityType: "vinculo",
    entityId: vinculoId,
    oldValue: existente ? { status: existente.status } : undefined,
    newValue: { userId, unidadeId, status: "ATIVO" },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return {
    id: vinculoId,
    unidadeId,
    unidadeNome: unidade.nome,
    status: "ATIVO" as const,
    isCoordenador: existente?.isCoordenador ?? false,
  };
}

/**
 * Aprova (PENDENTE_VALIDACAO → ATIVO), desativa ou reativa um vínculo.
 * Organizador mexe em qualquer um; coordenador só nos vínculos das unidades
 * que coordena, e só de profissionais — é o portão de validação que o
 * convite de cadastro promete.
 */
export async function alterarStatusVinculo(
  actor: { id: string; role: Role },
  userId: string,
  vinculoId: string,
  status: Extract<VinculoStatus, "ATIVO" | "INATIVO">,
  ctx: { ip?: string; userAgent?: string } = {},
) {
  const alvo = await carregar(userId);

  const vinculo = await db.query.vinculos.findFirst({
    where: and(eq(vinculos.id, vinculoId), eq(vinculos.userId, userId)),
    with: { unidade: { columns: { id: true, nome: true } } },
  });
  if (!vinculo) throw new NotFoundError("Vínculo");

  if (actor.role !== "ORGANIZADOR") {
    // Coordenador valida gente da própria casa, não do sistema inteiro.
    if (alvo.role !== "PROFISSIONAL") throw new ForbiddenError();
    const coordena = await db.query.vinculos.findFirst({
      where: and(
        eq(vinculos.userId, actor.id),
        eq(vinculos.unidadeId, vinculo.unidadeId),
        eq(vinculos.isCoordenador, true),
        eq(vinculos.status, "ATIVO"),
      ),
      columns: { id: true },
    });
    if (!coordena) {
      throw new ForbiddenError(
        "Você só pode validar vínculos da unidade que coordena.",
      );
    }
  }

  if (vinculo.status === status) {
    throw new ValidationError("O vínculo já está neste estado.");
  }

  if (
    status === "INATIVO" &&
    vinculo.isCoordenador &&
    alvo.role === "COORDENADOR"
  ) {
    throw new ValidationError(
      "Este vínculo carrega a coordenação — troque o papel ou a unidade da pessoa antes de desativá-lo.",
    );
  }

  await db
    .update(vinculos)
    .set({ status, updatedAt: new Date() })
    .where(eq(vinculos.id, vinculoId));

  await logAudit({
    userId: actor.id,
    action:
      vinculo.status === "PENDENTE_VALIDACAO" && status === "ATIVO"
        ? "vinculo.aprovado"
        : "vinculo.status_alterado",
    entityType: "vinculo",
    entityId: vinculoId,
    oldValue: { status: vinculo.status },
    newValue: { status, unidadeId: vinculo.unidadeId },
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return {
    id: vinculoId,
    status,
    unidadeId: vinculo.unidadeId,
    unidadeNome: vinculo.unidade.nome,
    isCoordenador: vinculo.isCoordenador,
  };
}
