/** Conventional Commits em português, escopos de docs/versionamento.md. */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "cadastro",
        "membros",
        "registros",
        "credenciais",
        "dispositivo",
        "visao-geral",
        "auth",
        "ui",
        "design-system",
        "firebase",
        "deps",
        "release",
      ],
    ],
    // descrições em português começam em minúscula, mas podem citar nomes próprios
    "subject-case": [0],
  },
};

export default config;
