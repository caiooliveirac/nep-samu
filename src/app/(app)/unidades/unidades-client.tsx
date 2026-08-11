"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Unidade {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  municipio: { id: string; nome: string } | null;
}

const TIPO_ORDER: Record<string, number> = {
  SAMU: 0,
  UPA: 1,
  HOSPITAL: 2,
  OUTRO: 3,
};

const TIPO_LABELS: Record<string, string> = {
  SAMU: "SAMU",
  UPA: "UPA",
  HOSPITAL: "Hospital",
  OUTRO: "Outro",
};

type SortKey = "municipio" | "tipo" | "nome";
type SortDir = "asc" | "desc";

function defaultSort(a: Unidade, b: Unidade): number {
  const tipoA = TIPO_ORDER[a.tipo] ?? 99;
  const tipoB = TIPO_ORDER[b.tipo] ?? 99;

  // SAMUs first (all municipalities)
  if (tipoA === 0 && tipoB !== 0) return -1;
  if (tipoA !== 0 && tipoB === 0) return 1;

  // Within SAMUs, Salvador first then alphabetical
  if (tipoA === 0 && tipoB === 0) {
    const munA = a.municipio?.nome || "";
    const munB = b.municipio?.nome || "";
    if (munA === "Salvador" && munB !== "Salvador") return -1;
    if (munA !== "Salvador" && munB === "Salvador") return 1;
    return munA.localeCompare(munB, "pt-BR");
  }

  // Non-SAMUs: Salvador first, then other municipalities alphabetically
  const munA = a.municipio?.nome || "";
  const munB = b.municipio?.nome || "";
  if (munA === "Salvador" && munB !== "Salvador") return -1;
  if (munA !== "Salvador" && munB === "Salvador") return 1;
  const munCmp = munA.localeCompare(munB, "pt-BR");
  if (munCmp !== 0) return munCmp;

  // Within same municipality: by tipo, then name
  if (tipoA !== tipoB) return tipoA - tipoB;
  return a.nome.localeCompare(b.nome, "pt-BR");
}

export function UnidadesClient({ unidades }: { unidades: Unidade[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // Third click → reset to default
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const arr = [...unidades];
    if (!sortKey) return arr.sort(defaultSort);

    return arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "municipio") {
        cmp = (a.municipio?.nome || "").localeCompare(b.municipio?.nome || "", "pt-BR");
      } else if (sortKey === "tipo") {
        cmp = (TIPO_ORDER[a.tipo] ?? 99) - (TIPO_ORDER[b.tipo] ?? 99);
      } else {
        cmp = a.nome.localeCompare(b.nome, "pt-BR");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [unidades, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Unidades</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {unidades.length} unidade(s) cadastrada(s)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

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
                onClick={() => handleSort("tipo")}
              >
                Tipo <SortIcon col="tipo" />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("municipio")}
              >
                Município <SortIcon col="municipio" />
              </th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-8 text-center text-[var(--text-muted)]"
                >
                  Nenhuma unidade cadastrada
                </td>
              </tr>
            ) : (
              sorted.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">{u.nome}</td>
                  <td className="px-5 py-3">
                    <Badge variant={u.tipo === "SAMU" ? "default" : "outline"}>
                      {TIPO_LABELS[u.tipo] || u.tipo}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {u.municipio?.nome || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        u.ativo
                          ? "bg-[var(--solid-success)] text-white"
                          : "bg-[var(--solid-neutral)] text-white"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
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
