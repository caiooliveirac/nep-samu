"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { PROFISSOES, PROFISSAO_LABELS } from "@/lib/enums";
import type { Profissao } from "@/lib/enums";

export default function NovoCursoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<string[]>([]);

  function toggleProfissao(p: string) {
    setPublicoAlvo((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  const publicoAlvoText = publicoAlvo
    .map((p) => PROFISSAO_LABELS[p as Profissao])
    .join(", ");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);

    try {
      await apiFetch("/api/cursos", {
        method: "POST",
        body: JSON.stringify({
          nome: form.get("nome"),
          descricao: form.get("descricao") || undefined,
          cargaHoraria: form.get("cargaHoraria")
            ? Number(form.get("cargaHoraria"))
            : undefined,
          // As profissões vão como dado; o texto é só o rótulo que a tela lê.
          publicoAlvoProfissoes: publicoAlvo,
          publicoAlvoDescritivo: publicoAlvoText || undefined,
        }),
      });

      toast.success("Curso criado com sucesso");
      router.push("/cursos");
    } catch {
      toast.error("Erro ao criar curso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Novo Curso</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Cadastre um novo curso no catálogo
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Curso *</Label>
          <Input
            id="nome"
            name="nome"
            required
            placeholder="Ex.: Via Aérea Avançada"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição (opcional)</Label>
          <textarea
            id="descricao"
            name="descricao"
            rows={3}
            className="flex w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            placeholder="Descrição do curso..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargaHoraria">Carga horária (horas)</Label>
          <Input
            id="cargaHoraria"
            name="cargaHoraria"
            type="number"
            min={1}
            placeholder="Ex.: 8"
          />
        </div>

        <div className="space-y-2">
          <Label>Categorias profissionais que o curso atende</Label>
          <p className="text-xs text-[var(--text-muted)]">
            Ficam salvas no curso: toda turma nova deste curso já nasce com
            estas categorias marcadas como elegíveis.
          </p>
          <div className="flex flex-wrap gap-2">
            {PROFISSOES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleProfissao(p)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  publicoAlvo.includes(p)
                    ? "bg-[var(--samu-blue)] text-white"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                {PROFISSAO_LABELS[p as Profissao]}
              </button>
            ))}
          </div>
          {publicoAlvoText && (
            <p className="text-xs text-[var(--text-muted)]">
              Público-alvo: {publicoAlvoText}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Criar Curso"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
