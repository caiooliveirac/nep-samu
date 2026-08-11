"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CalendarDays, Search, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TurmaStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OccupancyBar } from "@/components/dashboard/occupancy-bar";
import { formatDate, formatTime } from "@/lib/format";
import type { TurmaStatus } from "@/lib/enums";
import { TURMA_STATUS, TURMA_STATUS_LABELS } from "@/lib/enums";

interface Turma {
  id: string;
  titulo: string;
  dataInicio: string;
  horaInicio: string;
  local: string | null;
  modalidade: string;
  vagasTotais: number;
  status: string;
  curso: { nome: string } | null;
  ocupando: number;
  confirmados: number;
  fila: number;
}

export function TurmasClient({
  turmas,
  role,
}: {
  turmas: Turma[];
  role: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const temFiltro = search.trim() !== "" || statusFilter !== "ALL";
  const podeEditar = role === "ORGANIZADOR";

  const filtered = turmas.filter((t) => {
    const matchSearch =
      t.titulo.toLowerCase().includes(search.toLowerCase()) ||
      t.curso?.nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Turmas</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {turmas.length} turma(s) cadastrada(s)
          </p>
        </div>
        {role === "ORGANIZADOR" && (
          <Link href="/turmas/nova">
            <Button>
              <Plus className="h-4 w-4" />
              Nova Turma
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar turmas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors ${statusFilter === "ALL" ? "bg-[var(--samu-blue)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"}`}
          >
            Todas
          </button>
          {["INSCRICOES_ABERTAS", "PUBLICADA", "EM_ANDAMENTO", "CONCLUIDA"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors ${statusFilter === s ? "bg-[var(--samu-blue)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"}`}
              >
                {TURMA_STATUS_LABELS[s as TurmaStatus]}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Nenhuma turma encontrada"
          description={
            temFiltro
              ? "Nenhuma turma corresponde à busca ou ao filtro escolhido."
              : "Ainda não há turmas. Crie a primeira a partir de um curso do catálogo."
          }
          action={
            temFiltro ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
              >
                Limpar busca e filtros
              </Button>
            ) : (
              podeEditar && (
                <Link href="/turmas/nova">
                  <Button>
                    <Plus />
                    Nova Turma
                  </Button>
                </Link>
              )
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
                <th className="px-5 py-3 font-medium">Turma</th>
                <th className="px-5 py-3 font-medium">Curso</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Ocupação</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((turma) => (
                <tr
                  key={turma.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">
                    {/* O título também abre a turma: é onde a mão vai primeiro. */}
                    <Link
                      href={`/turmas/${turma.id}`}
                      className="text-[var(--text-primary)] hover:underline"
                    >
                      {turma.titulo}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {turma.curso?.nome || "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {formatDate(turma.dataInicio)} {formatTime(turma.horaInicio)}
                  </td>
                  {/* Quem organiza precisa saber, sem abrir a turma, quais
                      estão enchendo e quais continuam vazias. */}
                  <td className="w-56 px-5 py-3">
                    <OccupancyBar
                      legenda="resumo"
                      total={turma.vagasTotais}
                      segments={[
                        {
                          label: "Confirmados",
                          value: turma.confirmados,
                          color: "var(--status-success)",
                        },
                        {
                          label: "Aguardando confirmação",
                          value: turma.ocupando - turma.confirmados,
                          color: "var(--status-info)",
                        },
                      ]}
                    />
                    {turma.fila > 0 && (
                      <p className="mt-1 text-xs text-[var(--status-warning)]">
                        {turma.fila} na fila de espera
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <TurmaStatusBadge status={turma.status as TurmaStatus} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/turmas/${turma.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye />
                          Ver turma
                        </Button>
                      </Link>
                      {podeEditar && (
                        <Link href={`/turmas/${turma.id}/editar`}>
                          <Button variant="outline" size="sm">
                            <Pencil />
                            Editar
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
