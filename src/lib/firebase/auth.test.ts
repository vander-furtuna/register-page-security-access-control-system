import { describe, expect, it } from "vitest";

import { authErrorMessage, authFailureKind, authFailureMessage, isAllowedEmail, safeNext } from "./auth";

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

describe("authFailureKind", () => {
  it("separa configuração ausente, permissão negada e o resto", () => {
    expect(authFailureKind(new Error("Configuração do Firebase ausente. Copie .env.example…"))).toBe(
      "config",
    );
    expect(
      authFailureKind(
        new Error(
          "permission_denied at /admins/abc: Client doesn't have permission to access the desired data.",
        ),
      ),
    ).toBe("permission");
    expect(authFailureKind(Object.assign(new Error("x"), { code: "PERMISSION_DENIED" }))).toBe("permission");
    expect(authFailureKind(new Error("network error"))).toBe("other");
    expect(authFailureKind(undefined)).toBe("other");
  });
});

describe("authFailureMessage", () => {
  it("diz com que conta a pessoa entrou e o que fazer", () => {
    expect(authFailureMessage("permission", "ana@alu.ufc.br")).toMatch(
      /^Você entrou como ana@alu\.ufc\.br, mas o banco recusou/,
    );
    expect(authFailureMessage("other")).toMatch(/^Você entrou, mas não foi possível/);
    expect(authFailureMessage("config")).toMatch(/Firebase não foi configurado/);
  });
});
