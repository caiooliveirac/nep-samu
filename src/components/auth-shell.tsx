/** Moldura das telas de autenticação — mesma cara da tela de login. */
export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--samu-orange)]">
            <span className="font-display text-2xl font-bold text-white">N</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {subtitulo}
          </p>
        </div>

        {children}

        <p className="text-center text-xs text-[var(--text-muted)]">
          SAMU — Regional Metropolitana de Salvador
        </p>
      </div>
    </div>
  );
}
