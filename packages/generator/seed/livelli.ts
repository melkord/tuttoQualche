/**
 * Livelli scritti a mano (5 temi × 10). Formato compatto:
 *  - concetti: "<articolo> <etichetta>" (es. "i cani", "gli animali domestici", "le aquile")
 *  - relazioni: 6 lettere nell'ordine 01 02 03 12 13 23, ognuna relativa al primo concetto
 *    della coppia verso il secondo: T = tutti (A⊂B), C = contiene (B⊂A), A = alcuni,
 *    N = nessuno, U = uguali
 *  - rischi: solo le coppie non "basse", es. { '02': ['medio', 'motivo'] }
 */
export type SeedRisks = Record<string, ['medio' | 'alto', string]>;
export type Seed = readonly [concepts: readonly string[], relations: string, risks?: SeedRisks];

export const LIVELLI: Record<string, readonly Seed[]> = {
  animali: [
    [
      ['i cani', 'i mammiferi', 'gli animali domestici', 'i pesci'],
      'TTNANA',
      { '02': ['medio', 'Esistono cani randagi o da lavoro non "domestici" in senso stretto.'] },
    ],
    [
      ['le aquile', 'gli uccelli', 'gli animali che volano', 'i mammiferi'],
      'TTNANA',
      { '12': ['medio', 'Pinguini e struzzi sono uccelli che non volano: serve conoscerlo.'] },
    ],
    [['i cani', 'i mammiferi', 'gli uccelli', 'gli animali'], 'TNTNTT'],
    [['i serpenti', 'i rettili', 'gli animali velenosi', 'i pesci'], 'TANANA'],
    [['le farfalle', 'gli insetti', 'gli animali con le ali', 'gli uccelli'], 'TTNANC'],
    [
      ['i leoni', 'i gatti', 'i felini', 'gli animali domestici'],
      'NTNTTA',
      { '13': ['medio', 'Esistono gatti selvatici/randagi.'] },
    ],
    [
      ['i ragni', 'gli insetti', 'gli aracnidi', 'gli animali con otto zampe'],
      'NTTNNT',
      { '23': ['medio', 'Altri animali (es. polpi) hanno otto braccia: "zampe" è ambiguo.'] },
    ],
    [
      ['le balene', 'i mammiferi', 'gli animali marini', 'gli squali'],
      'TTNANC',
      { '23': ['medio', 'Alcuni squali (es. squalo toro) risalgono i fiumi.'] },
    ],
    [
      ['i gatti', 'i cani', 'gli animali domestici', 'i mammiferi'],
      'NTTTTA',
      { '02': ['medio', 'Gatti non domestici (randagi).'], '12': ['medio', 'Cani randagi.'] },
    ],
    [
      ['i polli', 'gli uccelli', 'gli animali che depongono uova', 'i mammiferi'],
      'TTNTNA',
      { '23': ['medio', 'Ornitorinco e echidna sono mammiferi che depongono uova.'] },
    ],
  ],
  'cibo e bevande': [
    [['le mele', 'i frutti', 'gli ortaggi', 'gli alimenti vegetali'], 'TNTNTT'],
    [['le arance', 'gli agrumi', 'i frutti', 'i frutti di bosco'], 'TTNTNC'],
    [['i vini', 'le bevande alcoliche', 'le bevande', 'i succhi di frutta'], 'TTNTNC'],
    [['i formaggi', 'i latticini', 'i cibi solidi', 'le bevande'], 'TTNAAN'],
    [['le uova', 'gli alimenti di origine animale', 'le carni', 'i prodotti ittici'], 'TNNCCN'],
    [['le sardine', 'i prodotti ittici', 'i cibi in scatola', 'le carni'], 'TANANA'],
    [
      ['i gelati', 'i dolci', 'i cibi freddi', 'i cibi caldi'],
      'TTNAAN',
      {
        '12': ['medio', 'Esistono dolci serviti freddi e altri no: dipende dal dolce.'],
        '13': ['medio', 'Idem per i dolci caldi (crêpes, strudel).'],
      },
    ],
    [['i fagioli', 'i legumi', 'i cereali', 'gli alimenti vegetali'], 'TNTNTT'],
    [['le mele', 'i frutti', 'i cibi che crescono sugli alberi', 'i prodotti ittici'], 'TTNANN'],
    [
      ['i tiramisù', 'i dolci', 'i piatti italiani', 'i piatti caldi'],
      'TTNAAA',
      { '12': ['medio', 'Non tutti i dolci sono italiani, ma molti sì: va bene come "alcuni".'] },
    ],
  ],
  'geografia italiana': [
    [
      [
        'le città del Nord Italia',
        'le città italiane',
        'i capoluoghi di regione italiani',
        'le città francesi',
      ],
      'TANCNN',
    ],
    [['i fiumi italiani', 'i fiumi', "i corsi d'acqua", 'i laghi'], 'TTNTNN'],
    [
      ['le isole italiane', 'le isole', 'le regioni italiane', 'le isole del Mediterraneo'],
      'TATACA',
      { '03': ['medio', 'Tutte le isole italiane sono nel Mediterraneo (Adriatico incluso).'] },
    ],
    [
      [
        'le regioni del Nord',
        'le regioni italiane',
        'le regioni con sbocco sul mare',
        'le regioni senza sbocco sul mare',
      ],
      'TAACCN',
    ],
    [['i vulcani italiani', 'i vulcani', 'i vulcani attivi', 'i laghi'], 'TANCNN'],
    [
      ['le città sul mare', 'le città italiane', 'le città di montagna', 'le città europee'],
      'ANAATA',
      { '02': ['medio', 'Confine sfumato tra città "di mare" e "di montagna".'] },
    ],
    [
      [
        'le montagne delle Alpi',
        'le montagne italiane',
        'le montagne oltre i 4000 metri',
        'i vulcani',
      ],
      'AANAAA',
      {
        '13': [
          'medio',
          "I vulcani sono montagne solo in parte (es. Stromboli è un'isola-vulcano).",
        ],
      },
    ],
    [
      ['le regioni del Nord', 'le regioni del Centro', 'le regioni del Sud', 'le regioni italiane'],
      'NNTNTT',
      {
        '12': [
          'medio',
          'Alcune regioni (es. Abruzzo, Sardegna) sono classificate in modo diverso.',
        ],
      },
    ],
    [
      ['le isole italiane', 'le isole del Tirreno', "le isole dell'Adriatico", 'le isole greche'],
      'AANNNN',
      { '23': ['medio', 'Il confine tra Adriatico e Ionio (Corfù) è sfumato.'] },
    ],
    [['le vette appenniniche', 'le vette alpine', 'le montagne', 'i laghi'], 'NTNTNN'],
  ],
  sport: [
    [
      [
        'gli sport con la palla',
        'gli sport di squadra',
        'gli sport individuali',
        'gli sport acquatici',
      ],
      'AAANAA',
      { '12': ['medio', 'Alcuni sport (es. tennis) si giocano sia in singolo sia a squadre.'] },
    ],
    [
      [
        'gli sport con la racchetta',
        'gli sport con la palla',
        'gli sport da combattimento',
        'gli sport acquatici',
      ],
      'ANNNAN',
    ],
    [
      [
        'gli sport da combattimento',
        'gli sport olimpici',
        'gli sport di squadra',
        'gli sport individuali',
      ],
      'ANAAAN',
      { '02': ['medio', 'Esistono gare a squadre nel judo e nella scherma.'] },
    ],
    [
      [
        'gli sport di squadra con la palla',
        'gli sport di squadra',
        'gli sport con la palla',
        'gli sport individuali',
      ],
      'TTNANA',
    ],
    [
      ['le maratone', 'le gare di corsa', 'le gare di atletica leggera', 'le gare di nuoto'],
      'TTNANN',
    ],
    [
      [
        'gli sport sul ghiaccio',
        'gli sport invernali',
        'gli sport di squadra',
        'gli sport individuali',
      ],
      'TAAAAN',
    ],
    [
      ['gli sport di squadra', 'gli sport', 'gli sport con la palla', 'gli sport da combattimento'],
      'TANCCN',
      { '03': ['medio', 'Esistono gare a squadre di judo e scherma.'] },
    ],
    [
      ['le gare di nuoto', 'gli sport acquatici', 'gli sport olimpici', 'gli sport invernali'],
      'TANANA',
    ],
    [
      [
        'gli sport di squadra con la palla',
        'gli sport olimpici',
        'gli sport da combattimento',
        'gli sport acquatici',
      ],
      'ANAAAN',
    ],
    [
      ['gli sport sulla neve', 'gli sport invernali', 'gli sport olimpici', 'gli sport acquatici'],
      'TANANA',
    ],
  ],
  'natura e piante': [
    [['le rose', 'le piante da fiore', 'le piante', 'gli alberi'], 'TTNTAC'],
    [['le querce', 'gli alberi', 'le piante sempreverdi', 'le conifere'], 'TANAAA'],
    [['i funghi', 'le piante', 'gli animali', 'gli esseri viventi'], 'NNTNTT'],
    [['le api', 'gli insetti', 'gli impollinatori', 'gli uccelli'], 'TTNANA'],
    [
      ['i cactus', 'le piante grasse', 'le piante del deserto', 'le piante acquatiche'],
      'TANANN',
      { '02': ['medio', 'Alcuni cactus vivono nelle foreste tropicali, non nei deserti.'] },
    ],
    [
      ['gli ulivi', 'gli alberi da frutto', 'gli alberi sempreverdi', 'gli alberi decidui'],
      'TTNAAN',
    ],
    [
      ['gli oceani', 'i mari', "gli specchi d'acqua salata", "gli specchi d'acqua dolce"],
      'NTNTNN',
      { '12': ['medio', 'Il Mar Caspio è salmastro; il Mar Morto è un lago salato.'] },
    ],
    [
      ['i graniti', 'le rocce', 'i minerali', 'i metalli'],
      'TNNNNA',
      { '12': ['medio', 'Una roccia è un aggregato di minerali: la distinzione è tecnica.'] },
    ],
    [['i temporali', 'i fenomeni atmosferici', 'i fenomeni naturali', 'i terremoti'], 'TTNTNC'],
    [
      ['le piante carnivore', 'le piante', 'le piante grasse', 'le piante acquatiche'],
      'TNACCN',
      { '23': ['medio', 'Poche piante grasse semi-acquatiche esistono.'] },
    ],
  ],
};
