"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

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

export function EditarCursoForm({
  curso,
  categorias,
}: {
  curso: Curso;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
          publicoAlvoDescritivo: form.get("publicoAlvo") || undefined,
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
        <Label htmlFor="publicoAlvo">Público-alvo descritivo</Label>
        <Input
          id="publicoAlvo"
          name="publicoAlvo"
          defaultValue={curso.publicoAlvoDescritivo || ""}
          placeholder="Ex.: Médicos e enfermeiros do APH"
        />
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
