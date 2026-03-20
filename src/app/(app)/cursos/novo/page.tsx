"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function NovoCursoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
          publicoAlvoDescritivo: form.get("publicoAlvo") || undefined,
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
          <Label htmlFor="descricao">Descrição</Label>
          <textarea
            id="descricao"
            name="descricao"
            rows={3}
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
            placeholder="Ex.: 480"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="publicoAlvo">Público-alvo descritivo</Label>
          <Input
            id="publicoAlvo"
            name="publicoAlvo"
            placeholder="Ex.: Médicos e enfermeiros do APH"
          />
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
