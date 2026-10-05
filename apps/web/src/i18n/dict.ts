import type { Lang } from '@eulero/core';

type Plural = (n: number) => string;
const cap = (s: string) => (s ? s[0]?.toUpperCase() + s.slice(1) : s);

export interface Dict {
  appTitle: string;
  back: string;
  stats: string;
  howtoButton: string;
  close: string;
  streakTitle: string;
  language: string;
  loading: string;
  loadError: (message: string) => string;
  noLevels: string;
  errors: Record<'NOT_FOUND' | 'UNAVAILABLE' | 'INVALID', string>;
  levelTitle: (theme: string, level: number) => string;
  levelLabel: (level: number) => string;
  levelLocked: (level: number) => string;
  difficulty: Record<'facile' | 'medio' | 'difficile', string>;
  home: {
    start: string;
    continue: string;
    play: string;
    resume: string;
    congrats: string;
    allDone: string;
    soon: string;
    themes: string;
    levelsCount: (done: number, total: number) => string;
    themeNotFound: string;
  };
  play: {
    progress: string;
    words: string;
    diagrams: string;
    option: (letter: string) => string;
    nope: string;
    retry: string;
  };
  result: {
    phrases: Record<1 | 2 | 3, readonly string[]>;
    perfectLine: string;
    mistakes: Plural;
    stars: (n: number) => string;
    finalAria: string;
    yourResult: string;
    share: string;
    copied: string;
    shared: string;
    next: string;
    home: string;
    streak: Plural;
  };
  share: { perfect: string; mistakes: Plural };
  howto: {
    title: string;
    intro: string;
    inside: string;
    overlap: string;
    apart: string;
    outro: string;
    ok: string;
  };
  pwa: {
    ready: string;
    newLevels: (n: number) => string;
    updated: string;
    offline: string;
    install: string;
    iosHint: string;
  };
  statsModal: {
    title: string;
    played: string;
    perfect: string;
    streak: string;
    best: string;
    dist: string;
  };
}

