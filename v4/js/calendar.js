// calendar.js — calendario + todo HA
import { TODO_ENTITY } from './config.js';

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                 'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

let calYear, calMonth, selectedDay;
export let allItems = [];

export function padZ(n) { return n < 10 ? '0'+n : ''+n; }
export function dayKey(y, m, d) { return `${y}-${padZ(m+1)}-${padZ(d)}`; }

export function loadTodoItems() {
  return new Promise(resolve => {
    if (!window.HA) { resolve(); return; }
    window.HA.send('todo/item/list', { entity_id: TODO_ENTITY }, resp => {
      allItems = resp?.items || [];
      resolve();
    });
  });
}

export function renderCal(y, m) {
  calYear = y; calMonth = m;
  const titleEl = document.getElementById('calTitle');
  if (titleEl) titleEl.textContent = `${MONTHS[m]} ${y}`;

  const grid = document.getElementById('calGrid');
  if (!grid) return;
  while (grid.firstChild) grid.removeChild(grid.firstChild);

  const today = new Date();
  const firstDay = new Date(y, m, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));

  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(y, m, d);
    const isToday = y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
    const dow = new Date(y, m, d).getDay();

    const cell = document.createElement('div');
    cell.style.cssText = `display:flex;align-items:flex-start;justify-content:flex-start;flex-direction:column;
      border-radius:10px;cursor:pointer;position:relative;width:100%;height:100%;min-height:0;
      padding:4px 5px;box-sizing:border-box;transition:background 0.15s;
      background:${isToday ? 'var(--primary)' : 'rgba(255,255,255,0.04)'};
      color:${isToday ? '#fff' : dow===0 ? 'var(--red)' : dow===6 ? 'var(--primary)' : 'var(--text)'};
      font-weight:${isToday ? '800' : '500'};`;

    const numEl = document.createElement('span');
    numEl.textContent = d;
    numEl.style.cssText = 'font-size:2rem;font-weight:700;line-height:1.2;align-self:flex-start;';
    cell.appendChild(numEl);

    const dayItems = allItems
      .filter(it => (it.summary || '').startsWith(key))
      .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0));

    dayItems.slice(0, 3).forEach((it, i) => {
      const t = document.createElement('span');
      const txt = (it.summary || '').replace(/^\d{4}-\d{2}-\d{2}\s*/, '');
      t.textContent = `${i+1}. ${txt}`;
      t.style.cssText = `font-size:1.5rem;display:block;width:100%;overflow:hidden;
        white-space:nowrap;text-overflow:ellipsis;margin-top:1px;text-align:left;
        ${it.status === 'completed' ? 'text-decoration:line-through;color:var(--text-dim);' : 'color:var(--cyan);'}`;
      cell.appendChild(t);
    });

    cell.addEventListener('click', () => openDayModal(y, m, d));
    grid.appendChild(cell);
  }
}

function openDayModal(y, m, d) {
  selectedDay = dayKey(y, m, d);
  const title = document.getElementById('dayModalTitle');
  const input = document.getElementById('dayTodoInput');
  if (title) title.textContent = `${padZ(d)} ${MONTHS[m]} ${y}`;
  if (input) input.value = '';
  loadTodoItems().then(() => {
    renderDayItems();
    const modal = document.getElementById('dayModal');
    if (modal) modal.style.display = 'flex';
  });
}

function renderDayItems() {
  const list = document.getElementById('dayTodoList');
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);

  const items = allItems
    .filter(it => (it.summary || '').startsWith(selectedDay))
    .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0));

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-dim);font-size:0.85rem;text-align:center;padding:16px;';
    empty.textContent = 'Nessuna nota per questo giorno';
    list.appendChild(empty);
    return;
  }

  items.forEach((it, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);';

    const cb = document.createElement('input'); cb.type = 'checkbox';
    cb.checked = it.status === 'completed';
    cb.dataset.uid = it.uid || '';
    cb.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:var(--primary);flex-shrink:0;';

    const lbl = document.createElement('span');
    lbl.style.cssText = `flex:1;font-size:0.85rem;${it.status === 'completed' ? 'text-decoration:line-through;color:var(--text-dim);' : 'color:var(--text);'}`;
    lbl.textContent = `${i+1}. ` + (it.summary || '').replace(/^\d{4}-\d{2}-\d{2}\s*/, '');

    const del = document.createElement('button');
    del.textContent = '✕';
    del.dataset.uid = it.uid || '';
    del.style.cssText = 'background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem;';

    const refresh = () => setTimeout(() => loadTodoItems().then(() => { renderDayItems(); renderCal(calYear, calMonth); }), 500);

    cb.addEventListener('change', () => {
      if (!window.HA) return;
      window.HA.callService('todo', 'update_item', {
        entity_id: TODO_ENTITY, item: cb.dataset.uid,
        status: cb.checked ? 'completed' : 'needs_action'
      });
      refresh();
    });

    del.addEventListener('click', () => {
      if (!window.HA) return;
      window.HA.callService('todo', 'remove_item', { entity_id: TODO_ENTITY, item: del.dataset.uid });
      refresh();
    });

    row.appendChild(cb); row.appendChild(lbl); row.appendChild(del);
    list.appendChild(row);
  });
}

export function initCalendar() {
  document.getElementById('calPrev')?.addEventListener('click', () => {
    let m = calMonth - 1, y = calYear;
    if (m < 0) { m = 11; y--; }
    loadTodoItems().then(() => renderCal(y, m));
  });

  document.getElementById('calNext')?.addEventListener('click', () => {
    let m = calMonth + 1, y = calYear;
    if (m > 11) { m = 0; y++; }
    loadTodoItems().then(() => renderCal(y, m));
  });

  // Modal todo
  document.getElementById('dayTodoAdd')?.addEventListener('click', () => {
    const input = document.getElementById('dayTodoInput');
    const text = input?.value.trim();
    if (!text || !window.HA) return;
    window.HA.callService('todo', 'add_item', {
      entity_id: TODO_ENTITY,
      item: `${selectedDay} ${text}`
    });
    if (input) input.value = '';
    setTimeout(() => loadTodoItems().then(() => { renderDayItems(); renderCal(calYear, calMonth); }), 500);
  });

  document.getElementById('dayTodoInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('dayTodoAdd')?.click();
  });

  document.getElementById('dayModalClose')?.addEventListener('click', () => {
    const modal = document.getElementById('dayModal');
    if (modal) modal.style.display = 'none';
  });

  document.getElementById('dayModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('dayModal'))
      document.getElementById('dayModal').style.display = 'none';
  });

  // Init
  const now = new Date();
  setTimeout(() => loadTodoItems().then(() => renderCal(now.getFullYear(), now.getMonth())), 1200);
}
