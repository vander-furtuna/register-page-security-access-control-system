# Stack da v2

A v2 é uma **reescrita**: atualiza a base (Next.js, Tailwind, Firebase), troca o HeroUI por shadcn/ui e organiza o projeto para crescer. Critério de escolha: bibliotecas atuais, muito usadas e com boa documentação, sem dependência que só o PET conheça.

Versões de referência (novembro/2026): Next.js 16.4, Tailwind CSS 4.3, Firebase JS SDK 13.1, Base UI 1.8. Na fase 0, instale a versão estável mais recente de cada pacote (`@latest`) e registre no `CHANGELOG.md` as versões efetivamente instaladas.

## Escolhas

| Área | v1 (hoje) | v2 | Observação |
|---|---|---|---|
| Runtime | Node não fixado | **Node.js 24 LTS** (`.nvmrc`, `engines`) | Next 16 exige ≥ 20.9 |
| Framework | Next.js 15.3 | **Next.js 16** (App Router, Turbopack) | `npx @next/codemod upgrade` não vale a pena: a v2 parte de um scaffold novo |
| UI runtime | React 19 | **React 19** (última estável) | Avaliar React Compiler (`reactCompiler: true`) depois da fase 2 |
| Linguagem | TS 5 + `firebase.js` em JS | **TypeScript strict** em tudo | Nada de `.js` em `src/` |
| Estilo | Tailwind 3.4 + `@tailwindcss/postcss` 4 (conflito) | **Tailwind CSS 4** (configuração no CSS, `@theme`) | Sem `tailwind.config.js`; `postcss.config.mjs` só com `@tailwindcss/postcss` |
| Componentes | HeroUI 2.7 + framer-motion | **shadcn/ui** (CLI v4, primitivas **Base UI**) + `tw-animate-css` | Componentes copiados para `src/components/ui/`, editáveis. Base UI é o padrão do shadcn desde jul/2026; Radix continua suportado |
| Ícones | emoji 🔐💳👆 | **lucide-react** + ícones de marca próprios | |
| Tema claro/escuro | — | **next-themes** (`attribute="data-theme"`) | |
| Toasts | — | **sonner** (via shadcn) | |
| Formulários | estado manual | **react-hook-form + zod** (via shadcn) | Esquemas zod reaproveitados para validar dados do Firebase |
| Tabelas | — | **@tanstack/react-table** (padrão Data Table do shadcn) | Membros e Registros |
| Gráficos | — | **shadcn Chart** (Recharts) | Acessos por hora |
| Datas | `toISOString` | **date-fns** + `ptBR` | Fuso `America/Fortaleza` |
| Dados | Firebase 11, `onValue` direto no componente | **Firebase JS SDK 13** (modular) + hooks próprios em `src/lib/firebase` | Ver abaixo |
| Testes | — | **Vitest + Testing Library** (unidade), **Playwright** (fluxos críticos) | Emulador do Firebase nos testes |
| Qualidade | ESLint 9 (FlatCompat) | **ESLint 9 flat** (`eslint-config-next`) + **Prettier** + `prettier-plugin-tailwindcss` | |
| Commits | livre | **Conventional Commits** com **commitlint**, **Husky + lint-staged** | Ver `docs/versionamento.md` |
| CI | — | **GitHub Actions**: lint, typecheck, test, build em todo PR | |
| Pacotes | `package-lock.json` + `bun.lock` | **pnpm 12** e só `pnpm-lock.yaml` | Versão fixada em `packageManager`; scripts de instalação só com aprovação em `allowBuilds` (`pnpm-workspace.yaml`) |

Sai da v2: `@heroui/react`, `framer-motion`, `autoprefixer`, `postcss.config.js`, `tailwind.config.js`, `src/app/providers.tsx` (HeroUIProvider), `src/app/firebase.js`.

## Tokens do PET Lock no Tailwind 4 e no shadcn/ui

`src/styles/tokens.css` é cópia de `docs/design-system/tokens.css` (não editar à mão: mude o `tokens.json` e regenere). O `globals.css` liga tudo:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../styles/tokens.css";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

