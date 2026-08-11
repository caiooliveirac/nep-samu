"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { PROFISSOES, PROFISSAO_LABELS } from "@/lib/enums";
import type { Profissao } from "@/lib/enums";

interface Curso {
  id: string;
  nome: string;
}

export function NovaTurmaForm({ cursos }: { cursos: Curso[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCursoId = searchParams.get("cursoId") || "";

  const [loading, setLoading] = useState(false);
  const [profissoesSelecionadas, setProfissoesSelecionadas] = useState<string[]>([
    ...PROFISSOES,
  ]);

  const [publicoExterno, setPublicoExterno] = useState("");

  function toggleProfissao(p: string) {
    setProfissoesSelecionadas((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      const body = {
        cursoId: form.get("cursoId"),
        titulo: form.get("titulo"),
        descricao: form.get("descricao") || undefined,
        dataInicio: form.get("dataInicio"),
        dataFim: form.get("dataFim") || undefined,
        horaInicio: form.get("horaInicio"),
        horaFim: form.get("horaFim") || undefined,
        local: form.get("local") || undefined,
        modalidade: form.get("modalidade"),
        vagasTotais: Number(form.get("vagasTotais")),
        modoCota: "LIVRE",
        redistribuirOciosas: false,
        filaEsperaHabilitada: true,
        profissoesElegiveis: profissoesSelecionadas,
        publicoExterno: publicoExterno.trim() || undefined,
        escopoElegibilidade: "REGIONAL_INTEIRA",
        inscricaoInicio: `${form.get("inscricaoInicio")}T00:00:00.000Z`,
        inscricaoFim: `${form.get("inscricaoFim")}T23:59:59.000Z`,
        prazoConfirmacaoDias: Number(form.get("prazoConfirmacaoDias")) || 3,
      };

      await apiFetch("/api/turmas", {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success("Turma criada com sucesso");
      router.push("/turmas");
    } catch {
      toast.error("Erro ao criar turma");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6"
    >
      {/* Curso */}
      <div className="space-y-2">
        <Label htmlFor="cursoId">Curso *</Label>
        <select
          id="cursoId"
          name="cursoId"
          required
          defaultValue={preselectedCursoId}
          className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">Selecione um curso</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Título */}
      <div className="space-y-2">
        <Label htmlFor="titulo">Título da turma *</Label>
        <Input
          id="titulo"
          name="titulo"
          required
          placeholder="Ex.: Via Aérea Avançada - Turma 1/2026"
        />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          className="flex w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          placeholder="Informações adicionais sobre esta turma..."
        />
      </div>

      {/* Datas e horários */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Data de início *</Label>
          <Input id="dataInicio" name="dataInicio" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataFim">Data de término</Label>
          <Input id="dataFim" name="dataFim" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horaInicio">Hora de início *</Label>
          <Input id="horaInicio" name="horaInicio" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="horaFim">Hora de término</Label>
          <Input id="horaFim" name="horaFim" type="time" />
        </div>
      </div>

      {/* Local e modalidade */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="local">Local</Label>
          <Input id="local" name="local" placeholder="Ex.: Auditório do NEP" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="modalidade">Modalidade *</Label>
          <select
            id="modalidade"
            name="modalidade"
            required
            defaultValue="PRESENCIAL"
            className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <option value="PRESENCIAL">Presencial</option>
            <option value="ONLINE">Online</option>
            <option value="HIBRIDO">Híbrido</option>
          </select>
        </div>
      </div>

      {/* Vagas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vagasTotais">Vagas totais *</Label>
          <Input
            id="vagasTotais"
            name="vagasTotais"
            type="number"
            min={1}
            required
            placeholder="Ex.: 30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prazoConfirmacaoDias">Prazo confirmação (dias)</Label>
          <Input
            id="prazoConfirmacaoDias"
            name="prazoConfirmacaoDias"
            type="number"
            min={1}
            defaultValue={3}
          />
        </div>
      </div>

      {/* Período de inscrição */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inscricaoInicio">Inscrições abrem em *</Label>
          <Input id="inscricaoInicio" name="inscricaoInicio" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inscricaoFim">Inscrições encerram em *</Label>
          <Input id="inscricaoFim" name="inscricaoFim" type="date" required />
        </div>
      </div>

      {/* Profissões elegíveis */}
      <div className="space-y-2">
        <Label>Profissões elegíveis *</Label>
        <div className="flex flex-wrap gap-2">
          {PROFISSOES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggleProfissao(p)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                profissoesSelecionadas.includes(p)
                  ? "bg-[var(--samu-blue)] text-white"
                  : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {PROFISSAO_LABELS[p as Profissao]}
            </button>
          ))}
        </div>
        {profissoesSelecionadas.length === 0 && !publicoExterno.trim() && (
          <p className="text-xs text-[var(--status-danger)]">
            Selecione ao menos uma profissão, ou descreva o público externo
            abaixo
          </p>
        )}
      </div>

      {/* Público de fora do SAMU */}
      <div className="space-y-2">
        <Label htmlFor="publico-externo">Público externo</Label>
        <Input
          id="publico-externo"
          value={publicoExterno}
          onChange={(e) => setPublicoExterno(e.target.value)}
          placeholder="Ex.: SAMU Solidário — Medicina Valença"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Preencha só quando a turma for para gente de fora do SAMU (parceria,
          empresa, rede de ensino). Nesse caso pode deixar as profissões sem
          marcar — a turma não aparece para os profissionais.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={
            loading ||
            (profissoesSelecionadas.length === 0 && !publicoExterno.trim())
          }
        >
          {loading ? "Criando..." : "Criar Turma"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
