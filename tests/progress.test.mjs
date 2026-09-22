import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, decodeProgress, encodeProgress, applyWatched, saveChange, undoChange } from '../dist/progress.js';

function storage(initial = null) {
  let value = initial;
  return { getItem: key => { assert.equal(key, STORAGE_KEY); return value; }, setItem: (key, next) => { assert.equal(key, STORAGE_KEY); value = next; } };
}
test('пакетна зміна та скасування відновлюють попередні змішані статуси', () => {
  const db = storage(encodeProgress(new Set(['naruto-1', 'shippuden-1'])));
  const { next, previous } = saveChange(db, ['naruto-1', 'naruto-2', 'naruto-3'], true);
  assert.deepEqual(next, new Set(['naruto-1', 'shippuden-1', 'naruto-2', 'naruto-3']));
  saveChange(db, ['naruto-4'], true); // An unrelated change in another tab.
  assert.deepEqual(undoChange(db, previous), new Set(['naruto-1', 'shippuden-1', 'naruto-4']));
});
test('нове читання відновлює прогрес, однакові номери різних серіалів незалежні', () => {
  const db = storage();
  saveChange(db, ['naruto-1', 'shippuden-1', 'movie-the-last'], true);
  saveChange(db, ['naruto-1'], false);
  assert.deepEqual(decodeProgress(db.getItem(STORAGE_KEY)), new Set(['movie-the-last', 'shippuden-1']));
});
test('пошкоджені дані та невідомі ID не перезаписують прогрес', () => {
  const db = storage('{broken');
  assert.throws(() => saveChange(db, ['naruto-1'], true));
  assert.equal(db.getItem(STORAGE_KEY), '{broken');
  const clean = storage();
  assert.throws(() => saveChange(clean, ['naruto-999'], true));
  assert.equal(clean.getItem(STORAGE_KEY), null);
  assert.throws(() => applyWatched(new Set(), ['naruto-1'], 'true'));
  assert.throws(() => decodeProgress('{"version":2,"watched":[]}'));
});
test('дублікати й невідомі старі ID не збільшують лічильники', () => {
  assert.deepEqual(decodeProgress('{"version":1,"watched":["naruto-1","naruto-1","old-1"]}'), new Set(['naruto-1']));
});
test('відмова сховища не змінює попередній набір відміток', () => {
  const raw = encodeProgress(new Set(['naruto-1']));
  const db = { getItem: () => raw, setItem: () => { throw new Error('QuotaExceeded'); } };
  assert.throws(() => saveChange(db, ['naruto-2'], true));
  assert.deepEqual(decodeProgress(db.getItem()), new Set(['naruto-1']));
});
