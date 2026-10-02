# TuttiAlcuni

Puzzle giornaliero in italiano sulle relazioni tra insiemi (diagrammi di Eulero).
Monorepo pnpm + TypeScript strict.

## Stato

- [x] `packages/core` — tipi, validatore logico, domande, difficoltà
- [x] `packages/generator` — `pnpm generate --count 50 --theme animali` (richiede `ANTHROPIC_API_KEY`)
- [x] `apps/review` — `pnpm review` → http://127.0.0.1:5174 (A approva · S scarta + 1/2/3 · E modifica · ←→)
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
