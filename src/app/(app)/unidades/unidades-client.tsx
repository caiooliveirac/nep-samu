"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { UNIDADE_TIPO, UNIDADE_TIPO_LABELS } from "@/lib/enums";

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
  PA: 2,
  HOSPITAL: 3,
  OUTRO: 4,
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
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  // "nova" abre o modal vazio; uma Unidade abre em modo edição.
  const [modal, setModal] = useState<Unidade | "nova" | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  // Unidade desativada some da lista: é o "sumir da minha visão" pedido. O
  // histórico continua no banco e a caixa abaixo traz de volta quando precisa.
  const [mostrarInativas, setMostrarInativas] = useState(false);

  // Tipos já usados entram na lista do formulário: um tipo novo digitado uma
  // vez vira opção para as próximas unidades, sem deploy.
  const tiposConhecidos = useMemo(
    () =>
      Array.from(
        new Set([...UNIDADE_TIPO, ...unidades.map((u) => u.tipo)]),
      ).filter(Boolean),
    [unidades],
  );

  async function excluir(u: Unidade) {
    if (
      !confirm(
        `Excluir a unidade ${u.nome}? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    setProcessando(u.id);
    try {
      await apiFetch(`/api/unidades/${u.id}`, { method: "DELETE" });
      toast.success("Unidade excluída.");
      router.refresh();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a unidade.";
      // Apagar de vez apagaria vínculos e matrículas junto. Desativar tira a
      // unidade da lista do mesmo jeito e preserva o histórico.
      if (
        confirm(
          `${msg}\n\nOcultar a unidade da lista (desativar) em vez de excluir?`,
        )
      ) {
        try {
          await apiFetch(`/api/unidades/${u.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ativo: false }),
          });
          toast.success("Unidade ocultada da lista.");
          router.refresh();
        } catch {
          toast.error("Não foi possível ocultar a unidade.");
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setProcessando(null);
    }
  }

  async function alternarAtivo(u: Unidade) {
    const pergunta = u.ativo
      ? `Desativar a unidade ${u.nome}? Ela deixa de receber novos vínculos e convites.`
      : `Reativar a unidade ${u.nome}?`;
    if (!confirm(pergunta)) return;
    setProcessando(u.id);
    try {
      await apiFetch(`/api/unidades/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !u.ativo }),
      });
      toast.success(u.ativo ? "Unidade desativada." : "Unidade reativada.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status da unidade.",
      );
    } finally {
      setProcessando(null);
    }
  }

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

  const visiveis = useMemo(
    () => (mostrarInativas ? unidades : unidades.filter((u) => u.ativo)),
    [unidades, mostrarInativas],
  );

  const sorted = useMemo(() => {
    const arr = [...visiveis];
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
  }, [visiveis, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Unidades</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {visiveis.length} unidade(s)
            {!mostrarInativas && unidades.length !== visiveis.length
              ? ` — ${unidades.length - visiveis.length} oculta(s)`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={mostrarInativas}
              onChange={(e) => setMostrarInativas(e.target.checked)}
            />
            Mostrar ocultas
          </label>
          <Button onClick={() => setModal("nova")}>
            <Plus className="h-4 w-4" />
            Nova Unidade
          </Button>
        </div>
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
                      {UNIDADE_TIPO_LABELS[u.tipo] || u.tipo}
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
                        disabled={processando === u.id}
                        title="Editar unidade"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => alternarAtivo(u)}
                        disabled={processando === u.id}
                        title={u.ativo ? "Desativar unidade" : "Reativar unidade"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => excluir(u)}
                        disabled={processando === u.id}
                        title="Excluir unidade"
                      >
                        <Trash2 className="h-4 w-4" />
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
          tipos={tiposConhecidos}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
}

function ModalUnidade({
  unidade,
  municipios,
  tipos,
  onFechar,
}: {
  unidade: Unidade | null;
  municipios: Municipio[];
  tipos: string[];
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
            tipo: tipo.trim(),
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
            tipo: tipo.trim(),
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
            {/* Lista de sugestões, não fechada: dá para digitar um tipo que
                ainda não existe e ele passa a valer para as próximas. */}
            <Input
              id="un-tipo"
              list="un-tipos"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="SAMU, UPA, PA…"
            />
            <datalist id="un-tipos">
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {UNIDADE_TIPO_LABELS[t] ?? t}
                </option>
              ))}
            </datalist>
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
            disabled={salvando || nome.trim().length < 3 || tipo.trim().length < 2 || !municipioId}
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
