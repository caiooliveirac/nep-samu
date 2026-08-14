"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";

interface UnidadeOpcao {
  id: string;
  nome: string;
  municipio: string | null;
  coordenador: string | null;
  atual: boolean;
}

interface Estado {
  unidades: UnidadeOpcao[];
  atual: { id: string; nome: string } | null;
  pendente: { id: string; nome: string } | null;
}

/**
 * A pessoa muda de plantão, de município, de serviço — e até aqui só um
 * organizador conseguia registrar isso. Agora ela mesma pede, e quem decide é
 * o coordenador da unidade de destino. O preço do pedido (perder o acesso até
 * a aprovação) é dito antes, no modal, com o nome de quem vai decidir.
 */
export function TrocarUnidadeCard() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [escolhida, setEscolhida] = useState<UnidadeOpcao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [selecionada, setSelecionada] = useState("");

  useEffect(() => {
    apiFetch<Estado>("/api/perfil/unidade")
      .then(setEstado)
      .catch(() => setEstado(null));
  }, []);

  if (!estado) return null;

  const disponiveis = estado.unidades.filter((u) => !u.atual);

  async function confirmar(unidade: UnidadeOpcao) {
    setEnviando(true);
    try {
      await apiFetch("/api/perfil/unidade", {
        method: "POST",
        body: JSON.stringify({ unidadeId: unidade.id }),
      });
      setEscolhida(null);
      setSelecionada("");
      toast.success(
        `Pedido enviado. Seu acesso volta quando ${
          unidade.coordenador ?? "o coordenador"
        } aprovar.`,
      );
      // O acesso caiu junto com o vínculo: recarregar leva ao login.
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o pedido.",
      );
      setEnviando(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Minha unidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {estado.atual
              ? `Você trabalha em ${estado.atual.nome}.`
              : "Você não tem vínculo ativo com nenhuma unidade."}
          </p>

          {estado.pendente ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Seu pedido para{" "}
              <strong className="text-[var(--text-primary)]">
                {estado.pendente.nome}
              </strong>{" "}
              aguarda aprovação do coordenador.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1 space-y-2">
                <Label htmlFor="nova-unidade-perfil">
                  Passei a trabalhar em outra unidade
                </Label>
                <select
                  id="nova-unidade-perfil"
                  value={selecionada}
                  onChange={(e) => setSelecionada(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="">Selecione a unidade…</option>
                  {disponiveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                      {u.municipio ? ` — ${u.municipio}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                disabled={!selecionada}
                onClick={() => {
                  const u = disponiveis.find((x) => x.id === selecionada);
                  if (u) setEscolhida(u);
                }}
              >
                Pedir transferência
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {escolhida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              Pedir transferência para {escolhida.nome}?
            </h2>

            <p className="text-sm text-[var(--text-secondary)]">
              Você perde o acesso à plataforma na hora e seu cadastro fica
              pendente de aprovação
              {escolhida.coordenador ? (
                <>
                  {" "}
                  de{" "}
                  <strong className="text-[var(--text-primary)]">
                    {escolhida.coordenador}
                  </strong>
                  , coordenador(a) de {escolhida.nome}.
                </>
              ) : (
                <>
                  {" "}
                  — {escolhida.nome} ainda não tem coordenador cadastrado, então
                  quem aprova é o organizador do NEP.
                </>
              )}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {estado.atual
                ? `Seu vínculo com ${estado.atual.nome} é desligado. `
                : ""}
              Enquanto o pedido não for aprovado, você não consegue entrar nem
              se inscrever em turmas. Suas inscrições atuais continuam
              registradas.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                disabled={enviando}
                onClick={() => confirmar(escolhida)}
              >
                {enviando ? "Enviando..." : "Confirmar pedido"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEscolhida(null)}
                disabled={enviando}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
