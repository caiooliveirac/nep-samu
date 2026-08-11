"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Par de campos "nova senha" + "repetir", com a regra escrita na tela em vez de
 * só no erro depois de enviar.
 */
export function CampoNovaSenha() {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <Input
          id="novaSenha"
          name="novaSenha"
          type="password"
          placeholder="••••••••••"
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Pelo menos 10 caracteres, combinando três destes: letra minúscula,
          letra maiúscula, número e símbolo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repetirSenha">Repita a nova senha</Label>
        <Input
          id="repetirSenha"
          name="repetirSenha"
          type="password"
          placeholder="••••••••••"
          required
          autoComplete="new-password"
        />
      </div>
    </>
  );
}