@theme inline {
  /* fontes (next/font define --font-sora, --font-plex-sans, --font-plex-mono) */
  --font-display: var(--font-sora);
  --font-sans: var(--font-plex-sans);
  --font-mono: var(--font-plex-mono);

  /* tokens PET Lock como utilitários: bg-surface, text-ink-muted, bg-finger-soft, text-rfid-ink… */
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-sunken: var(--surface-sunken);
  --color-surface-hover: var(--surface-hover);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --color-ink-subtle: var(--ink-subtle);
  --color-chassis: var(--chassis);
  --color-chassis-raised: var(--chassis-raised);
  --color-on-chassis: var(--on-chassis);
  --color-on-chassis-muted: var(--on-chassis-muted);
  --color-lock: var(--lock);
  --color-lock-hover: var(--lock-hover);
  --color-on-lock: var(--on-lock);
  --color-lock-ink: var(--lock-ink);
  --color-lock-soft: var(--lock-soft);
  --color-lock-lime: var(--lock-lime);
  --color-lock-teal: var(--lock-teal);
  --color-lcd-ink: var(--lcd-ink);
  --color-finger: var(--finger);
  --color-finger-ink: var(--finger-ink);
  --color-finger-soft: var(--finger-soft);
  --color-rfid: var(--rfid);
  --color-on-rfid: var(--on-rfid);
  --color-rfid-ink: var(--rfid-ink);
  --color-rfid-soft: var(--rfid-soft);
  --color-danger: var(--danger);
  --color-on-danger: var(--on-danger);
  --color-danger-ink: var(--danger-ink);
  --color-danger-soft: var(--danger-soft);
  --color-offline: var(--offline);
  --color-offline-ink: var(--offline-ink);
  --color-offline-soft: var(--offline-soft);
  --color-master: var(--master);
  --color-master-soft: var(--master-soft);
  --color-focus: var(--focus);

  /* variáveis semânticas que os componentes do shadcn/ui usam */
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --color-card: var(--surface);
  --color-card-foreground: var(--ink);
  --color-popover: var(--surface);
  --color-popover-foreground: var(--ink);
  --color-primary: var(--lock);
  --color-primary-foreground: var(--on-lock);
  --color-secondary: var(--surface-sunken);
  --color-secondary-foreground: var(--ink);
  --color-muted: var(--surface-sunken);
  --color-muted-foreground: var(--ink-muted);
  --color-accent: var(--surface-hover);
  --color-accent-foreground: var(--ink);
  --color-destructive: var(--danger);
  --color-border: var(--line);
  --color-input: var(--line-strong);
  --color-ring: var(--focus);
  --color-chart-1: var(--lock);
  --color-chart-2: var(--danger);
  --color-chart-3: var(--finger);
  --color-chart-4: var(--rfid);
  --color-chart-5: var(--offline);
  --color-sidebar: var(--chassis);
  --color-sidebar-foreground: var(--on-chassis);
  --color-sidebar-primary: var(--lock);
  --color-sidebar-primary-foreground: var(--on-lock);
  --color-sidebar-accent: var(--chassis-raised);
  --color-sidebar-accent-foreground: var(--on-chassis);
  --color-sidebar-border: var(--chassis-raised);
  --color-sidebar-ring: var(--lock);
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans antialiased; }
}
```

Regras:

- Depois de `pnpm dlx shadcn@latest init` e de cada `pnpm dlx shadcn@latest add`, troque `from "cn"` por `from "@/lib/utils"` nos arquivos gerados e **apague** os blocos `:root { --background: … }` e `.dark { … }` que o CLI escrever no `globals.css`. As cores vêm só do `tokens.css`.
- O token do cartão RFID chama `rfid` justamente porque `--card` é do shadcn (fundo de card).
- Ajuste as variantes dos componentes do shadcn (Button, Badge, Alert…) para as do design system em vez de criar componentes paralelos. Ex.: `Button` com `variant: default | secondary | ghost | destructive | destructive-soft` e `size: sm | default | lg | icon`.

## Fontes

```ts
// src/app/fonts.ts
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
export const sora = Sora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-sora" });
export const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
```

## Dados em tempo real

O Firebase empurra os dados (`onValue`), então não use TanStack Query para listeners. Padrão:

```ts
// src/lib/firebase/use-rtdb-value.ts
export function useRtdbValue<T>(path: string | null, parse: (raw: unknown) => T) {
  // assina onValue(ref(db, path)), guarda { status: "loading" | "ready" | "missing" | "error", data },
  // valida com zod via `parse`, remove o listener no cleanup.
}
```

Hooks de domínio (`useSystemMode`, `useLogs`, `useDeviceStatus`…) usam esse hook e validam com esquemas zod em `src/lib/firebase/schemas.ts`. `status: "missing"` em `devices/*` significa firmware 2.0 → mostrar o fallback.
