"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  History,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import {
  erroNomeCompleto,
  erroWhatsapp,
  formatarTelefone,
} from "@/lib/contato";
import {
  PROFISSOES,
  PROFISSAO_LABELS,
  ROLES,
  type Profissao,
  type Role,
  type VinculoStatus,
} from "@/lib/enums";

interface Vinculo {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  status: VinculoStatus;
  isCoordenador: boolean;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  profissao: string | null;
  telefone: string | null;
  ativo: boolean;
  mustChangePassword: boolean;
  emailRecebe: boolean;
  vinculos: Vinculo[];
}

interface Unidade {
  id: string;
  nome: string;
  municipio: string | null;
}

interface Removido {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: string;
  removidoEm: string;
}

const ROTULO_ROLE: Record<string, string> = {
  ORGANIZADOR: "Organizador",
  COORDENADOR: "Coordenador",
  PROFISSIONAL: "Profissional",
};

const ROTULO_VINCULO: Record<VinculoStatus, string> = {
  ATIVO: "ativo",
  INATIVO: "inativo",
  PENDENTE_VALIDACAO: "aguardando validação",
};

/** O vínculo que a tabela e o modal de papel tratam como "a unidade da pessoa". */
function vinculoPrincipal(u: Usuario) {
  return (
    u.vinculos.find((v) => v.isCoordenador && v.status === "ATIVO") ??
    u.vinculos.find((v) => v.status === "ATIVO") ??
    null
  );
}

