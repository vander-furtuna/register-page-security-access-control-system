# Versionamento e caminho até o pull request

A v2 é desenvolvida num **fork** do repositório original (`JonasFortes12/register-page-security-access-control-system`) e chega a ele por um pull request que substitui o site atual. Até lá, a versão antiga continua intacta e com uma linha própria para correções.

## Remotos

| Remoto | Aponta para | Uso |
|---|---|---|
| `upstream` | `github.com/JonasFortes12/register-page-security-access-control-system` | Repositório original. Só leitura para nós. Destino do PR final. |
| `origin` | `github.com/<seu-usuario>/register-page-security-access-control-system` (fork) | Onde as branches e tags são publicadas. |

Configuração (uma vez, depois de criar o fork no GitHub):

```bash
git remote add origin https://github.com/<seu-usuario>/register-page-security-access-control-system.git
git push -u origin main release/v1 v2
git push origin --tags
```

## Branches

```
upstream/main ──●──●──● (v1.0.0)                       ← site atual, não mexemos
                         \
release/v1                ●  (v1.1.0)                  ← cadastro com 3 modos (firmware 2.0); só correções
                           \
v2                          ●──●──●──●──●──●  (v2.0.0-alpha.N … rc.N)   ← integração da v2
                                 \      /
feat/fase-1-auth, feat/…          ●──●                ← uma branch por tarefa/fase, PR para v2
```

- **`main`**: espelho do `upstream/main`. Nunca recebe commits nossos.
- **`release/v1`**: a versão legada (HeroUI). Só `fix:` urgentes enquanto a v2 não substitui o site. Cada correção gera `v1.1.x`.
- **`v2`**: branch de integração da reescrita. Sempre compilando (CI verde).
- **`feat/*`, `fix/*`, `chore/*`, `docs/*`**: saem de `v2` e voltam para `v2` por PR no fork (mesmo trabalhando sozinho: o PR roda a CI e registra a mudança). Merge com **squash**, título do PR no formato Conventional Commits.

## Versões (SemVer)

| Tag | Significado |
|---|---|
| `v1.0.0` | Último commit do repositório original (`ce40087`), o site em produção hoje. |
| `v1.1.0` | Cadastro com os 3 modos (`CARD_AND_FINGER`, `CARD_ONLY`, `FINGER_ONLY`) exigidos pelo firmware 2.0. |
| `v2.0.0-alpha.N` | Fim de cada fase do roadmap (alpha.0 = fase 0, alpha.1 = fase 1…). |
| `v2.0.0-beta.N` | Todas as telas prontas; testes com a fechadura real. |
| `v2.0.0-rc.N` | Candidato a substituir o site; é o que vai no PR para o upstream. |
| `v2.0.0` | Tag criada **depois** do merge no `upstream/main`. |

O campo `version` do `package.json` acompanha a tag (o `name` passa a ser `pet-lock-web` na fase 0).

Criar uma pré-release:

```bash
npm version 2.0.0-alpha.1 --no-git-tag-version   # atualiza package.json
# atualizar CHANGELOG.md (mover itens de "Não lançado" para a nova versão)
git commit -am "chore(release): v2.0.0-alpha.1"
git tag -a v2.0.0-alpha.1 -m "v2.0.0-alpha.1 — fase 1: shell e autenticação"
git push origin v2 --follow-tags
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) em português, verificados pelo commitlint (fase 0):

```
<tipo>(<escopo>): <descrição no imperativo, minúscula, sem ponto>
```

- Tipos: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- Escopos: `cadastro`, `membros`, `registros`, `credenciais`, `dispositivo`, `visao-geral`, `auth`, `ui`, `design-system`, `firebase`, `deps`, `release`.
- Quebra de compatibilidade (ex.: novo caminho obrigatório no banco): `feat(firebase)!: …` + rodapé `BREAKING CHANGE: …`.

Exemplos: `feat(cadastro): acompanhar passos do cadastro ao vivo`, `fix(registros): ordenar por horário real em vez da chave`, `chore(deps): atualizar next para 16.4`.

## Changelog

`CHANGELOG.md` no formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Toda PR para `v2` adiciona uma linha em **Não lançado**. Na release, os itens vão para a seção da nova versão.

## Mantendo o fork em dia

Antes de cada `rc` e do PR final:

```bash
git fetch upstream
git switch release/v1 && git merge --ff-only upstream/main || git merge upstream/main
git switch v2 && git merge release/v1        # traz eventuais correções do site antigo
```

## O pull request final (fork `v2` → upstream `main`)

1. Abrir uma **issue** ou PR em rascunho no repositório original cedo (após a fase 2), explicando a proposta e pedindo opinião do Jonas.
2. Quando `v2.0.0-rc.N` estiver estável: PR de `<seu-usuario>:v2` para `JonasFortes12:main`, título `feat!: v2.0.0 — reescrita do painel PET Lock`, usando o template `.github/pull_request_template.md`.
3. A descrição precisa ter: resumo da v2, capturas das telas (`docs/design/telas/*.png`), lista de mudanças que exigem ação (variáveis de ambiente novas, regras do banco, Firebase Auth, deploy), compatibilidade com o firmware 2.0 e o que melhora com o 2.1, e como voltar para a v1 (`git checkout v1.1.0`).
4. Preferir **merge commit** (não squash) nesse PR, para preservar o histórico da v2 no repositório original.
5. Depois do merge: tag `v2.0.0` no upstream, release no GitHub com o trecho do changelog.
