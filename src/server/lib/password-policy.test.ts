import { describe, expect, it } from "vitest";
import { getPasswordPolicyError } from "./password-policy";

describe("política de senha", () => {
  it("recusa senha curta", () => {
    expect(getPasswordPolicyError("Ab1!x")).toMatch(/pelo menos 10/);
  });

  it("recusa senha longa sem variedade", () => {
    expect(getPasswordPolicyError("abcdefghijkl")).toMatch(/três grupos/);
  });

  it("recusa a senha provisória que os organizadores entregam", () => {
    expect(getPasswordPolicyError("123456")).not.toBeNull();
  });

  it("aceita senha com tamanho e variedade", () => {
    expect(getPasswordPolicyError("Chuva-Lenta-2026")).toBeNull();
  });

  it("recusa repetir a senha atual", () => {
    expect(
      getPasswordPolicyError("Chuva-Lenta-2026", "Chuva-Lenta-2026"),
    ).toMatch(/diferente da senha atual/);
  });
});