const it: Dict = {
  appTitle: 'Eulero · il puzzle degli insiemi',
  back: 'Indietro',
  stats: 'Statistiche',
  howtoButton: 'Come si gioca',
  close: 'Chiudi',
  streakTitle: 'Giorni consecutivi',
  language: 'Lingua',
  loading: 'Carico…',
  loadError: (m) => `Impossibile caricare i livelli: ${m}`,
  noLevels: 'Nessun livello disponibile, torna presto!',
  errors: {
    NOT_FOUND: 'Livello non trovato.',
    UNAVAILABLE: 'Livello non disponibile.',
    INVALID: 'Livello non valido.',
  },
  levelTitle: (theme, n) => `${cap(theme)} · livello ${n}`,
  levelLabel: (n) => `Livello ${n}`,
  levelLocked: (n) => `Livello ${n} (bloccato)`,
  difficulty: { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' },
  home: {
    start: 'Inizia da qui',
    continue: 'Continua',
    play: 'Gioca',
    resume: 'Riprendi',
    congrats: 'Complimenti',
    allDone: '🎉 Hai completato tutti i livelli',
    soon: 'Nuovi puzzle in arrivo.',
    themes: 'Temi',
    levelsCount: (d, n) => `${d} / ${n} livelli`,
    themeNotFound: 'Tema non trovato.',
  },
  play: {
    progress: 'Avanzamento',
    words: 'Parole',
    diagrams: 'Diagrammi',
    option: (l) => `Opzione ${l}`,
    nope: 'No!',
    retry: 'Riprova',
  },
  result: {
    phrases: {
      3: ['Impeccabile!', 'Perfetto!', 'Bravissimo!'],
      2: ['Bel lavoro!', 'Ben fatto!', 'Quasi perfetto!'],
      1: ['Si può fare di meglio!', 'Continua così!', 'Ci sei arrivato!'],
    },
    perfectLine: 'Tre su tre al primo colpo.',
    mistakes: (n) => `${n} ${n === 1 ? 'errore' : 'errori'} in totale.`,
    stars: (n) => `${n} stelle su 3`,
    finalAria: 'Il diagramma completo',
    yourResult: 'Il tuo risultato',
    share: 'Condividi risultato',
    copied: 'Copiato negli appunti ✓',
    shared: 'Condiviso ✓',
    next: 'Livello successivo →',
    home: 'Torna alla home',
    streak: (n) => `🔥 Serie di ${n} ${n === 1 ? 'giorno' : 'giorni'}`,
  },
  share: {
    perfect: '✨ Perfetto, zero errori',
    mistakes: (n) => `${n} ${n === 1 ? 'errore' : 'errori'}`,
  },
  howto: {
    title: 'Come si gioca',
    intro:
      'Ogni livello ha **4 parole** e **3 domande**. Alla prima vedi due parole e scegli tra 4 diagrammi quello che le rappresenta. Poi **si aggiunge una parola alla volta** e il diagramma cresce, fino a tutte e quattro.',
    inside:
      '**Dentro.** Se tutti gli elementi di un insieme sono anche nell’altro, il suo cerchio sta tutto dentro l’altro.',
    overlap:
      '**Si sovrappongono.** Se hanno solo alcuni elementi in comune, i cerchi si intersecano in parte.',
    apart: '**Separati.** Se non hanno nulla in comune, i cerchi non si toccano.',
    outro:
      'Se sbagli ti spieghiamo perché e puoi riprovare, ma gli errori contano: **3 stelle** senza errori, **2** con al massimo due, **1** altrimenti. Completa un livello per sbloccare il successivo.',
    ok: 'Ho capito',
  },
  pwa: {
    ready: 'Pronto per giocare offline ✓',
    newLevels: (n) => `${n} ${n === 1 ? 'nuovo livello scaricato' : 'nuovi livelli scaricati'} 🎉`,
    updated: 'App aggiornata ✓',
    offline: 'Offline',
    install: 'Installa l’app',
    iosHint: 'Per installarla: tocca Condividi e poi «Aggiungi alla schermata Home».',
  },
  statsModal: {
    title: 'Statistiche',
    played: 'giocati',
    perfect: 'perfetti',
    streak: 'serie',
    best: 'record',
    dist: 'Errori per livello',
  },
};

const en: Dict = {
  appTitle: 'Eulero · the set puzzle',
  back: 'Back',
  stats: 'Stats',
  howtoButton: 'How to play',
  close: 'Close',
  streakTitle: 'Day streak',
  language: 'Language',
  loading: 'Loading…',
  loadError: (m) => `Couldn’t load the levels: ${m}`,
  noLevels: 'No levels available yet, check back soon!',
  errors: {
    NOT_FOUND: 'Level not found.',
    UNAVAILABLE: 'Level not available.',
    INVALID: 'Invalid level.',
  },
  levelTitle: (theme, n) => `${cap(theme)} · level ${n}`,
  levelLabel: (n) => `Level ${n}`,
  levelLocked: (n) => `Level ${n} (locked)`,
  difficulty: { facile: 'Easy', medio: 'Medium', difficile: 'Hard' },
  home: {
    start: 'Start here',
    continue: 'Continue',
    play: 'Play',
    resume: 'Resume',
    congrats: 'Congratulations',
    allDone: '🎉 You’ve completed every level',
    soon: 'New puzzles coming soon.',
    themes: 'Themes',
    levelsCount: (d, n) => `${d} / ${n} levels`,
    themeNotFound: 'Theme not found.',
  },
  play: {
    progress: 'Progress',
    words: 'Words',
    diagrams: 'Diagrams',
    option: (l) => `Option ${l}`,
    nope: 'Nope!',
    retry: 'Try again',
  },
  result: {
    phrases: {
      3: ['Flawless!', 'Perfect!', 'Brilliant!'],
      2: ['Nice work!', 'Well done!', 'Almost perfect!'],
      1: ['You can do better!', 'Keep going!', 'You got there!'],
    },
    perfectLine: 'Three out of three on the first try.',
    mistakes: (n) => `${n} ${n === 1 ? 'mistake' : 'mistakes'} in total.`,
    stars: (n) => `${n} out of 3 stars`,
    finalAria: 'The complete diagram',
    yourResult: 'Your result',
    share: 'Share result',
    copied: 'Copied to clipboard ✓',
    shared: 'Shared ✓',
    next: 'Next level →',
    home: 'Back to home',
    streak: (n) => `🔥 ${n}-day streak`,
  },
  share: {
    perfect: '✨ Perfect, no mistakes',
    mistakes: (n) => `${n} ${n === 1 ? 'mistake' : 'mistakes'}`,
  },
  howto: {
    title: 'How to play',
    intro:
      'Every level has **4 words** and **3 questions**. On the first you see two words and pick, out of 4 diagrams, the one that represents them. Then **one word is added at a time** and the diagram grows, until all four are in.',
    inside:
      '**Inside.** If every member of one set is also in the other, its circle sits entirely inside the other.',
    overlap: '**Overlapping.** If they share only some members, the circles intersect partly.',
    apart: '**Apart.** If they have nothing in common, the circles don’t touch.',
    outro:
      'If you get one wrong we’ll explain why and you can try again, but mistakes count: **3 stars** with none, **2** with at most two, **1** otherwise. Complete a level to unlock the next one.',
    ok: 'Got it',
  },
  pwa: {
    ready: 'Ready to play offline ✓',
    newLevels: (n) => `${n} new ${n === 1 ? 'level' : 'levels'} downloaded 🎉`,
    updated: 'App updated ✓',
    offline: 'Offline',
    install: 'Install the app',
    iosHint: 'To install: tap Share, then “Add to Home Screen”.',
  },
  statsModal: {
    title: 'Stats',
    played: 'played',
    perfect: 'perfect',
    streak: 'streak',
    best: 'best',
    dist: 'Mistakes per level',
  },
};

export const DICTS: Record<Lang, Dict> = { it, en };
