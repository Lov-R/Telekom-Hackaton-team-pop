import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {getLanguage, setLanguage, locale, t, taskTitle} from '../src/i18n.js';

afterEach(() => setLanguage('hr'));

test('supported languages select their locale and unsupported values fall back to Croatian', () => {
  assert.equal(setLanguage('en'), 'en');
  assert.equal(getLanguage(), 'en');
  assert.equal(locale(), 'en-GB');
  assert.equal(setLanguage('hr'), 'hr');
  assert.equal(locale(), 'hr-HR');
  for (const value of ['de', 'EN', '', null, undefined]) {
    setLanguage('en');
    assert.equal(setLanguage(value), 'hr');
    assert.equal(getLanguage(), 'hr');
    assert.equal(locale(), 'hr-HR');
  }
});

test('translations substitute own placeholders, preserve missing ones and fall back when English is absent', () => {
  assert.equal(t('Još {count} dana, {name}.', '{count} days left, {name}.', {count: 0, name: 'Ana'}), 'Još 0 dana, Ana.');
  setLanguage('en');
  assert.equal(t('Još {count} dana, {name}.', '{count} days left, {name}.', {count: 2, name: 'Ana'}), '2 days left, Ana.');
  assert.equal(t('Rezultat: {value}/{value}.', 'Result: {value}/{value}.', {value: false}), 'Result: false/false.');
  assert.equal(t('Ime: {name}.', 'Name: {name}.', {name: ''}), 'Name: .');
  assert.equal(t('Nema {missing}.', 'No {missing}.'), 'No {missing}.');
  assert.equal(t('Samo hrvatski {count}.', undefined, {count: 3}), 'Samo hrvatski 3.');
  const inherited = Object.create({name: 'inherited'});
  assert.equal(t('{name}', '{name}', inherited), '{name}');
});

test('untouched sample task titles and the Apple sample translate for display', () => {
  const samples = [
    [{id: 'meeting', title: 'Sastanak s timom'}, 'Team meeting'],
    [{id: 'car', title: 'Registracija auta'}, 'Car registration'],
    [{id: 'doctor', title: 'Liječnički pregled'}, 'Medical appointment'],
    [{id: 'walk', title: 'Jutarnja šetnja'}, 'Morning walk'],
    [{id: 'dentist', title: 'Dogovoriti termin kod zubara'}, 'Book a dentist appointment'],
    [{id: 'imported-id', sourceId: 'apple-demo-project', title: 'Sastanak o projektu'}, 'Project meeting'],
  ];
  setLanguage('en');
  for (const [task, english] of samples) assert.equal(taskTitle(task), english);
  setLanguage('hr');
  for (const [task] of samples) assert.equal(taskTitle(task), task.title);
});

test('custom titles survive language changes even on seed IDs, with no task mutation', () => {
  const tasks = [
    {id: 'custom', title: 'Moj termin — četvrtak'},
    {id: 'meeting', title: 'Razgovor s Anom'},
    {id: 'custom-same-copy', title: 'Sastanak s timom'},
    {id: 'renamed-import', sourceId: 'apple-demo-project', title: 'Projekt: moj naziv'},
    {id: 'car', title: 'Registracija auta', status: 'pending'},
  ].map(task => Object.freeze(task));
  const before = structuredClone(tasks);
  for (const language of ['hr', 'en', 'hr', 'en', 'hr']) {
    setLanguage(language);
    for (const task of tasks.slice(0, 4)) assert.equal(taskTitle(task), task.title);
    assert.equal(taskTitle(tasks[4]), language === 'en' ? 'Car registration' : 'Registracija auta');
    assert.deepEqual(tasks, before);
  }
  assert.equal(taskTitle(undefined), '');
});
