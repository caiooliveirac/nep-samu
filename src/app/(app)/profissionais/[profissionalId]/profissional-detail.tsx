"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  PROFISSOES,
  PROFISSAO_LABELS,
  ENROLLMENT_STATUS_LABELS,
  type Profissao,
  type EnrollmentStatus,
} from "@/lib/enums";
import { EnrollmentStatusBadge } from "@/components/shared/status-badge";

interface Enrollment {
  id: string;
  status: string;
  inscritoEm: string | Date;
  turma: {
    id: string;
    titulo: string;
    dataInicio: string;
    profissoesElegiveis: unknown;
    curso: { id: string; nome: string } | null;
  };
  unidade: { id: string; nome: string } | null;
}

interface Vinculo {
  id: string;
  status: string;
  unidade: {
    id: string;
    nome: string;
    municipio: { id: string; nome: string } | null;
  } | null;
}

interface Profissional {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  profissao: string | null;
  ativo: boolean;
  vinculos: Vinculo[];
  enrollments: Enrollment[];
  [key: string]: unknown;
}

interface UnidadeOption {
  id: string;
  nome: string;
  municipio: { id: string; nome: string } | null;
}

interface TurmaAberta {
  id: string;
  titulo: string;
  dataInicio: string;
  profissoesElegiveis: unknown;
  filaEsperaHabilitada: boolean;
  status: string;
  curso: { id: string; nome: string } | null;
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export function ProfissionalDetail({
  profissional,
  unidades,
  turmasAbertas,
}: {
  profissional: Profissional;
  unidades: UnidadeOption[];
  turmasAbertas: TurmaAberta[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState("");
  const [enrollUnidade, setEnrollUnidade] = useState(
    profissional.vinculos[0]?.unidade?.id || "",
  );

  const activeVinculo = profissional.vinculos.find((v) => v.status === "ATIVO");

  // Filter turmas that match profissional's profissão
  const eligibleTurmas = turmasAbertas.filter((t) => {
    if (!profissional.profissao) return false;
    const profs = t.profissoesElegiveis as string[];
    return Array.isArray(profs) && profs.includes(profissional.profissao);
  });

  // Filter out turmas already enrolled in
  const enrolledTurmaIds = new Set(
    profissional.enrollments
      .filter((e) => !["CANCELADO", "CANCELADO_NAO_CONFIRMOU"].includes(e.status))
      .map((e) => e.turma.id),
  );
  const availableTurmas = eligibleTurmas.filter(
    (t) => !enrolledTurmaIds.has(t.id),
  );

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);

    try {
      await apiFetch(`/api/profissionais/${profissional.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: form.get("nome"),
          profissao: form.get("profissao") || undefined,
          telefone: form.get("telefone") || undefined,
          unidadeId: form.get("unidadeId") || undefined,
        }),
      });

      toast.success("Profissional atualizado com sucesso");
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar profissional");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnroll() {
    if (!selectedTurma || !enrollUnidade) {
      toast.error("Selecione a turma e a unidade");
      return;
    }
    setEnrolling(true);
    try {
      await apiFetch("/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          turmaId: selectedTurma,
          userId: profissional.id,
          unidadeId: enrollUnidade,
        }),
      });
      toast.success("Inscrição realizada com sucesso");
      setSelectedTurma("");
      router.refresh();
    } catch {
      toast.error("Erro ao inscrever profissional");
    } finally {
      setEnrolling(false);
    }
  }

  const selectClass =
    "flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/profissionais">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">
            {profissional.nome}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {profissional.email}
            {profissional.profissao && (
              <> · {PROFISSAO_LABELS[profissional.profissao as Profissao]}</>
            )}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  name="nome"
                  required
                  defaultValue={profissional.nome}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profissao">Profissão *</Label>
                <select
                  id="profissao"
                  name="profissao"
                  defaultValue={profissional.profissao || ""}
                  className={selectClass}
                >
                  <option value="">Selecione</option>
                  {PROFISSOES.map((p) => (
                    <option key={p} value={p}>
                      {PROFISSAO_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  defaultValue={profissional.telefone || ""}
                  placeholder="(71) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadeId">Unidade principal</Label>
                <select
                  id="unidadeId"
                  name="unidadeId"
                  defaultValue={activeVinculo?.unidade?.id || ""}
                  className={selectClass}
                >
                  <option value="">Selecione</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} — {u.municipio?.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Enroll in turma */}
      <Card>
        <CardHeader>
          <CardTitle>Inscrever em Turma</CardTitle>
        </CardHeader>
        <CardContent>
          {!profissional.profissao ? (
            <p className="text-sm text-[var(--text-muted)]">
              Defina a profissão do profissional antes de inscrevê-lo em uma
              turma.
            </p>
          ) : availableTurmas.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhuma turma com inscrições abertas elegível para{" "}
              {PROFISSAO_LABELS[profissional.profissao as Profissao]}.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione uma turma</option>
                    {availableTurmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.curso?.nome} — {t.titulo} ({formatDate(t.dataInicio)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Unidade de vínculo</Label>
                  <select
                    value={enrollUnidade}
                    onChange={(e) => setEnrollUnidade(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Selecione</option>
                    {profissional.vinculos
                      .filter((v) => v.status === "ATIVO")
                      .map((v) => (
                        <option key={v.id} value={v.unidade?.id || ""}>
                          {v.unidade?.nome}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={handleEnroll}
                disabled={enrolling || !selectedTurma || !enrollUnidade}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                {enrolling ? "Inscrevendo..." : "Inscrever"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment History */}
      <Card id="historico">
        <CardHeader>
          <CardTitle>
            Histórico de Cursos ({profissional.enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profissional.enrollments.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nenhuma inscrição registrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-left text-xs text-[var(--text-muted)]">
                    <th className="pb-2 font-medium">Curso</th>
                    <th className="pb-2 font-medium">Turma</th>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Unidade</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {profissional.enrollments.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-[var(--bg-tertiary)]"
                    >
                      <td className="py-2 font-medium">
                        {e.turma.curso?.nome || "—"}
                      </td>
                      <td className="py-2 text-[var(--text-secondary)]">
                        <Link
                          href={`/turmas/${e.turma.id}`}
                          className="hover:text-[var(--samu-blue)] hover:underline"
                        >
                          {e.turma.titulo}
                        </Link>
                      </td>
                      <td className="py-2 text-[var(--text-muted)]">
                        {formatDate(e.turma.dataInicio)}
                      </td>
                      <td className="py-2 text-[var(--text-secondary)]">
                        {e.unidade?.nome || "—"}
                      </td>
                      <td className="py-2">
                        <EnrollmentStatusBadge status={e.status as EnrollmentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
