# Contribuindo com o PET Lock

## Ambiente

- Node.js 24 LTS (`nvm use` lê o `.nvmrc`) e npm.
- `cp .env.example .env.local` e peça as credenciais a um admin do PET. Nunca commite `.env*`.
- Para desenvolver sem tocar no banco real: `npm run emulators` em um terminal e `npm run seed:emulator` em outro (disponível a partir da fase 0).

## Fluxo

1. Parta da branch `v2` atualizada: `git switch v2 && git pull`.
2. Crie uma branch: `feat/<tema>`, `fix/<tema>`, `docs/<tema>` ou `chore/<tema>`.
3. Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) (o commitlint confere): `feat(cadastro): …`.
4. Antes de abrir o PR: `npm run lint && npm run typecheck && npm run test && npm run build`.
5. PR para `v2` usando o template, com prints das telas alteradas (claro, escuro e celular) e uma linha no `CHANGELOG.md` em **Não lançado**.
6. Merge com squash depois da CI verde.

Detalhes de branches, tags e do PR final para o repositório original: [`docs/versionamento.md`](docs/versionamento.md).

## Padrões

- Interface em português do Brasil e no vocabulário do projeto (membro, credencial, digital, cartão, Modo mestre, sem dono).
- UI segue o design system (`docs/design-system/`) e as telas de referência (`docs/design/telas/`).
- Caminhos do Firebase só em `src/lib/firebase/paths.ts`. Qualquer mudança de formato no banco precisa de entrada em `docs/arquitetura/contrato-firmware.md`.
- A fechadura funciona sem o site: nenhuma tela pode exigir dados que o firmware atual não publica sem ter um fallback.
