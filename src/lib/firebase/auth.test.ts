import { describe, expect, it } from "vitest";

import { authErrorMessage, isAllowedEmail, safeNext } from "./auth";

describe("isAllowedEmail", () => {
  it("aceita @ufc.br e @alu.ufc.br, sem diferenciar maiúsculas", () => {
    expect(isAllowedEmail("gustavo.teixeira@ufc.br")).toBe(true);
    expect(isAllowedEmail("MariaClara@ALU.UFC.BR")).toBe(true);
  });

  it("recusa outros domínios, inclusive parecidos", () => {
    expect(isAllowedEmail("maria@gmail.com")).toBe(false);
    expect(isAllowedEmail("maria@ufc.br.evil.com")).toBe(false);
    expect(isAllowedEmail("maria@fakeufc.br")).toBe(false);
    expect(isAllowedEmail("maria@dc.ufc.br")).toBe(false);
    expect(isAllowedEmail(null)).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });
});

describe("authErrorMessage", () => {
  it("traduz os erros comuns", () => {
    expect(authErrorMessage({ code: "auth/invalid-credential" })).toMatch(/E-mail ou senha incorretos/);
    expect(authErrorMessage({ code: "auth/domain-not-allowed" })).toMatch(/@alu\.ufc\.br/);
  });

  it("ignora a janela do Google fechada pela pessoa", () => {
    expect(authErrorMessage({ code: "auth/popup-closed-by-user" })).toBeNull();
  });

  it("tem mensagem genérica para o resto", () => {
    expect(authErrorMessage(new Error("x"))).toMatch(/Não foi possível entrar/);
  });
});

describe("safeNext", () => {
  it("só aceita caminhos internos", () => {
    expect(safeNext("/membros?q=ana")).toBe("/membros?q=ana");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/login")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
