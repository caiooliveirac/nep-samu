"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, History, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PROFISSOES, PROFISSAO_LABELS, type Profissao } from "@/lib/enums";

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
  profissao: string | null;
  ativo: boolean;
  vinculos: Vinculo[];
}

interface UnidadeOption {
  id: string;
  nome: string;
  municipio: { id: string; nome: string } | null;
}

type SortKey = "nome" | "profissao" | "unidade";
type SortDir = "asc" | "desc";

export function ProfissionaisClient({
  profissionais,
  unidades,
}: {
  profissionais: Profissional[];
  unidades: UnidadeOption[];
}) {
  const [search, setSearch] = useState("");
  const [filterProfissao, setFilterProfissao] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...profissionais];

    // Search by name
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q));
    }

    // Filter by profissão
    if (filterProfissao) {
      list = list.filter((p) => p.profissao === filterProfissao);
    }

    // Filter by unidade
    if (filterUnidade) {
      list = list.filter((p) =>
        p.vinculos.some((v) => v.unidade?.id === filterUnidade),
      );
    }

    // Filter by status
    if (filterStatus === "ativo") {
      list = list.filter((p) => p.ativo);
    } else if (filterStatus === "inativo") {
      list = list.filter((p) => !p.ativo);
    }

    // Sort
    if (sortKey) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortKey === "nome") {
          cmp = a.nome.localeCompare(b.nome, "pt-BR");
        } else if (sortKey === "profissao") {
          const la = a.profissao
            ? PROFISSAO_LABELS[a.profissao as Profissao] || a.profissao
            : "zzz";
          const lb = b.profissao
            ? PROFISSAO_LABELS[b.profissao as Profissao] || b.profissao
            : "zzz";
          cmp = la.localeCompare(lb, "pt-BR");
        } else if (sortKey === "unidade") {
          const uA = a.vinculos[0]?.unidade?.nome || "zzz";
          const uB = b.vinculos[0]?.unidade?.nome || "zzz";
          cmp = uA.localeCompare(uB, "pt-BR");
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return list;
  }, [profissionais, search, filterProfissao, filterUnidade, filterStatus, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  const selectClass =
    "flex h-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Profissionais</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {filtered.length} de {profissionais.length} profissional(is)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Cadastrar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={filterProfissao}
          onChange={(e) => setFilterProfissao(e.target.value)}
          className={selectClass}
        >
          <option value="">Todas profissões</option>
          {PROFISSOES.map((p) => (
            <option key={p} value={p}>
              {PROFISSAO_LABELS[p]}
            </option>
          ))}
        </select>

        <select
          value={filterUnidade}
          onChange={(e) => setFilterUnidade(e.target.value)}
          className={selectClass}
        >
          <option value="">Todas unidades</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome} — {u.municipio?.nome}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("nome")}
              >
                Nome <SortIcon col="nome" />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("profissao")}
              >
                Profissão <SortIcon col="profissao" />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("unidade")}
              >
                Unidade(s) <SortIcon col="unidade" />
              </th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-[var(--text-muted)]"
                >
                  Nenhum profissional encontrado
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">
                    <Link
                      href={`/profissionais/${u.id}`}
                      className="hover:text-[var(--samu-blue)] hover:underline"
                    >
                      {u.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {u.profissao ? (
                      <Badge variant="outline">
                        {PROFISSAO_LABELS[u.profissao as Profissao]}
                      </Badge>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.vinculos.map((v) => (
                        <Badge key={v.id} variant="outline">
                          {v.unidade?.nome}
                        </Badge>
                      ))}
                      {u.vinculos.length === 0 && (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        u.ativo
                          ? "bg-[var(--status-success)] text-white"
                          : "bg-[var(--status-neutral)] text-white"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/profissionais/${u.id}`}>
                        <Button variant="ghost" size="icon" title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/profissionais/${u.id}#historico`}>
                        <Button variant="ghost" size="icon" title="Histórico de cursos">
                          <History className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
