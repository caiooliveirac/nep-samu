"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Pencil,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LinkIcon,
  Copy,
  Check,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PROFISSOES, PROFISSAO_LABELS, type Profissao } from "@/lib/enums";
import { apiFetch } from "@/lib/api-client";

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

interface Convite {
  id: string;
  token: string;
  expiraEm: string;
  createdAt: string;
  unidade: UnidadeOption | null;
  criadoPorUser: { nome: string } | null;
}

type SortKey = "nome" | "profissao" | "unidade";
type SortDir = "asc" | "desc";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/NEP";

export function ProfissionaisClient({
  profissionais: initialProfissionais,
  unidades,
  userRole,
}: {
  profissionais: Profissional[];
  unidades: UnidadeOption[];
  userRole: string;
}) {
  const [profissionais, setProfissionais] = useState(initialProfissionais);
  const [search, setSearch] = useState("");
  const [filterProfissao, setFilterProfissao] = useState("");
  const [filterUnidade, setFilterUnidade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Dialog states
  const [showCadastrar, setShowCadastrar] = useState(false);
  const [showConvite, setShowConvite] = useState(false);
  const [showConvites, setShowConvites] = useState(false);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [convitesLoading, setConvitesLoading] = useState(false);

  // Cadastrar form
  const [cadForm, setCadForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    profissao: "",
    unidadeId: "",
    senha: "",
  });
  const [cadLoading, setCadLoading] = useState(false);
  const [cadError, setCadError] = useState("");

  // Convite form
  const [conviteUnidadeId, setConviteUnidadeId] = useState("");
  const [conviteLoading, setConviteLoading] = useState(false);
  const [conviteLink, setConviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Handlers
  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault();
    setCadError("");
    setCadLoading(true);
    try {
      const created = await apiFetch<{ id: string; nome: string; email: string }>("/api/profissionais", {
        method: "POST",
        body: JSON.stringify(cadForm),
      });
      setProfissionais((prev) => [
        {
          id: created.id,
          nome: created.nome ?? cadForm.nome,
          profissao: cadForm.profissao,
          ativo: true,
          vinculos: [],
        },
        ...prev,
      ]);
      setShowCadastrar(false);
      setCadForm({ nome: "", email: "", telefone: "", profissao: "", unidadeId: "", senha: "" });
    } catch (err) {
      setCadError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setCadLoading(false);
    }
  }

  async function handleGerarConvite(e: React.FormEvent) {
    e.preventDefault();
    setConviteLoading(true);
    try {
      const created = await apiFetch<{ token: string }>("/api/convites", {
        method: "POST",
        body: JSON.stringify({ unidadeId: conviteUnidadeId }),
      });
      const url = `${window.location.origin}${BASE_PATH}/convite/${created.token}`;
      setConviteLink(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    } finally {
      setConviteLoading(false);
    }
  }

  const loadConvites = useCallback(async () => {
    setConvitesLoading(true);
    try {
      const data = await apiFetch<Convite[]>("/api/convites");
      setConvites(data);
    } catch {
      // ignore
    } finally {
      setConvitesLoading(false);
    }
  }, []);

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowConvite(true);
              setConviteLink("");
              setCopied(false);
            }}
          >
            <LinkIcon className="h-4 w-4" />
            Gerar Link
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              loadConvites();
              setShowConvites(true);
            }}
          >
            Links Gerados
          </Button>
          <Button onClick={() => setShowCadastrar(true)}>
            <Plus className="h-4 w-4" />
            Cadastrar
          </Button>
        </div>
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

      {/* Dialog: Cadastrar Profissional */}
      {showCadastrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cadastrar Profissional</h2>
              <button onClick={() => setShowCadastrar(false)}>
                <X className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleCadastrar} className="space-y-3">
              <div>
                <Label htmlFor="cad-nome">Nome *</Label>
                <Input
                  id="cad-nome"
                  required
                  value={cadForm.nome}
                  onChange={(e) => setCadForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="cad-email">Email *</Label>
                <Input
                  id="cad-email"
                  type="email"
                  required
                  value={cadForm.email}
                  onChange={(e) => setCadForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="cad-tel">Telefone</Label>
                <Input
                  id="cad-tel"
                  value={cadForm.telefone}
                  onChange={(e) => setCadForm((f) => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="cad-prof">Profissão *</Label>
                <select
                  id="cad-prof"
                  required
                  value={cadForm.profissao}
                  onChange={(e) => setCadForm((f) => ({ ...f, profissao: e.target.value }))}
                  className={selectClass + " w-full"}
                >
                  <option value="">Selecione...</option>
                  {PROFISSOES.map((p) => (
                    <option key={p} value={p}>{PROFISSAO_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cad-uni">Unidade *</Label>
                <select
                  id="cad-uni"
                  required
                  value={cadForm.unidadeId}
                  onChange={(e) => setCadForm((f) => ({ ...f, unidadeId: e.target.value }))}
                  className={selectClass + " w-full"}
                >
                  <option value="">Selecione...</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} — {u.municipio?.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="cad-senha">Senha *</Label>
                <Input
                  id="cad-senha"
                  type="password"
                  required
                  minLength={6}
                  value={cadForm.senha}
                  onChange={(e) => setCadForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {cadError && <p className="text-sm text-red-500">{cadError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCadastrar(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={cadLoading}>
                  {cadLoading ? "Salvando..." : "Cadastrar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog: Gerar Link de Cadastro */}
      {showConvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Gerar Link de Cadastro</h2>
              <button onClick={() => setShowConvite(false)}>
                <X className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            {!conviteLink ? (
              <form onSubmit={handleGerarConvite} className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Gere um link compartilhável para que profissionais se cadastrem
                  diretamente vinculados a uma unidade.
                </p>
                <div>
                  <Label htmlFor="conv-uni">Unidade *</Label>
                  <select
                    id="conv-uni"
                    required
                    value={conviteUnidadeId}
                    onChange={(e) => setConviteUnidadeId(e.target.value)}
                    className={selectClass + " w-full"}
                  >
                    <option value="">Selecione a unidade...</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} — {u.municipio?.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowConvite(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={conviteLoading}>
                    {conviteLoading ? "Gerando..." : "Gerar e Copiar Link"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3">
                  <code className="flex-1 break-all text-xs">{conviteLink}</code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(conviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600">Link copiado!</p>
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  O link é válido por 30 dias. Compartilhe com os profissionais
                  da unidade para que façam o autocadastro.
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowConvite(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog: Lista de Convites */}
      {showConvites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Links de Cadastro Gerados</h2>
              <button onClick={() => setShowConvites(false)}>
                <X className="h-5 w-5 text-[var(--text-muted)]" />
              </button>
            </div>
            {convitesLoading ? (
              <p className="py-8 text-center text-[var(--text-muted)]">Carregando...</p>
            ) : convites.length === 0 ? (
              <p className="py-8 text-center text-[var(--text-muted)]">
                Nenhum link gerado ainda
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
                      <th className="px-3 py-2">Unidade</th>
                      {userRole === "ORGANIZADOR" && <th className="px-3 py-2">Criado por</th>}
                      <th className="px-3 py-2">Expira em</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convites.map((c) => {
                      const expirado = new Date(c.expiraEm) < new Date();
                      const url = `${window.location.origin}${BASE_PATH}/convite/${c.token}`;
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-[var(--border-muted)]"
                        >
                          <td className="px-3 py-2">
                            {c.unidade?.nome}
                            <span className="ml-1 text-xs text-[var(--text-muted)]">
                              {c.unidade?.municipio?.nome}
                            </span>
                          </td>
                          {userRole === "ORGANIZADOR" && (
                            <td className="px-3 py-2 text-[var(--text-secondary)]">
                              {c.criadoPorUser?.nome}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <span className={expirado ? "text-red-500" : ""}>
                              {new Date(c.expiraEm).toLocaleDateString("pt-BR")}
                            </span>
                            {expirado && (
                              <Badge variant="outline" className="ml-1 text-red-500 border-red-300">
                                Expirado
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {!expirado && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Copiar link"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(url);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowConvites(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
