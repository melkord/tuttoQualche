# TuttiAlcuni

Puzzle giornaliero in italiano sulle relazioni tra insiemi (diagrammi di Eulero).
Monorepo pnpm + TypeScript strict.

## Stato

- [x] `packages/core` — tipi, validatore logico, domande, difficoltà
- [x] `packages/generator` — `pnpm generate --count 50 --theme animali` (richiede `ANTHROPIC_API_KEY`)
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
