import {localDate, mondayOf} from './domain.mjs';
import {t, locale, taskTitle} from './i18n.js';

const weekdays = () => [t('pon', 'Mon'), t('uto', 'Tue'), t('sri', 'Wed'), t('čet', 'Thu'), t('pet', 'Fri'), t('sub', 'Sat'), t('ned', 'Sun')];
const viewNames = () => ({day: t('Dnevni pregled', 'Daily view'), week: t('Tjedni pregled', 'Weekly view'), month: t('Mjesečni pregled', 'Monthly view')});
const dateObject = date => new Date(`${date}T12:00:00`);
const format = (date, options) => new Intl.DateTimeFormat(locale(), options).format(dateObject(date));
const countLabel = count => count === 1 ? t('1 zadatak', '1 task') : t('{count} zadataka', '{count} tasks', {count});

// Work with local noon: changing a date must not move it across a UTC/DST boundary.
export function addTaskDays(date, amount) {
  const next = dateObject(date);
  next.setDate(next.getDate() + amount);
  return localDate(next);
}

export function shiftTaskPeriod(date, view, amount) {
  if (view !== 'month') return addTaskDays(date, amount * (view === 'week' ? 7 : 1));
  const next = dateObject(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate();
  next.setDate(Math.min(day, lastDay));
  return localDate(next);
}

export function taskWeekDates(date) {
  const monday = mondayOf(date);
  return Array.from({length: 7}, (_, index) => addTaskDays(monday, index));
}

export function taskMonthDates(date) {
  const first = `${date.slice(0, 7)}-01`;
  const start = mondayOf(first);
  const current = dateObject(first);
  const monthLength = new Date(current.getFullYear(), current.getMonth() + 1, 0, 12).getDate();
  const offset = (current.getDay() + 6) % 7;
  const length = Math.ceil((offset + monthLength) / 7) * 7;
  return Array.from({length}, (_, index) => addTaskDays(start, index));
}

export function createTaskViews({root, getState, persist, render, taskHTML, icon, esc, signal, categories}) {
  let categoryFilter = '';
  const selectedView = () => ['day', 'week', 'month'].includes(getState().prefs.taskView) ? getState().prefs.taskView : 'week';
  const selectedDate = () => getState().date || localDate();
  const tasksForDate = date => getState().tasks.filter(task => task.date === date && (!categories || categories.matches(categories.idForTask(task), categoryFilter)));

  function categoryPicker() {
    if (!categories) return '';
    return `<div class="rg-task-category-filter"><select data-task-category-filter aria-label="${t('Kategorija zadataka', 'Task category')}">${categories.options(categoryFilter, {all: true})}</select><button type="button" data-category-manage aria-label="${t('Uredi kategorije zadataka', 'Manage task categories')}">${icon('plus')}${t('Kategorije', 'Categories')}</button></div>`;
  }

  function settingsSection() {
    return `<section class="fs-panel rg-task-view-settings"><div class="fs-section-heading"><h2>${t('Tvoji zadaci', 'Your tasks')}</h2>${icon('calendar-days')}</div><label class="fs-field">${t('Početni pregled zadataka', 'Default task view')}<select data-pref="taskView">${Object.entries(viewNames()).map(([value, title]) => `<option value="${value}" ${selectedView() === value ? 'selected' : ''}>${title}</option>`).join('')}</select></label><p class="fs-small-print">${t('Odabrani pregled otvara se u tabu Zadaci.', 'This view opens in the Tasks tab.')}</p></section>`;
  }

  function dayButton(date, month = false) {
    const tasks = tasksForDate(date);
    const pending = tasks.filter(task => task.status === 'pending').length;
    const selected = date === selectedDate();
    const today = date === localDate();
    const outside = month && date.slice(0, 7) !== selectedDate().slice(0, 7);
    const day = dateObject(date).getDate();
    return `<button type="button" class="rg-task-day${selected ? ' is-selected' : ''}${outside ? ' is-outside' : ''}${today ? ' is-today' : ''}" data-date="${date}" aria-pressed="${selected}" ${today ? 'aria-current="date"' : ''} aria-label="${esc(format(date, {weekday: 'long', day: 'numeric', month: 'long'}))}${today ? t(', danas', ', today') : ''}, ${countLabel(tasks.length)}${pending ? t(', {count} na redu', ', {count} pending', {count: pending}) : ''}">${!month ? `<small>${weekdays()[(dateObject(date).getDay() + 6) % 7]}</small>` : ''}<strong>${day}</strong><span class="rg-task-day-count${pending ? ' has-pending' : ''}" ${!tasks.length ? 'aria-hidden="true"' : ''}>${tasks.length || '·'}</span></button>`;
  }

  function view() {
    const date = selectedDate();
    const mode = selectedView();
    const week = taskWeekDates(date);
    const title = mode === 'month' ? format(date, {month: 'long', year: 'numeric'}) : mode === 'week' ? `${format(week[0], {day: 'numeric', month: 'short'})} – ${format(week[6], {day: 'numeric', month: 'short'})}` : format(date, {weekday: 'long', day: 'numeric', month: 'long'});
    const tasks = tasksForDate(date).sort((a, b) => (a.time || '').localeCompare(b.time || '') || taskTitle(a).localeCompare(taskTitle(b), locale()));
    const completed = tasks.filter(task => task.status === 'completed').length;
    const periodName = mode === 'month' ? [t('Prethodni mjesec', 'Previous month'), t('Sljedeći mjesec', 'Next month')] : mode === 'week' ? [t('Prethodni tjedan', 'Previous week'), t('Sljedeći tjedan', 'Next week')] : [t('Prethodni dan', 'Previous day'), t('Sljedeći dan', 'Next day')];
    const calendar = mode === 'week' ? `<div class="rg-task-week" aria-label="${t('Dani u tjednu', 'Days of the week')}">${week.map(day => dayButton(day)).join('')}</div>` : mode === 'month' ? `<div class="rg-task-month" aria-label="${t('Mjesečni kalendar', 'Monthly calendar')}"><div class="rg-task-weekday-head" aria-hidden="true">${weekdays().map(day => `<span>${day}</span>`).join('')}</div><div class="rg-task-month-grid">${taskMonthDates(date).map(day => dayButton(day, true)).join('')}</div><p class="rg-task-calendar-key"><span></span>${t('Broj zadataka · narančasto = na redu', 'Task count · orange = pending')}</p></div>` : '';
    return `<section class="rg-task-calendar" data-task-view="${mode}"><div class="rg-task-calendar-meta"><span>${viewNames()[mode]}</span><button type="button" data-view="settings" aria-label="${t('Postavke pregleda zadataka', 'Task view settings')}">${icon('sliders-horizontal')}</button></div>${categoryPicker()}<div class="rg-task-period-heading"><button type="button" data-task-period="prev" aria-label="${periodName[0]}">${icon('chevron-left')}</button><h2 style="text-transform:none">${esc(title)}</h2><button type="button" data-task-period="next" aria-label="${periodName[1]}">${icon('chevron-right')}</button></div><div class="rg-task-today-row"><button type="button" data-task-period="today">${t('Danas', 'Today')}</button></div>${calendar}<div class="fs-section-heading rg-task-selected-heading"><h2>${date === localDate() ? t('Danas', 'Today') : format(date, {day: 'numeric', month: 'long'})}</h2><span class="fs-count">${completed ? t('{completed}/{total} dovršeno', '{completed}/{total} completed', {completed, total: tasks.length}) : countLabel(tasks.length)}</span></div><div class="fs-task-list fs-calendar-list">${tasks.length ? tasks.map(taskHTML).join('') : `<div class="fs-panel fs-empty rg-task-empty">${icon('calendar-check')}<h3>${t('Prostor za novi korak.', 'Room for a new step.')}</h3><p>${categoryFilter && categories ? t('Nema zadataka za ovaj dan u kategoriji {category}.', 'No tasks for this day in {category}.', {category: esc(categories.label(categoryFilter))}) : t('Nema zadataka za ovaj dan.', 'No tasks for this day.')}</p><button type="button" class="fs-secondary" data-action="new">${icon('plus')}${t('Dodaj zadatak', 'Add task')}</button></div>`}</div></section>`;
  }

  root.addEventListener('change', event => {
    if (!event.target.matches('[data-task-category-filter]')) return;
    categoryFilter = event.target.value;
    render();
    root.querySelector('[data-task-category-filter]')?.focus({preventScroll: true});
  }, {signal});

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-task-period]');
    if (!button || button.disabled) return;
    const action = button.dataset.taskPeriod;
    const state = getState();
    state.date = action === 'today' ? localDate() : shiftTaskPeriod(selectedDate(), selectedView(), action === 'next' ? 1 : -1);
    persist();
    render();
    root.querySelector(`[data-task-period="${action}"]`)?.focus({preventScroll: true});
  }, {signal});

  return {view, settingsSection};
}
