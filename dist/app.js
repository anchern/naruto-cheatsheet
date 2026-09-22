import { SERIES, TYPES, ITEMS, ITEM_BY_ID, CHAPTERS, STORY_ITEMS, SOURCES } from './data.js';
import { STORAGE_KEY, decodeProgress, saveChange, undoChange } from './progress.js';

const $ = selector => document.querySelector(selector);
const content = $('#page-content');
const PAGE_SIZE = 40;
const state = { page: 'catalog', series: 'naruto', type: 'all', status: 'all', query: '', pagination: 1, selected: new Set(), rangeOpen: false };
let watched = new Set();
let lastChange = null;
let toastTimer;
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const ids = items => items.map(item => item.id);
const countWatched = items => items.filter(item => watched.has(item.id)).length;
const pretty = number => new Intl.NumberFormat('uk-UA').format(number);

function notice(message = '') {
  $('#storage-notice').textContent = message;
  $('#storage-notice').hidden = !message;
}
function loadProgress() {
  try { watched = decodeProgress(localStorage.getItem(STORAGE_KEY)); notice(); }
  catch { notice('Не вдалося прочитати збережений прогрес. Наявні дані не перезаписано. Перевірте, чи дозволено зберігання даних сайту в браузері.'); }
}
function toast(message, canUndo = true) {
  clearTimeout(toastTimer);
  $('#toast-text').textContent = message;
  $('#undo-button').hidden = !canUndo;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 12000);
}
function preserveRender() {
  const focusId = document.activeElement?.id;
  const openDetails = [...document.querySelectorAll('.chapter-details[open]')].map(el => el.id);
  const scrollY = window.scrollY;
  renderPage();
  for (const id of openDetails) { const el = document.getElementById(id); if (el) el.open = true; }
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  window.scrollTo({ top: scrollY, behavior: 'instant' });
}
function setWatched(itemIds, value) {
  if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > ITEMS.length || typeof value !== 'boolean' || itemIds.some(id => !ITEM_BY_ID.has(id))) throw new Error('Вкажіть відомі серії та статус перегляду.');
  try {
    const result = saveChange(localStorage, [...new Set(itemIds)], value);
    watched = result.next;
    lastChange = result.previous;
    notice();
  } catch {
    notice('Зміни не збережено. Браузер не дозволив записати прогрес або збережені дані пошкоджено. Попередні відмітки залишилися без змін.');
    throw new Error('Не вдалося зберегти прогрес.');
  }
  state.selected.clear();
  preserveRender();
  toast(`${value ? 'Переглянуто' : 'Не переглянуто'}: ${pretty(new Set(itemIds).size)}.`);
  return { updated: new Set(itemIds).size, watched: value, totalWatched: watched.size };
}
function safeSetWatched(itemIds, value) { try { setWatched(itemIds, value); } catch { /* The visible storage notice explains the failure. */ } }
function renderProgress() {
  const count = countWatched(STORY_ITEMS);
  const percent = Math.round(count / STORY_ITEMS.length * 100);
  $('#overall-percent').textContent = `${percent}%`;
  $('#overall-count').textContent = `${count} із ${STORY_ITEMS.length} · 427 серій + 1 фільм`;
  $('#overall-fill').style.width = `${percent}%`;
  $('.journey-progress').setAttribute('aria-label', `Переглянуто ${count} із ${STORY_ITEMS.length} частин сюжетного маршруту, ${percent}%`);
  $('#storage-label').textContent = 'Збереження в цьому браузері · без акаунта';
}
function badge(item) {
  return `<span class="badge ${item.type}">${TYPES[item.type]}</span>${item.mixed ? '<span class="type-note">Змішана серія</span>' : item.novel ? '<span class="type-note">За новелою</span>' : item.animeCanon ? '<span class="type-note">Канон аніме</span>' : ''}`;
}
function watchButton(item) {
  const yes = watched.has(item.id);
  return `<button type="button" id="watch-${item.id}" class="watched-button" data-watch="${item.id}" aria-pressed="${yes}" aria-label="${yes ? 'Позначити не переглянутим' : 'Позначити переглянутим'}: ${escape(SERIES[item.series].short)}, ${escape(item.title)}"><span class="watch-icon" aria-hidden="true">${yes ? '✓' : ''}</span><span class="watch-label">${yes ? 'Переглянуто' : 'Не переглянуто'}</span></button>`;
}
function filteredItems() {
  const query = state.query.trim().toLocaleLowerCase('uk-UA');
  const range = query.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  return ITEMS.filter(item => {
    if (item.series !== state.series || state.type !== 'all' && item.type !== state.type) return false;
    if (state.status === 'watched' && !watched.has(item.id) || state.status === 'unwatched' && watched.has(item.id)) return false;
    if (!query) return true;
    if (range) return item.number >= Number(range[1]) && item.number <= Number(range[2]);
    if (/^\d+$/.test(query)) return item.number === Number(query);
    return `${item.title} ${item.arc}`.toLocaleLowerCase('uk-UA').includes(query);
  });
}
function renderSelection() {
  const selected = state.selected.size;
  const bar = $('#selection-bar');
  if (!bar) return;
  bar.hidden = !selected;
  $('#selection-count').textContent = `Вибрано: ${selected}`;
  const all = filteredItems();
  $('#select-all-results').textContent = `Вибрати всі результати (${all.length})`;
  $('#select-all-results').disabled = !all.length || all.every(item => state.selected.has(item.id));
  const pageItems = all.slice((state.pagination - 1) * PAGE_SIZE, state.pagination * PAGE_SIZE);
  const checkedCount = pageItems.filter(item => state.selected.has(item.id)).length;
  const allCheckbox = $('#select-page');
  if (allCheckbox) {
    allCheckbox.checked = pageItems.length > 0 && checkedCount === pageItems.length;
    allCheckbox.indeterminate = checkedCount > 0 && checkedCount < pageItems.length;
    allCheckbox.disabled = pageItems.length === 0;
  }
}
function renderResults() {
  const items = filteredItems();
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  state.pagination = Math.min(state.pagination, pageCount);
  const pageItems = items.slice((state.pagination - 1) * PAGE_SIZE, state.pagination * PAGE_SIZE);
  $('#episode-rows').innerHTML = pageItems.map(item => `<tr class="${state.selected.has(item.id) ? 'selected ' : ''}${watched.has(item.id) ? 'watched-row' : ''}" data-row="${item.id}">
    <td><input class="row-select" id="select-${item.id}" type="checkbox" data-select="${item.id}" ${state.selected.has(item.id) ? 'checked' : ''} aria-label="Вибрати: ${escape(SERIES[item.series].short)}, ${escape(item.title)}"></td>
    <td class="episode-number">${item.kind === 'movie' ? `Фільм ${item.number}` : `№ ${String(item.number).padStart(3, '0')}`}<small>${item.kind === 'movie' ? item.year : SERIES[item.series].short}</small></td>
    <td><span class="arc-name">${escape(item.kind === 'movie' ? item.title : item.arc)}</span>${item.kind === 'movie' ? `<div class="row-subtitle">${escape(item.arc)}</div>` : ''}</td>
    <td ${item.note ? `title="${escape(item.note)}"` : ''}>${badge(item)}</td>
    <td>${watchButton(item)}</td>
  </tr>`).join('');
  $('#empty-state').hidden = items.length > 0;
  $('#episode-table').hidden = items.length === 0;
  $('#result-count').textContent = items.length ? `${(state.pagination - 1) * PAGE_SIZE + 1}–${Math.min(state.pagination * PAGE_SIZE, items.length)} із ${items.length}` : '0 результатів';
  $('#page-number').textContent = `${state.pagination} / ${pageCount}`;
  $('#previous-page').disabled = state.pagination === 1;
  $('#next-page').disabled = state.pagination === pageCount;
  const allSeries = ITEMS.filter(item => item.series === state.series);
  $('#series-watched-count').innerHTML = `<strong>${countWatched(allSeries)}</strong> / ${allSeries.length} переглянуто`;
  renderSelection();
}
function renderCatalog() {
  const contexts = {
    naruto: '', shippuden: '',
    rocklee: '<strong>Окремий комедійний спіноф.</strong> Усі 51 серія про Рока Лі є в каталозі, але не входять до основного маршруту.',
    movies: '<strong>Для основного сюжету потрібен The Last.</strong> Решта дев’ять фільмів — самостійні пригоди. «Боруто» починає окреме продовження й не входить до цієї шпаргалки.',
  };
  content.innerHTML = `<section aria-label="Каталог серій">
    <div class="catalog-heading"><div class="series-tabs" aria-label="Серіал">${Object.entries(SERIES).map(([key, series]) => `<button type="button" id="series-${key}" class="series-tab" data-series="${key}" aria-pressed="${state.series === key}">${series.short}<small>${series.count}</small></button>`).join('')}</div><p id="series-watched-count" class="catalog-counter"></p></div>
    ${contexts[state.series] ? `<p class="series-context">${contexts[state.series]}</p>` : ''}
    <div class="panel">
      <div class="toolbar"><label class="search-box"><span aria-hidden="true">⌕</span><span class="sr-only">Пошук за номером, діапазоном або аркою</span><input id="search" type="search" placeholder="Номер серії або назва арки…" value="${escape(state.query)}" autocomplete="off"></label>
        <label class="sr-only" for="type-filter">Тип серії</label><select id="type-filter"><option value="all">Усі типи</option>${Object.entries(TYPES).map(([key, label]) => `<option value="${key}" ${state.type === key ? 'selected' : ''}>${label}</option>`).join('')}</select>
        <label class="sr-only" for="status-filter">Статус перегляду</label><select id="status-filter"><option value="all">Усі статуси</option><option value="unwatched" ${state.status === 'unwatched' ? 'selected' : ''}>Не переглянуто</option><option value="watched" ${state.status === 'watched' ? 'selected' : ''}>Переглянуто</option></select>
        <button type="button" class="button" id="range-toggle" aria-expanded="${state.rangeOpen}" aria-controls="range-panel"><span aria-hidden="true">↔</span> Вибрати діапазон</button>
      </div>
      <div class="range-panel" id="range-panel" ${state.rangeOpen ? '' : 'hidden'}><form id="range-form"><span class="range-label">${SERIES[state.series].short}</span><label>Від №<input id="range-start" name="start" type="number" min="1" max="${SERIES[state.series].count}" value="1" required></label><label>До №<input id="range-end" name="end" type="number" min="1" max="${SERIES[state.series].count}" value="${Math.min(25, SERIES[state.series].count)}" required></label><button type="submit" class="button primary">Вибрати</button></form><p class="range-note">Вибирає всі номери в діапазоні цього розділу, включно з прихованими фільтрами. Потім оберіть статус.</p><p id="range-error" class="inline-error" role="alert" hidden></p></div>
      <div class="selection-bar" id="selection-bar" hidden><strong id="selection-count"></strong><button type="button" class="text-button" id="select-all-results"></button><div class="actions"><button type="button" class="button primary" id="mark-selection">✓ Переглянуто</button><button type="button" class="button" id="unmark-selection">Не переглянуто</button><button type="button" class="icon-button" id="clear-selection" aria-label="Скасувати вибір">✕</button></div></div>
      <div class="table-wrap"><table id="episode-table"><caption class="sr-only">${SERIES[state.series].name}: типи серій і статус перегляду</caption><thead><tr><th><input type="checkbox" id="select-page" class="row-select" aria-label="Вибрати всі серії на цій сторінці"></th><th scope="col">${state.series === 'movies' ? 'Фільм' : 'Серія'}</th><th scope="col">${state.series === 'movies' ? 'Назва' : 'Сюжетна арка'}</th><th scope="col">Тип</th><th scope="col">Перегляд</th></tr></thead><tbody id="episode-rows"></tbody></table></div>
      <div class="empty-state" id="empty-state" hidden><h3>Таких серій не знайшлося</h3><p>Спробуйте інший номер або змініть фільтри.</p><button type="button" class="button" id="clear-filters">Скинути фільтри</button></div>
      <div class="table-bottom"><p id="result-count" role="status" aria-live="polite"></p><div class="pagination" aria-label="Сторінки каталогу"><button type="button" id="previous-page" aria-label="Попередня сторінка">←</button><span id="page-number"></span><button type="button" id="next-page" aria-label="Наступна сторінка">→</button></div></div>
    </div>
    <div class="legend"><span><span class="badge story">Сюжетна</span> Основна історія</span><span><span class="badge filler">Філер</span> Можна пропустити</span><span><span class="badge spinoff">Спіноф</span> Окремий серіал</span><button class="text-button legend-rule" type="button" data-about>А що зі змішаними серіями?</button></div>
  </section>`;
  renderResults();
}
function renderStory() {
  const next = STORY_ITEMS.find(item => !watched.has(item.id));
  const nextChapter = next ? CHAPTERS.find(chapter => chapter.items.some(item => item.id === next.id)) : null;
  const nextTitle = next?.kind === 'movie' ? 'Час для The Last' : next ? `${SERIES[next.series].short} · № ${next.number}` : 'Історію завершено!';
  content.innerHTML = `<section aria-label="Рекомендований порядок перегляду">
    <div class="story-overview"><div class="story-stat"><strong>427 <span>серій</span></strong><span>Наруто + Шіппуден</span></div><div class="story-stat"><strong>1 <span>фільм</span></strong><span>The Last · 2014</span></div><div class="story-stat highlight"><strong>−293 <span>серії</span></strong><span>пропускаємо філери</span></div></div>
    <div class="story-jump"><a href="#story" data-jump="chapter-1">01 · Наруто</a><a href="#story" data-jump="chapter-6">02 · Шіппуден</a><a href="#story" data-jump="chapter-19">03 · The Last та фінал</a></div>
    <div class="story-layout"><div class="route-list">${CHAPTERS.map((chapter, i) => {
      const complete = countWatched(chapter.items);
      const allDone = complete === chapter.items.length;
      const isNext = nextChapter?.id === chapter.id;
      const isMovie = chapter.series === 'movies';
      return `<article class="route-chapter ${allDone ? 'completed' : ''} ${isNext ? 'next' : ''} ${isMovie ? 'movie-card' : ''}" id="${chapter.id}"><span class="step-number" aria-label="Крок ${i + 1}">${allDone ? '✓' : String(i + 1).padStart(2, '0')}</span><div class="chapter-card"><div class="chapter-top"><span class="chapter-series">${isMovie ? 'СЮЖЕТНИЙ ФІЛЬМ' : SERIES[chapter.series].short}</span>${isNext ? '<span class="next-label">ВИ ТУТ</span>' : isMovie ? '<span class="badge movie">The Last</span>' : ''}</div><h2>${chapter.title}</h2><p class="chapter-description">${chapter.description}</p><p class="episode-ranges">${isMovie ? 'Після № 493 · перед № 494 «Шіппудена»' : `<span>Дивитися:</span> ${chapter.ranges}`}</p><div class="chapter-footer"><span class="chapter-progress">${complete} / ${chapter.items.length} ${isMovie ? 'фільм' : 'серій'} переглянуто</span><button type="button" class="button ${allDone ? 'subtle' : ''}" id="mark-${chapter.id}" data-chapter="${chapter.id}" data-value="${!allDone}">${allDone ? 'Зняти всі відмітки' : isMovie ? '✓ Фільм переглянуто' : '✓ Позначити весь блок'}</button></div>${!isMovie ? `<details class="chapter-details" id="details-${chapter.id}"><summary>Відмітити окремі серії</summary><div class="episode-chips">${chapter.items.map(item => `<button type="button" class="episode-chip" id="chip-${item.id}" data-watch="${item.id}" aria-pressed="${watched.has(item.id)}" aria-label="${watched.has(item.id) ? 'Позначити не переглянутою' : 'Позначити переглянутою'}: ${SERIES[item.series].short}, серія ${item.number}">${item.number}</button>`).join('')}</div></details>` : ''}</div></article>`;
    }).join('')}</div><aside class="story-aside" aria-label="Підказки до маршруту"><div class="aside-card next-card"><p class="aside-eyebrow">${next ? 'НАСТУПНА ЗУПИНКА' : '100% МАРШРУТУ'}</p><h2>${nextTitle}</h2><p>${next ? escape(next.kind === 'movie' ? 'Сюжетний фільм перед останніми сімома серіями.' : next.arc) : 'Ви пройшли весь сюжетний маршрут. Усі відмітки збережено.'}</p>${next ? `<button type="button" class="button" id="continue-route" data-jump="${nextChapter.id}">До мого місця <span aria-hidden="true">↓</span></button>` : '<a class="button" href="#catalog">До каталогу</a>'}</div><div class="aside-card"><h3>Сюжет без зайвих відступів</h3><p>Повністю філерні серії, дев’ять позасюжетних фільмів та спіноф про Рока Лі пропущено.</p><details><summary>Чому є змішані серії?</summary><p>Вони поєднують важливі сюжетні сцени з додатковим матеріалом. Ми залишаємо їх, щоб історія не обривалася. Повністю прибрати філерні сцени без монтажу неможливо.</p></details><details><summary>А новели та № 28?</summary><p>Новели про Ітачі, Саске й Шікамару та фінальний епілог доповнюють історію в тому самому серіалі. Це не окремі спінофи. № 28 «Шіппудена» — канон аніме за класифікацією джерела.</p></details></div><div class="aside-card"><h3>Чому лише один фільм?</h3><p>The Last пов’язує основну історію з епілогом. Інші фільми не потрібні для її цілісності. «Боруто» — окреме продовження.</p><button type="button" class="text-button" data-about>Джерела та принцип відбору ↗</button></div></aside></div>
  </section>`;
}
function renderPage() {
  const isStory = state.page === 'story';
  $('#page-title').innerHTML = `${isStory ? 'Сюжетний маршрут' : 'Каталог серій'}<span class="orange">.</span>`;
  $('#page-subtitle').textContent = isStory ? 'Основна історія по порядку. Без повністю філерних серій та окремих спінофів.' : 'Сюжет, філери та побічні історії — усе на своїх місцях.';
  document.title = `${isStory ? 'Сюжетний маршрут' : 'Каталог серій'} — Наруто`;
  document.querySelectorAll('[data-page]').forEach(link => link.dataset.page === state.page ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current'));
  renderProgress();
  isStory ? renderStory() : renderCatalog();
}
function route() {
  state.page = location.hash === '#story' ? 'story' : 'catalog';
  state.selected.clear();
  renderPage();
}
function resetFilters() {
  state.type = 'all'; state.status = 'all'; state.query = ''; state.pagination = 1; state.selected.clear();
}
content.addEventListener('input', event => {
  if (event.target.id === 'search') { state.query = event.target.value; state.pagination = 1; state.selected.clear(); renderResults(); }
});
content.addEventListener('change', event => {
  const el = event.target;
  if (el.id === 'type-filter' || el.id === 'status-filter') {
    state[el.id === 'type-filter' ? 'type' : 'status'] = el.value;
    state.pagination = 1; state.selected.clear(); renderResults();
  } else if (el.dataset.select) {
    el.checked ? state.selected.add(el.dataset.select) : state.selected.delete(el.dataset.select);
    el.closest('tr').classList.toggle('selected', el.checked);
    renderSelection();
  } else if (el.id === 'select-page') {
    for (const item of filteredItems().slice((state.pagination - 1) * PAGE_SIZE, state.pagination * PAGE_SIZE)) el.checked ? state.selected.add(item.id) : state.selected.delete(item.id);
    renderResults(); $('#select-page').focus({ preventScroll: true });
  }
});
content.addEventListener('submit', event => {
  if (event.target.id !== 'range-form') return;
  event.preventDefault();
  const start = Number($('#range-start').value), end = Number($('#range-end').value);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > end || end > SERIES[state.series].count) {
    $('#range-error').textContent = `Вкажіть цілий діапазон від 1 до ${SERIES[state.series].count}; початок не може бути більшим за кінець.`;
    $('#range-error').hidden = false; return;
  }
  $('#range-error').hidden = true;
  state.selected = new Set(ids(ITEMS.filter(item => item.series === state.series && item.number >= start && item.number <= end)));
  renderResults();
  $('#mark-selection').focus({ preventScroll: true });
});
content.addEventListener('click', event => {
  const el = event.target.closest('button, a');
  if (!el) return;
  if (el.dataset.series) {
    state.series = el.dataset.series; resetFilters(); state.rangeOpen = false; preserveRender();
  } else if (el.dataset.watch) safeSetWatched([el.dataset.watch], !watched.has(el.dataset.watch));
  else if (el.dataset.chapter) {
    const chapter = CHAPTERS.find(chapter => chapter.id === el.dataset.chapter);
    safeSetWatched(ids(chapter.items), el.dataset.value === 'true');
  } else if (el.dataset.jump) {
    event.preventDefault();
    const chapter = document.getElementById(el.dataset.jump);
    chapter?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    chapter?.querySelector('button')?.focus({ preventScroll: true });
  } else if (el.hasAttribute('data-about')) $('#about-dialog').showModal();
  else switch (el.id) {
    case 'range-toggle': state.rangeOpen = !state.rangeOpen; $('#range-panel').hidden = !state.rangeOpen; el.setAttribute('aria-expanded', String(state.rangeOpen)); if (state.rangeOpen) $('#range-start').focus(); break;
    case 'mark-selection': safeSetWatched([...state.selected], true); break;
    case 'unmark-selection': safeSetWatched([...state.selected], false); break;
    case 'select-all-results': for (const item of filteredItems()) state.selected.add(item.id); renderResults(); break;
    case 'clear-selection': state.selected.clear(); renderResults(); $('#select-page').focus(); break;
    case 'clear-filters': resetFilters(); preserveRender(); $('#search').focus(); break;
    case 'previous-page': case 'next-page': state.pagination += el.id === 'previous-page' ? -1 : 1; renderResults(); $('.toolbar').scrollIntoView({ block: 'start' }); break;
  }
});
$('#undo-button').addEventListener('click', () => {
  if (!lastChange) return;
  try {
    watched = undoChange(localStorage, lastChange); lastChange = null; notice(); preserveRender(); toast('Останню зміну скасовано.', false);
  } catch { notice('Не вдалося скасувати зміну: браузер не дозволив зберегти прогрес.'); }
});
$('#about-body').innerHTML = `<p><span class="badge story">Сюжетна</span> Серії з матеріалом манґи, змішані серії, адаптації новел та канон аніме № 28 «Шіппудена».</p><p><span class="badge filler">Філер</span> Повністю додаткові серії або позасюжетні фільми. Для основної історії їх можна пропустити.</p><p><span class="badge spinoff">Спіноф</span> Окремий комедійний серіал про Рока Лі. Побічні арки всередині «Шіппудена» не перейменовуємо на спінофи.</p><p><strong>Змішані серії залишено.</strong> Вони містять сюжетні сцени, тому їх повний пропуск може створювати прогалини. № 141–142 і № 220 «Наруто» особливо важливі для переходу до другої частини.</p><p><strong>Порядок перегляду.</strong> Рекомендований порядок першого перегляду, а не сувора хронологія всіх спогадів. Після № 493 «Шіппудена» дивіться The Last, потім № 494–500. Усі новели залишено як частину телевізійної історії.</p><p><strong>Межі каталогу.</strong> 220 серій «Наруто», 500 — «Шіппудена», 51 — про Рока Лі та 10 фільмів про Наруто. «Боруто», OVA та спеціальні короткометражки не включено. Назви арок і фільмів подані українською як редакційні переклади; таблиця не відтворює офіційні назви кожної серії.</p><h3>Джерела · перевірено 22.09.2026</h3><ul>${SOURCES.map(source => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title} ↗</a><br>${source.description}</li>`).join('')}</ul><p>Класифікація філерів — довідкова, за спільнотою Anime Filler List. Різні довідники можуть інакше оцінювати змішані серії та новели.</p><h3>Ваші відмітки</h3><p>Прогрес зберігається лише в цьому браузері для цієї адреси сайту. Між пристроями він не синхронізується. Очищення даних сайту або завершення приватного сеансу може видалити відмітки.</p>`;
$('#about-open').addEventListener('click', () => $('#about-dialog').showModal());
$('#about-close').addEventListener('click', () => $('#about-dialog').close());
$('#about-dialog').addEventListener('click', event => { if (event.target === $('#about-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
window.addEventListener('hashchange', () => { route(); window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); });
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY || event.key === null) { loadProgress(); preserveRender(); } });
loadProgress();
route();

// Progressive enhancement: ordinary browsers need no WebMCP support.
const context = document.modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  const register = tool => {
    try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser API. */ }
  };
  register({ name: 'get_watch_progress', title: 'Прочитати прогрес перегляду', description: 'Повертає прогрес із цього браузера та наступну сюжетну серію. Не змінює відмітки.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Очікується порожній об’єкт.');
    loadProgress(); preserveRender();
    return { watched: [...watched], storyWatched: countWatched(STORY_ITEMS), storyTotal: STORY_ITEMS.length, next: STORY_ITEMS.find(item => !watched.has(item.id))?.id ?? null };
  } });
  register({ name: 'set_episodes_watched', title: 'Змінити статус перегляду', description: 'Позначає одну або кілька серій чи фільмів переглянутими або не переглянутими. ID: naruto-1…220, shippuden-1…500, rocklee-1…51, movie-1…9, movie-the-last. Зберігає зміни в цьому браузері та оновлює видимий інтерфейс.', inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: ITEMS.length }, watched: { type: 'boolean' } }, required: ['ids', 'watched'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['ids', 'watched'].includes(key))) throw new Error('Очікуються лише ids і watched.');
    return setWatched(input.ids, input.watched);
  } });
  window.addEventListener('pagehide', event => { if (!event.persisted) lifecycle.abort(); });
}
