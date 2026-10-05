# Routine giornaliera: nuovi livelli di Eulero

Eseguita ogni giorno alle ~5:00 (ora di Roma) da una sessione di Claude. Obiettivo: far crescere il
gioco con contenuti **corretti, non ambigui e bilingui (it/en)**, senza mai rompere il sito.

## 1. Preparazione

- Lavora sul repo `melkord/tuttoQualche`, branch **main** (se il repo non è nella sessione, aggiungilo
  con `add_repo` e clonalo).
- `git pull origin main`, poi `pnpm install --frozen-lockfile`.

## 2. Cosa aggiungere

Leggi `apps/web/public/puzzles/index.json` (temi e numero di livelli) e `git log --oneline -30`.

- **Di default: 5 nuovi livelli** da distribuire sul tema con meno livelli (max 2 per tema se i temi
  sono quasi pari).
- **Nuovo tema (10 livelli)** invece dei 5 se: da 7 giorni o più non nasce un tema nuovo, oppure tutti
  i temi hanno almeno 15 livelli.
- Idee per nuovi temi (scegline uno non ancora presente): musica, cinema, storia, scienza, cucina
  italiana, mare, corpo umano, trasporti, professioni, astronomia, giochi e giocattoli, scuola, città,
  strumenti, vestiti, edifici, mestieri, meteo.
- I livelli nuovi finiscono **in coda** al loro tema (l'ordine è stabile: non sposta i livelli già
  giocati).

## 3. Come si scrive un livello

File JSON (array) con questo formato, uno per livello:

```json
{
  "theme": "animali",
  "themeEn": "animals",
  "concepts": ["i cani", "i mammiferi", "gli animali domestici", "i pesci"],
  "conceptsEn": ["dogs", "mammals", "pets", "fish"],
  "relations": "TTNANA",
  "risks": { "02": ["medio", "Esistono cani randagi."] }
}
```

- **concepts**: 4 concetti al plurale, minuscoli, preceduti dall'articolo plurale (`i`, `gli`, `le`).
- **conceptsEn**: le stesse 4 etichette in inglese, **stesso ordine**, plurale, minuscolo **tranne
  aggettivi e nomi propri** (`Italian lakes`, `French cities`, `Alpine mountains`; `themeEn` uguale:
  `Italian geography`), **stessa estensione** (se la traduzione cambia cosa include il concetto,
  scegli un altro concetto).
- **relations**: 6 lettere, nell'ordine delle coppie `01 02 03 12 13 23` (indici dei concetti), ognuna
  riferita al primo concetto della coppia verso il secondo:
  `T` = tutti i primi sono secondi (A⊂B), `C` = tutti i secondi sono primi (B⊂A), `A` = in comune solo
  in parte (esistono elementi solo del primo, solo del secondo e in comune), `N` = nessun elemento in
  comune, `U` = coincidono (usalo di rado).
- **risks**: solo le coppie che hanno un'eccezione plausibile (`medio` + motivo). Un rischio `alto`
  non viene accettato: cambia concetti.

### Criteri di qualità (in ordine di importanza)

0. **Una relazione che ha un'eccezione nota è FALSA, non "a rischio".** `T`/`C`/`N`/`U` sono
   affermazioni universali: se per `T` o `C` esiste anche solo un controesempio (il ginepro è una
   conifera ma non un albero), per `N` esiste un elemento in comune, devi usare `A` oppure cambiare
   concetto. Il campo `risks` serve solo per dubbi di significato o di interpretazione del termine,
   **mai** per giustificare una relazione che sai essere inesatta.
1. Ogni relazione è **vera per conoscenza comune**, senza eccezioni discutibili, senza dipendere da
   opinioni, definizioni tecniche o cultura locale. Nel dubbio, cambia concetto. Controlla sempre i
   controesempi ("tutti i cani sono animali domestici?" → i randagi: rischio medio).
2. Le 6 relazioni sono coerenti tra loro (il comando lo verifica) **e** hanno senso come gioco: mescola
   inclusioni (`T`/`C`), intersezioni parziali (`A`) e disgiunzioni (`N`); evita puzzle con tutte le
   coppie uguali.
3. Concetti chiari e distinti, niente categorie vaghe ("cibi buoni", "animali belli"), niente nomi
   propri di persone, niente temi sensibili (politica, religione, salute, stereotipi su popoli).
4. Mix di difficoltà nel lotto: circa 1/3 facili (catene di inclusioni, disgiunti), 1/2 medi, 1/6
   difficili (più `A`). Il comando calcola la difficoltà.
5. Contenuti **originali**: non copiare puzzle, testi o grafica di altri giochi.
6. Concetti **non ambigui nel significato**: evita categorie con due letture comuni (es. "primi
   piatti" è una portata, non per forza italiana). Prima di inviare, rileggi ogni relazione come frase
   ("Tutti i X sono Y?", "Alcuni X non sono Y?") e controllala una per una.
7. Non ripetere concetti già presenti (il comando scarta i duplicati esatti, ma evita anche quasi-doppioni).
8. Italiano corretto (articoli!) e inglese naturale, con le maiuscole giuste.

## 4. Aggiungere e pubblicare

```sh
pnpm add-levels /percorso/nuovi-livelli.json     # valida e scrive in data/pending/
pnpm publish-puzzles --include-pending           # aggiorna apps/web/public/puzzles (indice incluso)
```

- Se `add-levels` scarta qualcosa (exit code 2), leggi il motivo, correggi quei livelli e rilancia solo
  quelli. I duplicati vengono scartati da soli: va bene.
- Se hai creato un **tema nuovo**, aggiungi una emoji adatta in `ICONS` di
  `apps/web/src/lib/text.ts` (chiave = nome italiano del tema).
- Controlla `git status`: devono cambiare solo `data/pending/`, `apps/web/public/puzzles/` e, per un
  tema nuovo, `apps/web/src/lib/text.ts`.

## 5. Verifiche (tutte, prima di pubblicare)

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

- Se qualcosa fallisce **per colpa dei nuovi livelli**, rimuovili (cancella i loro file in
  `data/pending/`, rilancia `publish-puzzles --include-pending`) o correggili.
- **Non fare push** se le verifiche non passano. Se `pnpm e2e` non può partire per un problema
  dell'ambiente (es. browser mancante) e tutto il resto passa, puoi pubblicare ma dillo nel report.
- Non modificare test, né altro codice, per far passare le verifiche.

## 6. Pubblicazione

- Commit su **main** con messaggio tipo `Routine: +5 livelli (animali, sport)` o
  `Routine: nuovo tema «musica» (10 livelli)`, aggiungendo le righe di attribuzione richieste dalla
  sessione.
- `git push origin main`. Se il push su main viene rifiutato, spingi su un branch
  `routine/AAAA-MM-GG` e dillo nel report. Netlify pubblica da solo da `main`.
- Non creare pull request.

## 7. Report finale (breve)

Una riga: cosa hai aggiunto (tema, numero), difficoltà, eventuali livelli scartati e perché, esito
delle verifiche, link/hash del commit.
