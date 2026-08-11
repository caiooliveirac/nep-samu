import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { passwordResetTokens, users } from "@/server/db/schema";
import { getPasswordPolicyError } from "@/server/lib/password-policy";
import { ValidationError } from "@/server/lib/errors";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Cria o token de redefinição. Devolve `created: false` para email
 * desconhecido ou conta inativa — quem chama responde igual nos dois casos,
 * senão a tela vira um detector de quem tem conta.
 */
export async function createPasswordReset(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, normalizeEmail(email)),
    columns: { id: true, ativo: true },
  });

  if (!user || !user.ativo) {
    return { created: false as const, token: null };
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiraEm: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return { created: true as const, token };
}

export async function getPasswordResetToken(token: string) {
  const linha = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      email: users.email,
      nome: users.nome,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usadoEm),
        gt(passwordResetTokens.expiraEm, new Date()),
      ),
    )
    .limit(1);

  return linha[0] ?? null;
}

/** Troca a senha pelo link do email e queima o token na mesma transação. */
export async function consumePasswordReset(token: string, password: string) {
  const reset = await getPasswordResetToken(token);
  if (!reset) {
    throw new ValidationError("Este link é inválido ou já expirou.");
  }

  const erro = getPasswordPolicyError(password);
  if (erro) throw new ValidationError(erro);

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, reset.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usadoEm: new Date() })
      .where(eq(passwordResetTokens.id, reset.id));
  });

  return { ok: true };
}

/** Troca feita por quem já está logado — inclusive a troca obrigatória. */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new ValidationError("Esta conta não tem senha definida.");
  }

  const confere = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!confere) {
    throw new ValidationError("A senha atual está incorreta.");
  }

  const erro = getPasswordPolicyError(nextPassword, currentPassword);
  if (erro) throw new ValidationError(erro);

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(nextPassword, 10),
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { ok: true };
}
