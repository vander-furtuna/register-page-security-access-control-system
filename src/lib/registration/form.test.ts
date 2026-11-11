import { describe, expect, it } from "vitest";

import { EMPTY_FORM, registrationFormSchema } from "./form";

const schema = registrationFormSchema(() => new Date("2026-11-10T17:00:00Z"));
const valid = { ...EMPTY_FORM, username: "Maria Clara Sousa", email: "mariaclara@alu.ufc.br" };
const errorsOf = (values: object) => {
  const result = schema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("registrationFormSchema", () => {
  it("aceita um cadastro válido e apara espaços", () => {
    const parsed = schema.parse({
      ...valid,
      username: "  Maria Clara Sousa ",
      email: " mariaclara@alu.ufc.br ",
    });
    expect(parsed.username).toBe("Maria Clara Sousa");
    expect(parsed.email).toBe("mariaclara@alu.ufc.br");
  });

  it("exige nome e e-mail", () => {
    expect(errorsOf({ ...valid, username: "", email: "" })).toEqual({
      username: "Digite o nome completo da pessoa.",
      email: "Digite o e-mail da pessoa.",
    });
  });

  it("exige e-mail da UFC, exceto para visitantes", () => {
    expect(errorsOf({ ...valid, email: "maria@gmail.com" }).email).toMatch(/@alu\.ufc\.br ou @ufc\.br/);
    expect(errorsOf({ ...valid, email: "maria@gmail.com", role: "visitante" })).toEqual({});
    expect(errorsOf({ ...valid, email: "maria@" }).email).toMatch(/e-mail válido/);
  });

  it("não aceita validade no passado", () => {
    expect(errorsOf({ ...valid, validUntil: "2026-11-09" }).validUntil).toMatch(/já passou/);
    expect(errorsOf({ ...valid, validUntil: "2026-11-10" })).toEqual({});
    expect(errorsOf({ ...valid, validUntil: "" })).toEqual({});
  });
});
