import { db } from "@/server/db";
import { convites } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ConviteForm } from "./convite-form";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const convite = await db.query.convites.findFirst({
    where: eq(convites.token, token),
    with: {
      unidade: { with: { municipio: true } },
    },
  });

  if (!convite) notFound();

  const expirado = new Date() > convite.expiraEm;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--solid-orange)]">
            <span className="text-xl font-bold text-white">N</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            NEP SAMU
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Cadastro de Profissional
          </p>
        </div>

        {expirado ? (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center">
            <p className="text-[var(--text-primary)] font-medium">
              Este link expirou
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Solicite um novo link ao coordenador da sua unidade.
            </p>
          </div>
        ) : (
          <ConviteForm
            token={token}
            unidade={convite.unidade!}
            municipio={convite.unidade?.municipio?.nome ?? ""}
          />
        )}
      </div>
    </div>
  );
}
