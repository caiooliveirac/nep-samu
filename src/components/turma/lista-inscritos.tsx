"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrollmentStatusBadge } from "@/components/shared/status-badge";
import { ENROLLMENT_STATUS_LABELS, PROFISSAO_LABELS } from "@/lib/enums";
import type { EnrollmentStatus, TurmaStatus } from "@/lib/enums";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export interface Inscrito {
  id: string;
  status: EnrollmentStatus;
  posicaoFila: number | null;
  inscritoEm: string | Date;
  confirmadoEm: string | Date | null;
  user: { id: string; nome: string; email: string; profissao: string | null };
  unidade: { id: string; nome: string };
}

/** Situações que ocupam uma vaga de verdade — fila de espera não ocupa. */
const OCUPAM_VAGA: EnrollmentStatus[] = [
  "INSCRITO",
  "PROMOVIDO",
  "CONFIRMADO",
  "PRESENTE",
];

type Aba = "vaga" | "fila" | "fora";

const ABAS: Array<{ chave: Aba; rotulo: string }> = [
  { chave: "vaga", rotulo: "Com vaga" },
  { chave: "fila", rotulo: "Fila de espera" },
  { chave: "fora", rotulo: "Cancelados e ausentes" },
];

export function ListaInscritos({
  turmaId,
  statusTurma,
  inscritos,
  podeRegistrarPresenca,
}: {
  turmaId: string;
  statusTurma: TurmaStatus;
  inscritos: Inscrito[];
  podeRegistrarPresenca: boolean;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<Aba>("vaga");
  const [salvando, setSalvando] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const vaga = inscritos.filter((i) => OCUPAM_VAGA.includes(i.status));
    const fila = inscritos.filter((i) => i.status === "FILA_ESPERA");
    const fora = inscritos.filter(
      (i) => !OCUPAM_VAGA.includes(i.status) && i.status !== "FILA_ESPERA",
    );
    return { vaga, fila, fora };
  }, [inscritos]);

  const aguardando = grupos.vaga.filter((i) => i.status === "INSCRITO" || i.status === "PROMOVIDO");

  const visiveis = useMemo(() => {
    const base =
      aba === "vaga" ? grupos.vaga : aba === "fila" ? grupos.fila : grupos.fora;
    const termo = busca.trim().toLowerCase();
    const filtrados = termo
      ? base.filter(
          (i) =>
            i.user.nome.toLowerCase().includes(termo) ||
            i.unidade.nome.toLowerCase().includes(termo),
        )
      : base;
    // Na fila a ordem é a posição; nas outras abas, quem se inscreveu antes.
    return [...filtrados].sort((a, b) =>
      aba === "fila"
        ? (a.posicaoFila ?? 0) - (b.posicaoFila ?? 0)
        : new Date(a.inscritoEm).getTime() - new Date(b.inscritoEm).getTime(),
    );
  }, [aba, busca, grupos]);

  async function registrarPresenca(enrollmentId: string, presente: boolean) {
    setSalvando(enrollmentId);
    try {
      await apiFetch(`/api/turmas/${turmaId}/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registros: [{ enrollmentId, presente }] }),
      });
      toast.success(presente ? "Presença registrada" : "Falta registrada");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível registrar",
      );
    } finally {
      setSalvando(null);
    }
  }

  if (inscritos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inscritos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-secondary)]">
            Ninguém se inscreveu nesta turma ainda.
            {statusTurma !== "INSCRICOES_ABERTAS" &&
              " As inscrições não estão abertas — enquanto isso, ninguém consegue entrar."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inscritos</CardTitle>
        {/* A conta que interessa a quem organiza é quantos ainda faltam
            confirmar — antes era preciso subtrair de cabeça. */}
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {grupos.vaga.length} com vaga
          {aguardando.length > 0 && (
            <>
              {" · "}
              <span className="text-[var(--status-warning)]">
                {aguardando.length} ainda não confirmaram
              </span>
            </>
          )}
          {grupos.fila.length > 0 && ` · ${grupos.fila.length} na fila de espera`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              placeholder="Buscar por nome ou unidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {ABAS.map(({ chave, rotulo }) => {
              const n = grupos[chave].length;
              return (
                <button
                  key={chave}
                  onClick={() => setAba(chave)}
                  className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    aba === chave
                      ? "bg-[var(--samu-blue)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  }`}
                >
                  {rotulo} ({n})
                </button>
              );
            })}
          </div>
        </div>

        {visiveis.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            {busca
              ? "Ninguém com esse nome nesta lista."
              : "Nenhuma pessoa nesta situação."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-muted)]">
                  {aba === "fila" && <th className="pb-2 font-medium">Posição</th>}
                  <th className="pb-2 font-medium">Nome</th>
                  <th className="pb-2 font-medium">Profissão</th>
                  <th className="pb-2 font-medium">Unidade</th>
                  <th className="pb-2 font-medium">Situação</th>
                  <th className="pb-2 font-medium">Inscrição</th>
                  {podeRegistrarPresenca && aba === "vaga" && (
                    <th className="pb-2 font-medium">Presença</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-muted)]">
                {visiveis.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]">
                    {aba === "fila" && (
                      <td
                        className="py-2 text-[var(--text-secondary)]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {e.posicaoFila != null ? `${e.posicaoFila + 1}º` : "—"}
                      </td>
                    )}
                    <td className="py-2 text-[var(--text-primary)]">
                      {e.user.nome}
                    </td>
                    <td className="py-2 text-[var(--text-secondary)]">
                      {e.user.profissao
                        ? PROFISSAO_LABELS[
                            e.user.profissao as keyof typeof PROFISSAO_LABELS
                          ]
                        : "—"}
                    </td>
                    <td className="py-2 text-[var(--text-secondary)]">
                      {e.unidade.nome}
                    </td>
                    <td className="py-2">
                      <EnrollmentStatusBadge status={e.status} />
                    </td>
                    <td className="py-2 text-[var(--text-muted)]">
                      {formatDate(e.inscritoEm)}
                    </td>
                    {podeRegistrarPresenca && aba === "vaga" && (
                      <td className="py-2">
                        {e.status === "CONFIRMADO" ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={salvando === e.id}
                              onClick={() => registrarPresenca(e.id, true)}
                            >
                              <Check />
                              Presente
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={salvando === e.id}
                              onClick={() => registrarPresenca(e.id, false)}
                            >
                              <X />
                              Faltou
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">
                            {e.status === "PRESENTE" || e.status === "AUSENTE"
                              ? ENROLLMENT_STATUS_LABELS[e.status]
                              : "só após confirmar"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
