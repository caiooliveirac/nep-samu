import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { logAudit } from "@/server/services/audit.service";
import { ConflictError, NotFoundError, ValidationError } from "@/server/lib/errors";

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

async function carregar(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, nome: true, email: true, role: true, ativo: true },
  });
  if (!user) throw new NotFoundError("Usuário");
  return user;
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
