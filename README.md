# Eulero

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
Build: `pnpm --filter @eulero/web build` → pubblica `apps/web/dist` (Node 22, pnpm da `packageManager`).

## Lingue (italiano / inglese)

- L'interfaccia si adatta alla lingua del browser (italiano se `it`, altrimenti inglese) e si cambia con il tasto **IT/EN** in alto; la scelta resta salvata.
- Ogni puzzle è scritto in italiano; la traduzione inglese (tema + 4 concetti, stesso ordine) sta in `puzzle.translations.en`. Le relazioni sono uguali per tutte le lingue.
- Il generatore chiede a Claude anche la traduzione inglese. Per i livelli scritti a mano: `data/translations/en.json` (rigenerabile con `pnpm translations`), unito ai puzzle da `pnpm publish-puzzles`.
- Aggiungere una lingua: estendere `LANGS` in `packages/core/src/types.ts`, i testi in `packages/core/src/{questions,steps}.ts` e il dizionario in `apps/web/src/i18n/dict.ts`.

## Routine giornaliera

Ogni giorno alle ~5:00 (Europe/Rome) una routine di Claude aggiunge 5 livelli (o un tema nuovo da 10),
li valida, li pubblica e fa push su `main`: segue `docs/routine-giornaliera.md`.
Strumenti: `pnpm add-levels <file.json>` (valida e scrive in `data/pending`) e
`pnpm publish-puzzles --include-pending` (aggiorna il sito; l'ordine dei livelli è stabile).
I livelli aggiunti dalla routine sono bozze finché non li riveduti con `pnpm review`.

## PWA e uso offline

Eulero è una PWA installabile (pulsante **Installa l'app** su Android/desktop; su iOS: Condividi → Aggiungi alla schermata Home).

- **Precarica tutto:** al primo accesso il service worker scarica l'app e **tutti i livelli** (circa 1 KB l'uno: 1000 livelli ≈ 1 MB). Poi gira senza rete; un'etichetta "Offline" compare in alto quando manca la connessione.
- **Livelli nuovi:** a ogni deploy la build genera `dist/sw.js` con l'elenco dei file e delle loro impronte (`apps/web/pwa/`). L'app controlla gli aggiornamenti all'apertura, quando torna in primo piano, quando torna la rete e ogni 30 minuti; scarica **solo i file nuovi o cambiati**, toglie quelli spariti e mostra "N nuovi livelli scaricati".
- **Sicurezza:** se un file del deploy non si scarica, la nuova versione non si installa e resta quella precedente (niente cache a metà).
- **Netlify:** `sw.js`, `index.html`, manifest e `/puzzles/*` sono serviti con `no-cache` (vedi `netlify.toml`), così l'aggiornamento vede subito i livelli nuovi.
- **Test:** `pnpm e2e` include partite complete offline e la simulazione di un nuovo deploy con livelli aggiunti (`e2e/offline.spec.ts`).
