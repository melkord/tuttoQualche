# TuttiAlcuni

Puzzle giornaliero in italiano sulle relazioni tra insiemi (diagrammi di Eulero).
Monorepo pnpm + TypeScript strict.

## Stato

- [x] `packages/core` — tipi, validatore logico, domande, difficoltà
- [ ] `packages/generator`
- [ ] `apps/review`
- [ ] `apps/web`
- [ ] `scripts/schedule`

## Setup

```sh
pnpm install
pnpm test        # Vitest
pnpm typecheck
pnpm lint
```

(README completo con il flusso generate → review → schedule → deploy: a fine progetto.)
