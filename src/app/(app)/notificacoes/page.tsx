import { auth } from "@/server/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { notificacoes } from "@/server/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/format";

export default async function NotificacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userNotifs = await db.query.notificacoes.findMany({
    where: eq(notificacoes.destinatarioId, session.user.id),
    orderBy: [desc(notificacoes.createdAt)],
    limit: 50,
  });

  // Abrir a lista É ler: nem o sino nem o destaque laranja voltam a cobrar
  // depois desta visita. O critério é `lidaEm`, o mesmo do destaque — assim
  // não sobra notificação (uma que falhou no envio, por exemplo) marcada como
  // nova para sempre. O motivo da falha continua na coluna `erro`.
  await db
    .update(notificacoes)
    .set({ status: "LIDA", lidaEm: new Date() })
    .where(
      and(
        eq(notificacoes.destinatarioId, session.user.id),
        isNull(notificacoes.lidaEm),
      ),
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Notificações</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Suas notificações recentes
        </p>
      </div>

      {userNotifs.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title="Nenhuma notificação"
          description="Você será notificado sobre turmas, inscrições e atualizações"
        />
      ) : (
        <div className="space-y-2">
          {userNotifs.map((n) => {
            // A notificação de cadastro pendente precisa levar a algum lugar:
            // sem o link, o aviso era um beco sem saída e ninguém achava onde
            // aprovar o vínculo.
            const payload = n.payload as { userId?: string } | null;
            // O pedido de troca de unidade termina no mesmo lugar: é lá que o
            // coordenador aprova o vínculo e devolve o acesso à pessoa.
            const cadastroHref =
              (n.tipo === "CONVITE_CADASTRO" ||
                n.tipo === "TROCA_UNIDADE_SOLICITADA") &&
              payload?.userId
                ? `/profissionais/${payload.userId}`
                : null;

            return (
              <div
                key={n.id}
                className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 transition-colors ${!n.lidaEm ? "border-l-4 border-l-[var(--samu-orange)]" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.titulo}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {n.corpo}
                    </p>
                    {cadastroHref && (
                      <Link
                        href={cadastroHref}
                        className="mt-2 inline-block text-sm font-medium text-[var(--samu-blue)] hover:underline"
                      >
                        Ver cadastro e validar vínculo →
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDateTime(n.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
