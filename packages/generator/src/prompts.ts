import type { Puzzle, PuzzleDraft, Relation } from '@eulero/core';

export const THEMES = [
  'animali',
  'cibo e bevande',
  'sport',
  'geografia italiana',
  'professioni',
  'musica',
  'natura e piante',
  'trasporti',
  'corpo umano',
  'casa e oggetti',
  'scuola e studio',
  'tempo libero',
];

export const DRAFT_SYSTEM = `Sei un autore di puzzle logici in italiano sulle relazioni tra insiemi.
Ogni puzzle ha esattamente 4 concetti (categorie di cose, al plurale) e la relazione tra ciascuna delle 6 coppie.

Relazioni (rN = relazione del concetto N verso il concetto M, con N < M):
- TUTTI: ogni elemento di N è anche in M, ma M ha elementi che non sono in N (N è sottoinsieme proprio di M)
- CONTIENE: l'inverso: ogni elemento di M è anche in N, ma non viceversa
- ALCUNI: intersezione parziale: esistono elementi in comune, elementi solo di N ed elementi solo di M
- NESSUNO: nessun elemento in comune
- UGUALI: stessi elementi (sinonimi: usali di rado)

Regole di qualità, in ordine di importanza:
1. Ogni relazione deve essere VERA per conoscenza comune, senza eccezioni discutibili o dipendenti dall'opinione. Se hai un dubbio, cambia concetto.
2. Le 6 relazioni devono essere coerenti tra loro (transitività: se A⊂B e B⊂C allora A⊂C; se A⊂B e B∩C=∅ allora A∩C=∅).
3. Etichette al plurale, minuscole, brevi e inequivocabili (es. "cani", "animali domestici"), tutte distinte. Niente nomi propri.
4. "articolo" è l'articolo determinativo plurale dell'etichetta: "i", "gli" o "le" (es. "i cani", "gli animali domestici", "le rose").
5. Varia i tipi di relazione: un buon puzzle mescola inclusioni, intersezioni parziali e disgiunzioni; evita che tutte le coppie siano dello stesso tipo.
6. Contenuti originali e culturalmente neutri per un pubblico italiano.`;

export function draftUser(opts: { theme: string; avoid: string[]; feedback?: string }): string {
  const parts = [`Crea un nuovo puzzle sul tema: ${opts.theme}.`];
  if (opts.avoid.length > 0) {
    parts.push(
      `Non riutilizzare questi insiemi di concetti già prodotti (scegline di diversi):\n${opts.avoid
        .slice(-30)
        .map((a) => `- ${a}`)
        .join('\n')}`,
    );
  }
  if (opts.feedback) {
    parts.push(
      `Il tentativo precedente è stato scartato dal validatore logico. Correggi questi problemi:\n${opts.feedback}`,
    );
  }
  return parts.join('\n\n');
}

export const CRITIC_SYSTEM = `Sei un revisore severo di puzzle sulle relazioni tra insiemi, in italiano.
Ti viene dato un puzzle con 4 concetti e le relazioni dichiarate per le 6 coppie. Per OGNI coppia valuta il rischio che la relazione sia AMBIGUA o discutibile per un giocatore italiano medio:
- "basso": vera per conoscenza comune, nessuna eccezione sensata
- "medio": vera nella maggior parte dei casi o dipende dall'interpretazione del termine
- "alto": discutibile, dipende da opinioni, definizioni tecniche, regioni/culture, o ha eccezioni note
Cerca attivamente controesempi (es. "tutti i cani sono animali domestici" ha eccezioni? i lupi non sono cani, i randagi sì...). Motiva in una frase breve.`;

const REL_TEXT: Record<Relation, (a: string, b: string) => string> = {
  TUTTI: (a, b) => `tutti gli elementi di «${a}» sono anche «${b}», ma non viceversa`,
  CONTIENE: (a, b) => `tutti gli elementi di «${b}» sono anche «${a}», ma non viceversa`,
  ALCUNI: (a, b) => `«${a}» e «${b}» hanno alcuni elementi in comune (e altri no)`,
  NESSUNO: (a, b) => `«${a}» e «${b}» non hanno nessun elemento in comune`,
  UGUALI: (a, b) => `«${a}» e «${b}» coincidono`,
};

export function criticUser(
  puzzle: Pick<Puzzle, 'concepts'> & Pick<PuzzleDraft, 'relations'>,
): string {
  const lines = puzzle.relations.map((r) => {
    const a = puzzle.concepts[r.a]?.label ?? '?';
    const b = puzzle.concepts[r.b]?.label ?? '?';
    return `r${r.a}${r.b} (${a} / ${b}): ${REL_TEXT[r.rel](a, b)}`;
  });
  return `Concetti: ${puzzle.concepts.map((c, i) => `${i}=${c.label}`).join(', ')}\n\nRelazioni dichiarate:\n${lines.join('\n')}`;
}
