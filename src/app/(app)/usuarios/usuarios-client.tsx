"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, KeyRound, Pencil, Search, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { PROFISSOES, PROFISSAO_LABELS, ROLES, type Profissao, type Role } from "@/lib/enums";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  profissao: string | null;
  ativo: boolean;
  mustChangePassword: boolean;
  emailRecebe: boolean;
  unidadeId: string | null;
  unidadeNome: string | null;
}

interface Unidade {
  id: string;
  nome: string;
  municipio: string | null;
}

const ROTULO_ROLE: Record<string, string> = {
  ORGANIZADOR: "Organizador",
  COORDENADOR: "Coordenador",
  PROFISSIONAL: "Profissional",
};

export function UsuariosClient({
  usuarios: iniciais,
  unidades,
  meuId,
}: {
  usuarios: Usuario[];
  unidades: Unidade[];
  meuId: string;
}) {
  const [usuarios, setUsuarios] = useState(iniciais);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{
    nome: string;
    senha: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [papelDe, setPapelDe] = useState<Usuario | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo),
    );
  }, [usuarios, busca]);

  const semEntrega = usuarios.filter((u) => !u.emailRecebe).length;

  async function salvarEmail(id: string) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ email: rascunho }),
      });
      // Recarrega para trazer o veredito de entrega do domínio novo.
      const lista = await apiFetch<Usuario[]>("/api/usuarios");
      setUsuarios(lista);
      setEditando(null);
      toast.success("Email atualizado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível trocar o email.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function resetar(u: Usuario) {
    if (
      !confirm(
        `Gerar uma senha provisória para ${u.nome}? A senha atual deixa de valer na hora, e a pessoa terá que escolher outra no próximo login.`,
      )
    ) {
      return;
    }

    try {
      const r = await apiFetch<{ senhaProvisoria: string }>(
        `/api/usuarios/${u.id}/resetar-senha`,
        { method: "POST" },
      );
      setSenhaGerada({ nome: u.nome, senha: r.senhaProvisoria });
      setCopiado(false);
      setUsuarios((atual) =>
        atual.map((x) =>
          x.id === u.id ? { ...x, mustChangePassword: true } : x,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível resetar.",
      );
    }
  }

  async function salvarPapel(
    u: Usuario,
    role: Role,
    unidadeId: string | null,
    profissao: Profissao | null,
  ) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${u.id}/papel`, {
        method: "PUT",
        body: JSON.stringify({ role, unidadeId, profissao }),
      });
      const lista = await apiFetch<Usuario[]>("/api/usuarios");
      setUsuarios(lista);
      setPapelDe(null);
      toast.success("Papel atualizado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível trocar o papel.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Usuários
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Troque o email de quem não recebe correio e devolva acesso a quem
          esqueceu a senha.
        </p>
      </div>

      {semEntrega > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
          <div className="text-sm text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">
              {semEntrega}{" "}
              {semEntrega === 1 ? "conta usa um endereço" : "contas usam endereços"}{" "}
              que não recebe email.
            </strong>{" "}
            Para essas pessoas o link de &ldquo;esqueci minha senha&rdquo; nunca
            chega — corrija o endereço aqui, ou entregue uma senha provisória.
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou email"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-[var(--border-default)]">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-[var(--bg-secondary)] text-left text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {filtrados.map((u) => (
              <tr key={u.id} className="text-[var(--text-secondary)]">
                <td className="px-4 py-3 text-[var(--text-primary)]">
                  {u.nome}
                  {u.id === meuId && (
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      (você)
                    </span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {editando === u.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={rascunho}
                        onChange={(e) => setRascunho(e.target.value)}
                        type="email"
                        autoFocus
                        className="h-8 max-w-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => salvarEmail(u.id)}
                        disabled={salvando}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditando(null)}
                        disabled={salvando}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{u.email}</span>
                      {!u.emailRecebe && (
                        <Badge variant="warning" title="O domínio não tem servidor de email">
                          não recebe email
                        </Badge>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div>{ROTULO_ROLE[u.role] ?? u.role}</div>
                  {u.unidadeNome && (
                    <div className="text-xs text-[var(--text-muted)]">
                      {u.role === "COORDENADOR" ? "coordena " : ""}
                      {u.unidadeNome}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  {!u.ativo ? (
                    <Badge variant="neutral">inativo</Badge>
                  ) : u.mustChangePassword ? (
                    <Badge variant="info">senha provisória</Badge>
                  ) : (
                    <Badge variant="outline">ativo</Badge>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditando(u.id);
                        setRascunho(u.email);
                      }}
                      title="Trocar email"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPapelDe(u)}
                      title="Trocar papel e unidade"
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resetar(u)}
                      title="Gerar senha provisória"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[var(--text-muted)]"
                >
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {papelDe && (
        <ModalPapel
          usuario={papelDe}
          unidades={unidades}
          salvando={salvando}
          onCancelar={() => setPapelDe(null)}
          onSalvar={(role, unidadeId, profissao) =>
            salvarPapel(papelDe, role, unidadeId, profissao)
          }
        />
      )}

      {senhaGerada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Senha provisória de {senhaGerada.nome}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Entregue esta senha à pessoa. Ela aparece uma única vez — depois de
              fechar, não há como vê-la de novo, só gerar outra.
            </p>

            <div className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
              <code className="flex-1 font-mono text-lg tracking-wider text-[var(--text-primary)]">
                {senhaGerada.senha}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(senhaGerada.senha);
                  setCopiado(true);
                }}
              >
                {copiado ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              No próximo login o sistema exige a troca por uma senha definitiva.
            </p>

            <Button className="w-full" onClick={() => setSenhaGerada(null)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const ROTULO_PAPEL: Record<Role, string> = {
  ORGANIZADOR: "Organizador — administra o sistema inteiro",
  COORDENADOR: "Coordenador — responde por uma unidade",
  PROFISSIONAL: "Profissional — se inscreve nas turmas",
};

function ModalPapel({
  usuario,
  unidades,
  salvando,
  onCancelar,
  onSalvar,
}: {
  usuario: Usuario;
  unidades: Unidade[];
  salvando: boolean;
  onCancelar: () => void;
  onSalvar: (
    role: Role,
    unidadeId: string | null,
    profissao: Profissao | null,
  ) => void;
}) {
  const [role, setRole] = useState<Role>(usuario.role as Role);
  const [unidadeId, setUnidadeId] = useState<string>(usuario.unidadeId ?? "");
  const [profissao, setProfissao] = useState<string>(usuario.profissao ?? "");

  const precisaUnidade = role !== "ORGANIZADOR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
          Papel de {usuario.nome}
        </h2>

        <div className="space-y-2">
          {ROLES.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border-default)] p-3 text-sm hover:bg-[var(--bg-tertiary)]"
            >
              <input
                type="radio"
                name="papel"
                checked={role === r}
                onChange={() => setRole(r)}
                className="mt-1"
              />
              <span className="text-[var(--text-secondary)]">
                {ROTULO_PAPEL[r]}
              </span>
            </label>
          ))}
        </div>

        {precisaUnidade && (
          <div className="space-y-2">
            <Label htmlFor="unidade">
              {role === "COORDENADOR" ? "Unidade que vai coordenar" : "Unidade"}
            </Label>
            <select
              id="unidade"
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Selecione…</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                  {u.municipio ? ` — ${u.municipio}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === "PROFISSIONAL" && (
          <div className="space-y-2">
            <Label htmlFor="profissao">Profissão</Label>
            <select
              id="profissao"
              value={profissao}
              onChange={(e) => setProfissao(e.target.value)}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Não informada</option>
              {PROFISSOES.map((p) => (
                <option key={p} value={p}>
                  {PROFISSAO_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={salvando || (precisaUnidade && !unidadeId)}
            onClick={() =>
              onSalvar(
                role,
                precisaUnidade ? unidadeId : null,
                role === "PROFISSIONAL" && profissao
                  ? (profissao as Profissao)
                  : null,
              )
            }
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
