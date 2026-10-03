/**
 * Traduzioni inglesi dei livelli di `livelli.ts`, nello STESSO ordine (tema per tema, concetto per
 * concetto). Le etichette sono plurali minuscoli, come in italiano. Chiave di raccordo con i puzzle:
 * le etichette italiane in ordine (vedi `translationKey`).
 */
export const THEMES_EN: Record<string, string> = {
  animali: 'animals',
  'cibo e bevande': 'food and drinks',
  'geografia italiana': 'Italian geography',
  sport: 'sports',
  'natura e piante': 'nature and plants',
};

export const LIVELLI_EN: Record<string, readonly (readonly string[])[]> = {
  animali: [
    ['dogs', 'mammals', 'pets', 'fish'],
    ['eagles', 'birds', 'flying animals', 'mammals'],
    ['dogs', 'mammals', 'birds', 'animals'],
    ['snakes', 'reptiles', 'venomous animals', 'fish'],
    ['butterflies', 'insects', 'animals with wings', 'birds'],
    ['lions', 'cats', 'felines', 'pets'],
    ['spiders', 'insects', 'arachnids', 'eight-legged animals'],
    ['whales', 'mammals', 'marine animals', 'sharks'],
    ['cats', 'dogs', 'pets', 'mammals'],
    ['chickens', 'birds', 'egg-laying animals', 'mammals'],
  ],
  'cibo e bevande': [
    ['apples', 'fruits', 'vegetables', 'plant-based foods'],
    ['oranges', 'citrus fruits', 'fruits', 'berries'],
    ['wines', 'alcoholic drinks', 'drinks', 'fruit juices'],
    ['cheeses', 'dairy products', 'solid foods', 'drinks'],
    ['eggs', 'animal-based foods', 'meats', 'seafood'],
    ['sardines', 'seafood', 'canned foods', 'meats'],
    ['ice creams', 'desserts', 'cold foods', 'hot foods'],
    ['beans', 'legumes', 'cereals', 'plant-based foods'],
    ['apples', 'fruits', 'foods that grow on trees', 'seafood'],
    ['tiramisus', 'desserts', 'Italian dishes', 'hot dishes'],
  ],
  'geografia italiana': [
    ['cities in northern Italy', 'Italian cities', 'Italian regional capitals', 'French cities'],
    ['Italian rivers', 'rivers', 'watercourses', 'lakes'],
    ['Italian islands', 'islands', 'Italian regions', 'Mediterranean islands'],
    ['northern regions', 'Italian regions', 'regions with a coastline', 'landlocked regions'],
    ['Italian volcanoes', 'volcanoes', 'active volcanoes', 'lakes'],
    ['seaside cities', 'Italian cities', 'mountain cities', 'European cities'],
    ['Alpine mountains', 'Italian mountains', 'mountains over 4,000 metres', 'volcanoes'],
    ['northern regions', 'central regions', 'southern regions', 'Italian regions'],
    ['Italian islands', 'Tyrrhenian islands', 'Adriatic islands', 'Greek islands'],
    ['Apennine peaks', 'Alpine peaks', 'mountains', 'lakes'],
  ],
  sport: [
    ['ball sports', 'team sports', 'individual sports', 'water sports'],
    ['racket sports', 'ball sports', 'combat sports', 'water sports'],
    ['combat sports', 'Olympic sports', 'team sports', 'individual sports'],
    ['team ball sports', 'team sports', 'ball sports', 'individual sports'],
    ['marathons', 'running races', 'athletics events', 'swimming races'],
    ['ice sports', 'winter sports', 'team sports', 'individual sports'],
    ['team sports', 'sports', 'ball sports', 'combat sports'],
    ['swimming races', 'water sports', 'Olympic sports', 'winter sports'],
    ['team ball sports', 'Olympic sports', 'combat sports', 'water sports'],
    ['snow sports', 'winter sports', 'Olympic sports', 'water sports'],
  ],
  'natura e piante': [
    ['roses', 'flowering plants', 'plants', 'trees'],
    ['oaks', 'trees', 'evergreen plants', 'conifers'],
    ['fungi', 'plants', 'animals', 'living things'],
    ['bees', 'insects', 'pollinators', 'birds'],
    ['cacti', 'succulents', 'desert plants', 'aquatic plants'],
    ['olive trees', 'fruit trees', 'evergreen trees', 'deciduous trees'],
    ['oceans', 'seas', 'saltwater bodies', 'freshwater bodies'],
    ['granites', 'rocks', 'minerals', 'metals'],
    ['thunderstorms', 'weather phenomena', 'natural phenomena', 'earthquakes'],
    ['carnivorous plants', 'plants', 'succulents', 'aquatic plants'],
  ],
};
