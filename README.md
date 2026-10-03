# TuttiAlcuni

Puzzle giornaliero in italiano sulle relazioni tra insiemi (diagrammi di Eulero).
Monorepo pnpm + TypeScript strict.

## Stato

- [x] `packages/core` — tipi, validatore logico, domande, difficoltà
- [x] `packages/generator` — `pnpm generate --count 50 --theme animali` (richiede `ANTHROPIC_API_KEY`)
- [x] `apps/review` — `pnpm review` → http://127.0.0.1:5174 (A approva · S scarta + 1/2/3 · E modifica · ←→)
- [x] `apps/web` — il gioco (PWA, mobile-first): 4 parole e 3 domande a risposta chiusa: le parole si aggiungono una alla volta e il diagramma cresce (2, 3, 4 cerchi)
- [x] `scripts/publish` — `pnpm publish-puzzles` copia i livelli in `apps/web/public/puzzles` (aggiungi `--include-pending` per includere le bozze non riviste)

## Setup

```sh
pnpm install
pnpm test        # Vitest
pnpm typecheck
pnpm lint
pnpm e2e         # build di produzione + test Playwright (desktop e mobile)
```

(README completo con il flusso generate → review → schedule → deploy: a fine progetto.)

## Deploy su Netlify

Il repo contiene `netlify.toml`: collega il repo a Netlify (branch `main`) e non serve altro.
Build: `pnpm --filter @tuttialcuni/web build` → pubblica `apps/web/dist` (Node 22, pnpm da `packageManager`).
