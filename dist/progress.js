import { ITEM_BY_ID } from './data.js';

export const STORAGE_KEY = 'naruto-cheatsheet:progress:v1';
export function decodeProgress(raw) {
  if (raw === null) return new Set();
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !Array.isArray(value.watched) || value.watched.some(id => typeof id !== 'string')) throw new Error('Невідомий формат прогресу');
  return new Set(value.watched.filter(id => ITEM_BY_ID.has(id)));
}
export function encodeProgress(watched) {
  return JSON.stringify({ version: 1, watched: [...watched].filter(id => ITEM_BY_ID.has(id)).sort() });
}
export function applyWatched(current, ids, watched) {
  if (!Array.isArray(ids) || typeof watched !== 'boolean' || ids.some(id => !ITEM_BY_ID.has(id))) throw new Error('Невідомі серії або статус');
  const next = new Set(current);
  for (const id of ids) watched ? next.add(id) : next.delete(id);
  return next;
}

// Local by explicit user choice. Each write merges with the freshest saved state
// so another tab's changes are not silently overwritten by a stale UI snapshot.
export function saveChange(storage, ids, watched) {
  const current = decodeProgress(storage.getItem(STORAGE_KEY));
  const previous = ids.map(id => [id, current.has(id)]);
  const next = applyWatched(current, ids, watched);
  storage.setItem(STORAGE_KEY, encodeProgress(next));
  return { next, previous };
}
export function undoChange(storage, previous) {
  const next = decodeProgress(storage.getItem(STORAGE_KEY));
  for (const [id, watched] of previous) watched ? next.add(id) : next.delete(id);
  storage.setItem(STORAGE_KEY, encodeProgress(next));
  return next;
}
