"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Search, Pencil, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";

interface Curso {
  id: string;
  nome: string;
  descricao: string | null;
  cargaHoraria: number | null;
  publicoAlvoDescritivo: string | null;
  categoria: { nome: string } | null;
}

export function CursosClient({ cursos }: { cursos: Curso[] }) {
  const [search, setSearch] = useState("");

  const filtered = cursos.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.categoria?.nome.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Catálogo de Cursos</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {cursos.length} curso(s) cadastrado(s)
          </p>
        </div>
        <Link href="/cursos/novo">
          <Button>
            <Plus className="h-4 w-4" />
            Novo Curso
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          placeholder="Buscar cursos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="Nenhum curso encontrado"
          description={
            search
              ? "Tente outro termo de busca"
              : "Cadastre o primeiro curso do catálogo"
          }
          action={
            !search && (
              <Link href="/cursos/novo">
                <Button>
                  <Plus className="h-4 w-4" />
                  Novo Curso
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Público-alvo</th>
                <th className="px-5 py-3 font-medium">Carga Horária</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((curso) => (
                <tr
                  key={curso.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">{curso.nome}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {curso.categoria?.nome || "—"}
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {curso.publicoAlvoDescritivo || "—"}
                  </td>
                  <td
                    className="px-5 py-3 text-[var(--text-secondary)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {curso.cargaHoraria
                      ? `${Math.floor(curso.cargaHoraria / 60)}h${curso.cargaHoraria % 60 > 0 ? `${curso.cargaHoraria % 60}min` : ""}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/cursos/${curso.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                      <Link href={`/cursos/${curso.id}/editar`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/turmas/nova?cursoId=${curso.id}`}>
                        <Button variant="ghost" size="sm">
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
