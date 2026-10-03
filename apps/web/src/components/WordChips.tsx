import { colorOf } from '../palette';

/**
 * Le parole del passo. Le prime due (passo 1) sono entrambe "in evidenza"; dal passo 2 le
 * parole già viste diventano chip pieni e solo l'ultima arrivata resta grande, col solo contorno.
 */
export function WordChips({ words }: { words: string[] }) {
  const spotlightAll = words.length <= 2;
  return (
    <ul className="chips" aria-label="Parole">
      {words.map((w, slot) => {
        const spot = spotlightAll || slot === words.length - 1;
        return (
          <li
            key={w}
            className={`wchip${spot ? ' wchip--spot' : ' wchip--filled'}${!spotlightAll && spot ? ' wchip--new' : ''}`}
            style={{ ['--c' as string]: colorOf(slot) }}
          >
            {w}
          </li>
        );
      })}
    </ul>
  );
}
