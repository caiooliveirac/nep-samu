"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Search, Pencil, CalendarPlus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";

interface Curso {
  id: string;
  nome: string;
  descricao: string | null;
  cargaHoraria: number | null;
  publicoAlvoDescritivo: string | null;
}

export function CursosClient({ cursos }: { cursos: Curso[] }) {
  const [search, setSearch] = useState("");

  const filtered = cursos.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()),
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
          <table className="w-full min-w-[58rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-muted)] text-left text-xs text-[var(--text-muted)]">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Categorias profissionais</th>
                <th className="px-5 py-3 font-medium">Carga horária</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((curso) => (
                <tr
                  key={curso.id}
                  className="border-b border-[var(--border-muted)] transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <td className="px-5 py-3 font-medium">
                    {/* O nome também abre o curso: é onde a mão vai primeiro. */}
                    <Link
                      href={`/cursos/${curso.id}`}
                      className="text-[var(--text-primary)] hover:underline"
                    >
                      {curso.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {curso.publicoAlvoDescritivo || "—"}
                  </td>
                  <td
                    className="px-5 py-3 text-[var(--text-secondary)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {curso.cargaHoraria ? `${curso.cargaHoraria}h` : "—"}
                  </td>
                  {/* O lápis e o calendário eram ícones mudos, sem nem title:
                      ninguém adivinhava que um deles abria uma turma nova
                      deste curso. Agora cada ação diz o que faz. */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/cursos/${curso.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye />
                          Ver curso
                        </Button>
                      </Link>
                      <Link href={`/cursos/${curso.id}/editar`}>
                        <Button variant="outline" size="sm">
                          <Pencil />
                          Editar
                        </Button>
                      </Link>
                      <Link href={`/turmas/nova?cursoId=${curso.id}`}>
                        <Button variant="outline" size="sm">
                          <CalendarPlus />
                          Abrir turma
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
