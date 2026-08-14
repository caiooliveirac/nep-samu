"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROFISSOES, PROFISSAO_LABELS } from "@/lib/enums";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  erroNomeCompleto,
  erroWhatsapp,
  formatarTelefone,
} from "@/lib/contato";

interface Props {
  token: string;
  unidade: { id: string; nome: string };
  municipio: string;
}

export function ConviteForm({ token, unidade, municipio }: Props) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    profissao: "",
    senha: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<null | { existente: boolean }>(null);

  const selectClass =
    "flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  // Nome completo e WhatsApp não são detalhe de formulário: sem os dois, a
  // pessoa não é achada na lista de presença nem avisada quando a vaga sai.
  const erroNome = erroNomeCompleto(form.nome);
  const erroTel = erroWhatsapp(form.telefone);
  const podeEnviar = !erroNome && !erroTel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (erroNome || erroTel) {
      setError(erroNome ?? erroTel ?? "");
      return;
    }

    setLoading(true);

    try {
      const r = await apiFetch<{ existente?: boolean }>(
        `/api/convites/${token}/registrar`,
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );
      setSuccess({ existente: r.existente ?? false });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Erro ao realizar cadastro. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--solid-success)]">
          <span className="text-lg text-white">✓</span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {success.existente ? "Vínculo solicitado!" : "Cadastro realizado!"}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {success.existente
            ? `Você já tinha conta no sistema — o vínculo com ${unidade.nome} foi solicitado e vale depois que o coordenador aprovar. Enquanto isso, sua conta continua funcionando normalmente.`
            : "Seu cadastro foi enviado para validação do coordenador. Você poderá acessar o sistema após a aprovação."}
        </p>
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || "/NEP"}/login`}
          className="mt-4 inline-block text-sm font-medium text-[var(--samu-blue)] hover:underline"
        >
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6"
    >
      {/* Locked fields */}
      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-xs">
          Município
        </Label>
        <Input value={municipio} disabled className="bg-[var(--bg-tertiary)]" />
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--text-secondary)] text-xs">
          Unidade / Serviço
        </Label>
        <Input
          value={unidade.nome}
          disabled
          className="bg-[var(--bg-tertiary)]"
        />
      </div>

      <hr className="border-[var(--border-muted)]" />

      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--text-secondary)]">
        <strong className="text-[var(--text-primary)]">
          Nome completo e WhatsApp são obrigatórios.
        </strong>{" "}
        É pelo nome completo que você é encontrado(a) na lista de inscritos, e
        é no WhatsApp que chega o aviso de vaga, de confirmação e de troca de
        data. Número errado = você perde a vaga.
      </div>

      {/* Editable fields */}
      <div className="space-y-2">
        <Label htmlFor="nome">Nome completo *</Label>
        <Input
          id="nome"
          required
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          placeholder="Nome e sobrenome, como no documento"
        />
        {form.nome.length > 0 && erroNome && (
          <p className="text-xs text-[var(--status-danger-fg)]">{erroNome}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="seu@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone">WhatsApp (com DDD) *</Label>
        <Input
          id="telefone"
          required
          inputMode="tel"
          maxLength={15}
          value={form.telefone}
          onChange={(e) =>
            setForm((f) => ({ ...f, telefone: formatarTelefone(e.target.value) }))
          }
          placeholder="(71) 99999-9999"
        />
        {form.telefone.length > 0 && erroTel && (
          <p className="text-xs text-[var(--status-danger-fg)]">{erroTel}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="profissao">Categoria Profissional *</Label>
        <select
          id="profissao"
          required
          value={form.profissao}
          onChange={(e) => setForm((f) => ({ ...f, profissao: e.target.value }))}
          className={selectClass}
        >
          <option value="">Selecione...</option>
          {PROFISSOES.map((p) => (
            <option key={p} value={p}>
              {PROFISSAO_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha de acesso *</Label>
        <Input
          id="senha"
          type="password"
          required
          minLength={10}
          value={form.senha}
          onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
          placeholder="Mínimo 10 caracteres"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Pelo menos 10 caracteres, combinando três de: minúscula, maiúscula,
          número e símbolo.
        </p>
      </div>

      {error && (
        <p className="text-sm font-medium text-[var(--status-danger-fg)]">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading || !podeEnviar}>
        {loading ? "Cadastrando..." : "Realizar Cadastro"}
      </Button>
    </form>
  );
}
