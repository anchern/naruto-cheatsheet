// Класифікація: Anime Filler List (перевірено 22.09.2026).
// Назви арок — короткі редакційні описи, а не офіційні назви епізодів.
export function expandRanges(text) {
  if (!text.trim()) return [];
  return text.split(',').flatMap(part => {
    const [start, end = start] = part.trim().split(/[-–—]/).map(Number);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > 10000) throw new Error('Некоректний діапазон');
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}

export const SERIES = {
  naruto: { name: 'Наруто', short: 'Наруто', count: 220, years: '2002–2007' },
  shippuden: { name: 'Наруто: Шіппуден', short: 'Шіппуден', count: 500, years: '2007–2017' },
  rocklee: { name: 'Рок Лі та його друзі-ніндзя', short: 'Рок Лі', count: 51, years: '2012–2013' },
  movies: { name: 'Повнометражні фільми', short: 'Фільми', count: 10, years: '2004–2014' },
};
export const TYPES = { story: 'Сюжетна', filler: 'Філер', spinoff: 'Спіноф' };
export const classification = {
  naruto: {
    filler: '26,97,101-106,136-140,143-219',
    mixed: '7,9,14-16,18-21,23-24,27-30,37-41,43-47,49,52-60,63,66,69-72,74,83,98-100,112-114,126-127,130-131,141-142,220',
  },
  shippuden: {
    filler: '57-71,91-112,144-151,170-171,176-196,223-242,257-260,271,279-281,284-295,303-320,347-361,376-377,388-390,394-413,416-417,422-423,427-450,464-468,480-483',
    mixed: '1-19,24-25,45,49-50,54,56,89-90,113,115,127-128,213,254,296,324,327-328,330-331,338,346,362,385-386,415,419,426,451-458,460-462,469,471-472,478-479',
  },
};
const arcs = {
  naruto: [
    [1, 5, 'Знайомство з командою 7'], [6, 19, 'Місія в Країні Хвиль'],
    [20, 67, 'Іспит на чуніна'], [68, 80, 'Випробування Конохи'],
    [81, 100, 'Пошуки Цунаде'], [101, 106, 'Побічні місії команди 7'],
    [107, 135, 'Місія з повернення Саске'], [136, 142, 'Країна Рисових Полів'],
    [143, 147, 'Слід Мідзукі'], [148, 151, 'Пошуки жука бікоучу'],
    [152, 157, 'Родина Куросукі'], [158, 160, 'Нові завдання Конохи'],
    [161, 167, 'Країна Птахів та інші місії'], [168, 173, 'Країна Моря'],
    [174, 177, 'Пригоди поза Конохою'], [178, 183, 'Село Зірки'],
    [184, 196, 'Побічні історії Конохи'], [197, 201, 'Захист Конохи'],
    [202, 207, 'Додаткові історії'], [208, 215, 'Місії та спогади'],
    [216, 220, 'Перед новою подорожжю'],
  ],
  shippuden: [
    [1, 32, 'Повернення та місія в Суні'], [33, 53, 'Міст Тенчі'],
    [54, 71, 'Дванадцять ніндзя-охоронців'], [72, 90, 'Протистояння з Акацукі'],
    [91, 112, 'Поява Трихвостого'], [113, 118, 'Пошуки Ітачі'],
    [119, 120, 'Історія Какаші'], [121, 143, 'Шляхи Джираї та Саске'],
    [144, 151, 'Історія Шестихвостого'], [152, 175, 'Випробування Конохи'],
    [176, 196, 'Спогади про Коноху'], [197, 222, 'Саміт п’яти каґе'],
    [223, 242, 'Подорож морем'], [243, 256, 'Підготовка до війни'],
    [257, 260, 'Спогади команди 7'], [261, 289, 'Четверта війна шинобі'],
    [290, 295, 'Сила'], [296, 348, 'Війна: новий етап'],
    [349, 361, 'Какаші в АНБУ'], [362, 375, 'Війна: об’єднані сили'],
    [376, 377, 'Меха-Наруто'], [378, 393, 'Війна: вирішальний етап'],
    [394, 413, 'Новий іспит на чуніна'], [414, 431, 'На шляху до фіналу'],
    [432, 450, 'Історія зі сувою Джираї'], [451, 458, 'Історія Ітачі'],
    [459, 479, 'Завершення великої історії'], [480, 483, 'Дитячі спогади'],
    [484, 488, 'Історія Саске'], [489, 493, 'Історія Шікамару'],
    [494, 500, 'Епілог: новий розділ'],
  ],
};

function makeEpisodes(series) {
  const filler = new Set(expandRanges(classification[series]?.filler ?? ''));
  const mixed = new Set(expandRanges(classification[series]?.mixed ?? ''));
  return Array.from({ length: SERIES[series].count }, (_, i) => {
    const number = i + 1;
    const isSpinoff = series === 'rocklee';
    const novel = series === 'shippuden' && (number >= 451 && number <= 458 || number >= 484);
    const type = isSpinoff ? 'spinoff' : filler.has(number) ? 'filler' : 'story';
    const arc = isSpinoff ? 'Комедійні пригоди Рока Лі' : arcs[series].find(([start, end]) => number >= start && number <= end)[2];
    let note = '';
    if (mixed.has(number)) note = 'Містить сюжетні та філерні сцени. Залишено в маршруті, щоб не втратити сюжет.';
    if (series === 'naruto' && [141, 142, 220].includes(number)) note = 'Сюжетні перехідні сцени серед філерної історії. № 141 — наприкінці, № 142 — на початку, № 220 — у другій половині; точний час залежить від видання.';
    return { id: `${series}-${number}`, series, number, title: `Серія ${String(number).padStart(3, '0')}`, arc, type, mixed: mixed.has(number), novel, animeCanon: series === 'shippuden' && number === 28, note, kind: 'episode' };
  });
}

const filmTitles = [
  ['Снігова принцеса', 2004], ['Легенда про камінь Ґелел', 2005],
  ['Вартові Королівства Півмісяця', 2006], ['Наруто: Шіппуден — фільм', 2007],
  ['Зв’язки', 2008], ['Воля вогню', 2009], ['Загублена вежа', 2010],
  ['Кривава в’язниця', 2011], ['Шлях ніндзя', 2012], ['Останній: Наруто — фільм', 2014],
];
export const MOVIES = filmTitles.map(([title, year], i) => ({
  id: i === 9 ? 'movie-the-last' : `movie-${i + 1}`, series: 'movies', number: i + 1, title, year,
  arc: i === 9 ? 'The Last: Naruto the Movie' : 'Самостійна пригода поза основним сюжетом',
  type: i === 9 ? 'story' : 'filler', mixed: false, kind: 'movie',
  note: i === 9 ? 'Дивіться після «Шіппудена» № 493, перед № 494.' : 'Не входить до сюжетного маршруту; можна пропустити без втрати основної історії.',
}));
export const EPISODES = [...makeEpisodes('naruto'), ...makeEpisodes('shippuden'), ...makeEpisodes('rocklee')];
export const ITEMS = [...EPISODES, ...MOVIES];
export const ITEM_BY_ID = new Map(ITEMS.map(item => [item.id, item]));

const chapterDefinitions = [
  ['naruto', 1, 19, 'Перші кроки команди 7', 'Знайомство з героями та перша велика місія.'],
  ['naruto', 20, 80, 'Іспит на чуніна', 'Нові суперники й випробування для Конохи.'],
  ['naruto', 81, 100, 'Пошуки Цунаде', 'Подорож із Джираєю та нове тренування.'],
  ['naruto', 107, 135, 'Місія з повернення Саске', 'Завершальний великий сюжет першої частини.'],
  ['naruto', 141, 220, 'Місток до «Шіппудена»', 'Збережіть перехідні сцени: кінець № 141, початок № 142 і другу половину № 220.'],
  ['shippuden', 1, 32, 'Повернення додому', 'Нова зустріч із командою та місія в Суні.'],
  ['shippuden', 33, 56, 'Міст Тенчі', 'Нова місія команди 7 і початок наступного етапу.'],
  ['shippuden', 72, 90, 'Протистояння з Акацукі', 'Наступний крок у навчанні Наруто.'],
  ['shippuden', 113, 143, 'Шляхи, що перетинаються', 'Пошуки Ітачі, минуле Какаші та шлях Джираї.'],
  ['shippuden', 152, 175, 'Випробування Конохи', 'Великий сюжетний етап після нової підготовки.'],
  ['shippuden', 197, 222, 'Саміт п’яти каґе', 'Світ шинобі готується до змін.'],
  ['shippuden', 243, 278, 'Початок великої війни', 'Підготовка та перші операції об’єднаних сил.'],
  ['shippuden', 282, 302, 'Сили об’єднуються', 'Основна історія між побічними місіями.'],
  ['shippuden', 321, 346, 'Новий етап війни', 'Повернення до головного протистояння.'],
  ['shippuden', 362, 393, 'Вирішальний етап', 'Команда 7 знову в центрі історії.'],
  ['shippuden', 414, 426, 'На шляху до фіналу', 'Події, що ведуть до завершення війни.'],
  ['shippuden', 451, 479, 'Завершення великої історії', 'Історія Ітачі та фінал основного сюжету.'],
  ['shippuden', 484, 493, 'Після головних подій', 'Адаптації новел про Саске та Шікамару.'],
  ['movies', 10, 10, 'Останній: Наруто — фільм', 'The Last · 2014 · сюжетний місток перед епілогом.'],
  ['shippuden', 494, 500, 'Епілог: новий розділ', 'Останні сім серій завершують історію «Шіппудена».'],
];
export function formatRanges(numbers) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    let end = start;
    while (sorted[i + 1] === end + 1) end = sorted[++i];
    ranges.push(start === end ? String(start) : `${start}–${end}`);
  }
  return ranges.join(', ');
}
export const CHAPTERS = chapterDefinitions.map(([series, from, to, title, description], index) => {
  const items = ITEMS.filter(item => item.series === series && item.number >= from && item.number <= to && item.type === 'story');
  return { id: `chapter-${index + 1}`, series, title, description, items, ranges: formatRanges(items.map(item => item.number)) };
});
export const STORY_ITEMS = CHAPTERS.flatMap(chapter => chapter.items);

export const SOURCES = [
  { title: 'Anime Filler List — Наруто', url: 'https://www.animefillerlist.com/shows/naruto', description: 'Позначки всіх 220 серій, зокрема змішаних № 141–142 та № 220.' },
  { title: 'Anime Filler List — Шіппуден', url: 'https://www.animefillerlist.com/shows/naruto-shippuden', description: 'Позначки 500 серій. № 28 — канон аніме; новели й змішані серії залишено в маршруті.' },
  { title: 'Studio Pierrot — Рок Лі', url: 'https://pierrot.jp/archive/2010/tv10_05.html', description: 'Офіційна сторінка окремого серіалу з 51 епізоду.' },
  { title: 'The Last — місце в історії', url: 'https://en.wikipedia.org/wiki/The_Last:_Naruto_the_Movie', description: 'Сюжетний фільм між основними подіями та фінальним епілогом.' },
];
