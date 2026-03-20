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
  categoriaId: string | null;
  cargaHoraria: number | null;
  publicoAlvoDescritivo: string | null;
}

interface Categoria {
  id: string;
  nome: string;
}

function parsePublicoAlvo(text: string | null): string[] {
  if (!text) return [];
  // Try to match known profissão labels back to keys
  const selected: string[] = [];
  for (const p of PROFISSOES) {
    if (text.includes(PROFISSAO_LABELS[p])) {
      selected.push(p);
    }
  }
  return selected;
}

export function EditarCursoForm({
  curso,
  categorias,
}: {
  curso: Curso;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<string[]>(
    parsePublicoAlvo(curso.publicoAlvoDescritivo),
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
          categoriaId: form.get("categoriaId") || undefined,
          cargaHoraria: form.get("cargaHoraria")
            ? Number(form.get("cargaHoraria"))
            : undefined,
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
        <Label htmlFor="categoriaId">Categoria</Label>
        <select
          id="categoriaId"
          name="categoriaId"
          defaultValue={curso.categoriaId || ""}
          className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
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
        <Label htmlFor="cargaHoraria">Carga Horária (minutos)</Label>
        <Input
          id="cargaHoraria"
          name="cargaHoraria"
          type="number"
          min={1}
          defaultValue={curso.cargaHoraria || ""}
          placeholder="Ex.: 480"
        />
      </div>

      <div className="space-y-2">
        <Label>Público-alvo (profissões)</Label>
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
