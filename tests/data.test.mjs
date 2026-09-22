import test from 'node:test';
import assert from 'node:assert/strict';
import { EPISODES, MOVIES, ITEMS, ITEM_BY_ID, STORY_ITEMS, CHAPTERS, expandRanges, formatRanges, classification } from '../dist/data.js';

test('каталог містить повні послідовності серій без дублікатів', () => {
  assert.equal(EPISODES.length, 771);
  assert.equal(MOVIES.length, 10);
  assert.equal(new Set(ITEMS.map(item => item.id)).size, 781);
  for (const [series, total] of [['naruto', 220], ['shippuden', 500], ['rocklee', 51]]) {
    assert.deepEqual(EPISODES.filter(item => item.series === series).map(item => item.number), Array.from({ length: total }, (_, i) => i + 1));
  }
});
test('усі сюжетні серії є в маршруті рівно один раз; філерів і спінофів немає', () => {
  assert.equal(STORY_ITEMS.length, 428);
  assert.deepEqual(new Set(STORY_ITEMS.map(item => item.id)), new Set(ITEMS.filter(item => item.type === 'story').map(item => item.id)));
  assert.equal(new Set(STORY_ITEMS.map(item => item.id)).size, STORY_ITEMS.length);
  assert.equal(ITEMS.filter(item => item.kind === 'episode' && item.type === 'filler').length, 293);
  assert.ok(CHAPTERS.every(chapter => chapter.items.length > 0));
});
test('The Last розміщено після 493 та перед 494; перехідні серії збережено', () => {
  const index = STORY_ITEMS.findIndex(item => item.id === 'movie-the-last');
  assert.equal(STORY_ITEMS[index - 1].id, 'shippuden-493');
  assert.equal(STORY_ITEMS[index + 1].id, 'shippuden-494');
  for (const id of ['naruto-141', 'naruto-142', 'naruto-220', 'shippuden-28', 'shippuden-451', 'shippuden-458', 'shippuden-479']) assert.ok(STORY_ITEMS.some(item => item.id === id));
  for (const id of ['naruto-26', 'naruto-97', 'shippuden-57', 'shippuden-480', 'rocklee-1', 'movie-1']) assert.ok(!STORY_ITEMS.some(item => item.id === id));
});
test('класифікація не перетинає змішані серії з повними філерами', () => {
  for (const [series, ranges] of Object.entries(classification)) {
    const filler = new Set(expandRanges(ranges.filler));
    for (const number of expandRanges(ranges.mixed)) {
      assert.equal(filler.has(number), false);
      assert.equal(ITEM_BY_ID.get(`${series}-${number}`).type, 'story');
    }
  }
});
test('згортання діапазонів не губить жодної серії', () => {
  for (const chapter of CHAPTERS) assert.deepEqual(expandRanges(chapter.ranges), chapter.items.map(item => item.number));
  assert.equal(formatRanges([5, 1, 2, 2, 3, 8]), '1–3, 5, 8');
});
