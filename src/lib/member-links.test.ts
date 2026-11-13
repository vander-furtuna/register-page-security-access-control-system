import { describe, expect, it } from "vitest";

import { cadastroHref, initials } from "./member-links";

describe("initials", () => {
  it("usa as duas primeiras palavras e ignora o Prof.", () => {
    expect(initials("Maria Clara Sousa")).toBe("MC");
    expect(initials("Prof. Gustavo Teixeira")).toBe("GT");
    expect(initials("Profa. Ana Lima")).toBe("AL");
    expect(initials("Ana")).toBe("AN");
    expect(initials("  ")).toBe("?");
  });
});

describe("cadastroHref", () => {
  it("leva nome, e-mail e modo para o cadastro", () => {
    expect(cadastroHref({ username: "João Pedro", email: "jp@alu.ufc.br" }, "FINGER_ONLY")).toBe(
      "/cadastro?nome=Jo%C3%A3o+Pedro&email=jp%40alu.ufc.br&modo=FINGER_ONLY",
    );
  });
});
