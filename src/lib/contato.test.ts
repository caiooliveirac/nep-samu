import { describe, expect, it } from "vitest";
import { erroNomeCompleto, erroWhatsapp, formatarTelefone } from "./contato";

describe("erroNomeCompleto", () => {
  it("aceita nome com sobrenome", () => {
    expect(erroNomeCompleto("Maria Silva")).toBeNull();
    expect(erroNomeCompleto("  Ana   Paula Souza ")).toBeNull();
  });

  it("recusa só o primeiro nome", () => {
    expect(erroNomeCompleto("Maria")).not.toBeNull();
    // Inicial solta não conta como sobrenome.
    expect(erroNomeCompleto("Maria S")).not.toBeNull();
  });
});

describe("erroWhatsapp", () => {
  it("aceita celular e fixo com DDD", () => {
    expect(erroWhatsapp("(71) 99999-9999")).toBeNull();
    expect(erroWhatsapp("7133334444")).toBeNull();
  });

  it("recusa vazio, curto e celular sem o 9", () => {
    expect(erroWhatsapp("")).not.toBeNull();
    expect(erroWhatsapp("99999999")).not.toBeNull();
    // 11 dígitos com celular que não começa com 9: número digitado errado.
    expect(erroWhatsapp("(71) 88888-8888")).not.toBeNull();
  });
});

describe("formatarTelefone", () => {
  it("formata conforme o tamanho", () => {
    expect(formatarTelefone("71999999999")).toBe("(71) 99999-9999");
    expect(formatarTelefone("7133334444")).toBe("(71) 3333-4444");
  });
});