export function UsuariosClient({
  usuarios: iniciais,
  removidos,
  unidades,
  meuId,
}: {
  usuarios: Usuario[];
  removidos: Removido[];
  unidades: Unidade[];
  meuId: string;
}) {
  const [usuarios, setUsuarios] = useState(iniciais);
  const [historico, setHistorico] = useState(removidos);
  const [verHistorico, setVerHistorico] = useState(false);
  const [removerDe, setRemoverDe] = useState<Usuario | null>(null);
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
  const [dadosDe, setDadosDe] = useState<Usuario | null>(null);
  // Guarda o id, não o objeto: depois de um refetch o modal continua apontando
  // para a versão atual do usuário em vez de uma cópia velha.
  const [vinculosDe, setVinculosDe] = useState<string | null>(null);

  const usuarioVinculos = vinculosDe
    ? (usuarios.find((u) => u.id === vinculosDe) ?? null)
    : null;

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
  const pendentes = usuarios.reduce(
    (n, u) =>
      n + u.vinculos.filter((v) => v.status === "PENDENTE_VALIDACAO").length,
    0,
  );

  async function recarregar() {
    const lista = await apiFetch<Usuario[]>("/api/usuarios");
    setUsuarios(lista);
  }

  async function salvarEmail(id: string) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ email: rascunho.trim() }),
      });
      // Recarrega para trazer o veredito de entrega do domínio novo.
      await recarregar();
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

  async function salvarDados(
    u: Usuario,
    dados: { nome: string; telefone: string; profissao: Profissao | null },
  ) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify(dados),
      });
      await recarregar();
      setDadosDe(null);
      toast.success("Dados atualizados.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u: Usuario) {
    const pergunta = u.ativo
      ? `Desativar a conta de ${u.nome}? A pessoa não conseguirá mais entrar no sistema até ser reativada.`
      : `Reativar a conta de ${u.nome}? A pessoa volta a conseguir entrar no sistema.`;
    if (!confirm(pergunta)) return;

    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: !u.ativo }),
      });
      await recarregar();
      toast.success(u.ativo ? "Conta desativada." : "Conta reativada.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a conta.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(u: Usuario) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
      setUsuarios((atual) => atual.filter((x) => x.id !== u.id));
      setHistorico((atual) => [
        {
          id: u.id,
          nome: u.nome,
          email: u.email,
          telefone: u.telefone,
          role: u.role,
          removidoEm: new Date().toISOString(),
        },
        ...atual,
      ]);
      setRemoverDe(null);
      toast.success(`${u.nome} foi apagado.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível apagar.",
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
      await recarregar();
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

  async function adicionarVinculo(userId: string, unidadeId: string) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${userId}/vinculos`, {
        method: "POST",
        body: JSON.stringify({ unidadeId }),
      });
      await recarregar();
      toast.success("Vínculo adicionado.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o vínculo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatusVinculo(
    userId: string,
    vinculoId: string,
    status: "ATIVO" | "INATIVO",
  ) {
    setSalvando(true);
    try {
      await apiFetch(`/api/usuarios/${userId}/vinculos/${vinculoId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await recarregar();
      toast.success(
        status === "ATIVO" ? "Vínculo ativado." : "Vínculo desativado.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o vínculo.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function copiarSenha() {
    if (!senhaGerada) return;
    try {
      await navigator.clipboard.writeText(senhaGerada.senha);
      setCopiado(true);
    } catch {
      toast.error("Não foi possível copiar — selecione o texto e copie manualmente.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Usuários
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Edite os dados cadastrais, os vínculos com as unidades e o acesso de
          cada conta.
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

      {pendentes > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-[var(--status-warning)]/40 bg-[var(--status-warning)]/10 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning)]" />
          <div className="text-sm text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">
              {pendentes === 1
                ? "1 vínculo aguarda validação."
                : `${pendentes} vínculos aguardam validação.`}
            </strong>{" "}
            Cadastros feitos pelo link de convite só valem depois de aprovados —
            abra os vínculos da pessoa para aprovar ou recusar.
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
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-[var(--bg-secondary)] text-left text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Papel e unidades</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {filtrados.map((u) => {
              const ativos = u.vinculos.filter((v) => v.status === "ATIVO");
              const aguardando = u.vinculos.filter(
                (v) => v.status === "PENDENTE_VALIDACAO",
              ).length;

              return (
                <tr key={u.id} className="text-[var(--text-secondary)]">
                  <td className="px-4 py-3 text-[var(--text-primary)]">
                    {u.nome}
                    {u.id === meuId && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        (você)
                      </span>
                    )}
                    {u.telefone && (
                      <div className="text-xs font-normal text-[var(--text-muted)]">
                        {u.telefone}
                      </div>
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
                          disabled={
                            salvando ||
                            !rascunho.trim() ||
                            rascunho.trim().toLowerCase() === u.email
                          }
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setEditando(u.id);
                            setRascunho(u.email);
                          }}
                          title="Trocar email"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
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
                    {ativos.map((v) => (
                      <div
                        key={v.id}
                        className="text-xs text-[var(--text-muted)]"
                      >
                        {v.isCoordenador ? "coordena " : ""}
                        {v.unidadeNome}
                      </div>
                    ))}
                    {aguardando > 0 && (
                      <Badge variant="warning" className="mt-1">
                        {aguardando === 1
                          ? "1 vínculo pendente"
                          : `${aguardando} vínculos pendentes`}
                      </Badge>
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
                        onClick={() => setDadosDe(u)}
                        title="Editar dados (nome, telefone, profissão)"
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
                        onClick={() => setVinculosDe(u.id)}
                        title="Vínculos com unidades"
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resetar(u)}
                        title="Gerar senha provisória"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => alternarAtivo(u)}
                        disabled={u.id === meuId || salvando}
                        title={
                          u.id === meuId
                            ? "Você não pode desativar a própria conta"
                            : u.ativo
                              ? "Desativar conta"
                              : "Reativar conta"
                        }
                      >
                        {u.ativo ? (
                          <UserRoundX className="h-4 w-4" />
                        ) : (
                          <UserRoundCheck className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoverDe(u)}
                        disabled={u.id === meuId || salvando}
                        title={
                          u.id === meuId
                            ? "Você não pode apagar a própria conta"
                            : "Apagar conta de vez"
                        }
                        className="text-[var(--status-danger-fg)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

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

      {/* Histórico: o único rastro de quem foi apagado. Fica fechado — a lista
          de cima é para quem existe. */}
      <div className="rounded-md border border-[var(--border-default)]">
        <button
          type="button"
          onClick={() => setVerHistorico((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        >
          <History className="h-4 w-4" />
          Histórico de contas apagadas
          <span className="text-[var(--text-muted)]">({historico.length})</span>
        </button>

        {verHistorico && (
          <div className="border-t border-[var(--border-default)] px-4 py-3">
            {historico.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Nenhuma conta foi apagada.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {historico.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[var(--text-secondary)]"
                  >
                    <span className="text-[var(--text-primary)]">{r.nome}</span>
                    <span>{r.email}</span>
                    {r.telefone && <span>{r.telefone}</span>}
                    <span className="text-xs text-[var(--text-muted)]">
                      apagada em{" "}
                      {new Date(r.removidoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Serve para reconhecer a pessoa se ela se cadastrar de novo com os
              mesmos dados. A conta em si não volta.
            </p>
          </div>
        )}
      </div>

      {removerDe && (
        <ModalRemover
          usuario={removerDe}
          salvando={salvando}
          onCancelar={() => setRemoverDe(null)}
          onConfirmar={() => apagar(removerDe)}
        />
      )}

      {dadosDe && (
        <ModalDados
          usuario={dadosDe}
          salvando={salvando}
          onCancelar={() => setDadosDe(null)}
          onSalvar={(dados) => salvarDados(dadosDe, dados)}
        />
      )}

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

      {usuarioVinculos && (
        <ModalVinculos
          usuario={usuarioVinculos}
          unidades={unidades}
          salvando={salvando}
          onFechar={() => setVinculosDe(null)}
          onAdicionar={(unidadeId) =>
            adicionarVinculo(usuarioVinculos.id, unidadeId)
          }
          onMudarStatus={(vinculoId, status) =>
            mudarStatusVinculo(usuarioVinculos.id, vinculoId, status)
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
              <Button size="sm" variant="ghost" onClick={copiarSenha}>
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

/**
 * Apagar não tem volta: o modal diz o que vai embora e o que fica, e exige o
 * clique no botão vermelho — não é um `confirm()` que se aceita no reflexo.
 */
function ModalRemover({
  usuario,
  salvando,
  onCancelar,
  onConfirmar,
}: {
  usuario: Usuario;
  salvando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
          Apagar {usuario.nome}?
        </h2>

        <p className="text-sm text-[var(--text-secondary)]">
          A conta some da lista de vez. Vão junto as matrículas, os vínculos com
          unidades e as notificações dela.
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Ficam: as turmas e convites que ela criou (passam para você), a
          auditoria, e uma ficha no histórico com nome, email e telefone — para
          você reconhecê-la se voltar a se cadastrar.
        </p>

        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            className="flex-1"
            disabled={salvando}
            onClick={onConfirmar}
          >
            {salvando ? "Apagando..." : "Apagar de vez"}
          </Button>
          <Button variant="ghost" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalDados({
  usuario,
  salvando,
  onCancelar,
  onSalvar,
}: {
  usuario: Usuario;
  salvando: boolean;
  onCancelar: () => void;
  onSalvar: (dados: {
    nome: string;
    telefone: string;
    profissao: Profissao | null;
  }) => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [telefone, setTelefone] = useState(usuario.telefone ?? "");
  const [profissao, setProfissao] = useState<string>(usuario.profissao ?? "");

  const mudou =
    nome.trim() !== usuario.nome ||
    telefone.trim() !== (usuario.telefone ?? "") ||
    (profissao || null) !== usuario.profissao;

  // Nome completo e WhatsApp são o que faz a pessoa ser achada na lista e
  // avisada da vaga: aqui valem a mesma régua do cadastro.
  const erroNome = erroNomeCompleto(nome);
  const erroTel = erroWhatsapp(telefone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
        <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
          Dados de {usuario.nome}
        </h2>

        <div className="space-y-2">
          <Label htmlFor="dados-nome">Nome completo *</Label>
          <Input
            id="dados-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
          />
          {erroNome && (
            <p className="text-xs text-[var(--status-danger-fg)]">{erroNome}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dados-telefone">WhatsApp (com DDD) *</Label>
          <Input
            id="dados-telefone"
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(71) 99999-9999"
            maxLength={15}
            inputMode="tel"
          />
          {erroTel && (
            <p className="text-xs text-[var(--status-danger-fg)]">{erroTel}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dados-profissao">Profissão</Label>
          <select
            id="dados-profissao"
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

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={salvando || !mudou || !!erroNome || !!erroTel}
            onClick={() =>
              onSalvar({
                nome: nome.trim(),
                telefone: telefone.trim(),
                profissao: profissao ? (profissao as Profissao) : null,
              })
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
  const principal = vinculoPrincipal(usuario);
  const [role, setRole] = useState<Role>(usuario.role as Role);
  const [unidadeId, setUnidadeId] = useState<string>(
    principal?.unidadeId ?? "",
  );
  const [profissao, setProfissao] = useState<string>(usuario.profissao ?? "");

  const precisaUnidade = role !== "ORGANIZADOR";
  const outrasAtivas = usuario.vinculos.some(
    (v) => v.status === "ATIVO" && v.unidadeId !== unidadeId,
  );

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
            {outrasAtivas && (
              <p className="text-xs text-[var(--text-muted)]">
                Ao salvar, os vínculos ativos com outras unidades ficam
                inativos. Para a pessoa pertencer a mais de uma unidade, use a
                ação &ldquo;Vínculos com unidades&rdquo;.
              </p>
            )}
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

const BADGE_VINCULO: Record<
  VinculoStatus,
  "outline" | "neutral" | "warning"
> = {
  ATIVO: "outline",
  INATIVO: "neutral",
  PENDENTE_VALIDACAO: "warning",
};

const ORDEM_VINCULO: Record<VinculoStatus, number> = {
  PENDENTE_VALIDACAO: 0,
  ATIVO: 1,
  INATIVO: 2,
};

function ModalVinculos({
  usuario,
  unidades,
  salvando,
  onFechar,
  onAdicionar,
  onMudarStatus,
}: {
  usuario: Usuario;
  unidades: Unidade[];
  salvando: boolean;
  onFechar: () => void;
  onAdicionar: (unidadeId: string) => void;
  onMudarStatus: (vinculoId: string, status: "ATIVO" | "INATIVO") => void;
}) {
  const [novaUnidade, setNovaUnidade] = useState("");

  const ordenados = [...usuario.vinculos].sort(
    (a, b) =>
      ORDEM_VINCULO[a.status] - ORDEM_VINCULO[b.status] ||
      a.unidadeNome.localeCompare(b.unidadeNome, "pt-BR"),
  );

  // Unidades sem vínculo ativo podem ser adicionadas (inativas são reativadas
  // pelo mesmo caminho no servidor).
  const disponiveis = unidades.filter(
    (un) =>
      !usuario.vinculos.some(
        (v) => v.unidadeId === un.id && v.status !== "INATIVO",
      ),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Vínculos de {usuario.nome}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            As unidades (SAMU, UPA, hospital) às quais a pessoa pertence.
            Vínculos são desativados, nunca apagados — o histórico de matrículas
            continua contando a unidade da época.
          </p>
        </div>

        <div className="space-y-2">
          {ordenados.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate text-[var(--text-primary)]">
                  {v.unidadeNome}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={BADGE_VINCULO[v.status]}>
                    {ROTULO_VINCULO[v.status]}
                  </Badge>
                  {v.isCoordenador && (
                    <Badge variant="info">coordenação</Badge>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {v.status === "PENDENTE_VALIDACAO" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onMudarStatus(v.id, "ATIVO")}
                      disabled={salvando}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMudarStatus(v.id, "INATIVO")}
                      disabled={salvando}
                    >
                      Recusar
                    </Button>
                  </>
                )}
                {v.status === "ATIVO" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMudarStatus(v.id, "INATIVO")}
                    disabled={salvando}
                  >
                    Desativar
                  </Button>
                )}
                {v.status === "INATIVO" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMudarStatus(v.id, "ATIVO")}
                    disabled={salvando}
                  >
                    Reativar
                  </Button>
                )}
              </div>
            </div>
          ))}

          {ordenados.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--border-default)] p-4 text-center text-sm text-[var(--text-muted)]">
              Nenhum vínculo — adicione uma unidade abaixo.
            </p>
          )}
        </div>

        <div className="flex items-end gap-2 border-t border-[var(--border-default)] pt-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="nova-unidade">Adicionar vínculo</Label>
            <select
              id="nova-unidade"
              value={novaUnidade}
              onChange={(e) => setNovaUnidade(e.target.value)}
              className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Selecione a unidade…</option>
              {disponiveis.map((un) => (
                <option key={un.id} value={un.id}>
                  {un.nome}
                  {un.municipio ? ` — ${un.municipio}` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={salvando || !novaUnidade}
            onClick={() => {
              onAdicionar(novaUnidade);
              setNovaUnidade("");
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        <Button className="w-full" variant="ghost" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
