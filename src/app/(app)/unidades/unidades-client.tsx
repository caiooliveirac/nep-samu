"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { UNIDADE_TIPO } from "@/lib/enums";

interface Unidade {
  id: string;
  nome: string;
  tipo: string;
  endereco: string | null;
  ativo: boolean;
  municipio: { id: string; nome: string } | null;
}

interface Municipio {
  id: string;
  nome: string;
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

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
}) {
  if (sortKey !== col)
    return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

type SortDir = "asc" | "desc";

// SAMUs primeiro; dentro de cada grupo, Salvador antes dos demais municípios,
// e o desempate segue por tipo e nome.
function defaultSort(a: Unidade, b: Unidade): number {
  const tipoA = TIPO_ORDER[a.tipo] ?? 99;
  const tipoB = TIPO_ORDER[b.tipo] ?? 99;

  if (tipoA === 0 && tipoB !== 0) return -1;
  if (tipoA !== 0 && tipoB === 0) return 1;

  const munA = a.municipio?.nome || "";
  const munB = b.municipio?.nome || "";
  if (munA === "Salvador" && munB !== "Salvador") return -1;
  if (munA !== "Salvador" && munB === "Salvador") return 1;
  const munCmp = munA.localeCompare(munB, "pt-BR");
  if (munCmp !== 0) return munCmp;

  if (tipoA !== tipoB) return tipoA - tipoB;
  return a.nome.localeCompare(b.nome, "pt-BR");
}

export function UnidadesClient({
  unidades,
  municipios,
}: {
  unidades: Unidade[];
  municipios: Municipio[];
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // "nova" abre o modal vazio; uma Unidade abre em modo edição.
  const [modal, setModal] = useState<Unidade | "nova" | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Unidades</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {unidades.length} unidade(s) cadastrada(s)
          </p>
        </div>
        <Button onClick={() => setModal("nova")}>
          <Plus className="h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("nome")}
              >
                Nome <SortIcon col="nome" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("tipo")}
              >
                Tipo <SortIcon col="tipo" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-5 py-3 font-medium hover:text-[var(--text-primary)]"
                onClick={() => handleSort("municipio")}
              >
                Município <SortIcon col="municipio" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
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
                  {/* Quase toda unidade está ativa: destacar as 28 iguais só
                      esconde a exceção. Ativo fica discreto, inativo grita. */}
                  <td className="px-5 py-3">
                    {u.ativo ? (
                      <span className="text-xs text-[var(--text-muted)]">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-[var(--solid-neutral)] px-2 py-0.5 text-xs font-medium text-white">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setModal(u)}
                        title="Editar unidade"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalUnidade
          unidade={modal === "nova" ? null : modal}
          municipios={municipios}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ModalUnidade({
  unidade,
  municipios,
  onFechar,
}: {
  unidade: Unidade | null;
  municipios: Municipio[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState(unidade?.nome ?? "");
  const [tipo, setTipo] = useState(unidade?.tipo ?? "");
  const [municipioId, setMunicipioId] = useState(unidade?.municipio?.id ?? "");
  const [endereco, setEndereco] = useState(unidade?.endereco ?? "");
  const [ativo, setAtivo] = useState(unidade?.ativo ?? true);

  const selectClass =
    "w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]";

  async function salvar() {
    setSalvando(true);
    try {
      if (unidade) {
        await apiFetch(`/api/unidades/${unidade.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            nome: nome.trim(),
            tipo,
            municipioId,
            endereco: endereco.trim(),
            ativo,
          }),
        });
        toast.success("Unidade atualizada.");
      } else {
        await apiFetch("/api/unidades", {
          method: "POST",
          body: JSON.stringify({
            nome: nome.trim(),
            tipo,
            municipioId,
            endereco: endereco.trim() || undefined,
          }),
        });
        toast.success("Unidade criada.");
      }
      onFechar();
      // A tabela renderiza a partir das props do servidor: o refresh traz a
      // lista atualizada sem duplicar estado no cliente.
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a unidade.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
          {unidade ? `Editar ${unidade.nome}` : "Nova Unidade"}
        </h2>

        <div className="space-y-2">
          <Label htmlFor="un-nome">Nome *</Label>
          <Input
            id="un-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="UPA Brotas"
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="un-tipo">Tipo *</Label>
            <select
              id="un-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione…</option>
              {UNIDADE_TIPO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="un-municipio">Município *</Label>
            <select
              id="un-municipio"
              value={municipioId}
              onChange={(e) => setMunicipioId(e.target.value)}
              className={selectClass}
            >
              <option value="">Selecione…</option>
              {municipios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="un-endereco">Endereço</Label>
          <Input
            id="un-endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Av. Exemplo, 123 — Bairro"
          />
        </div>

        {unidade && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Unidade ativa
            <span className="text-xs text-[var(--text-muted)]">
              (inativa não recebe novos vínculos nem convites)
            </span>
          </label>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={salvando || nome.trim().length < 3 || !tipo || !municipioId}
            onClick={salvar}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
