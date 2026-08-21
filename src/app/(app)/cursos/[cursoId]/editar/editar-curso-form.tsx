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

interface Curso {
  id: string;
  nome: string;
  descricao: string | null;
  cargaHoraria: number | null;
  publicoAlvoProfissoes: string[] | null;
  publicoAlvoDescritivo: string | null;
}

/**
 * Cursos antigos só têm a frase ("Médico(a), Enfermeiro(a)"): dá para
 * reconhecer as profissões nela até o curso ser salvo de novo, quando a lista
 * passa a ser dado de verdade.
 */
function parsePublicoAlvo(text: string | null): string[] {
  if (!text) return [];
  return PROFISSOES.filter((p) => text.includes(PROFISSAO_LABELS[p]));
}

export function EditarCursoForm({ curso }: { curso: Curso }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<string[]>(
    curso.publicoAlvoProfissoes?.length
      ? curso.publicoAlvoProfissoes
      : parsePublicoAlvo(curso.publicoAlvoDescritivo),
  );

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
      await apiFetch(`/api/cursos/${curso.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: form.get("nome"),
          descricao: form.get("descricao") || undefined,
          cargaHoraria: form.get("cargaHoraria")
            ? Number(form.get("cargaHoraria"))
            : undefined,
          publicoAlvoProfissoes: publicoAlvo,
          publicoAlvoDescritivo: publicoAlvoText || undefined,
        }),
      });

      toast.success("Curso atualizado com sucesso");
      router.push(`/cursos/${curso.id}`);
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar curso");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          defaultValue={curso.nome}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={curso.descricao || ""}
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
          defaultValue={curso.cargaHoraria || ""}
          placeholder="Ex.: 8"
        />
      </div>

      <div className="space-y-2">
        <Label>Categorias profissionais que o curso atende</Label>
        <p className="text-xs text-[var(--text-muted)]">
          Ficam salvas no curso: toda turma nova deste curso já nasce com estas
          categorias marcadas como elegíveis.
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
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
