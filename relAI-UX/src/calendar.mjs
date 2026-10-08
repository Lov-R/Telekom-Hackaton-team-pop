import {t, getLanguage, taskTitle} from './i18n.js';

const escapeICS = value => String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp = date => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line) {
  let out='', part='';
  for (const char of line) {
    if (new TextEncoder().encode(part+char).length > 73) { out += part+'\r\n '; part=''; }
    part += char;
  }
  return out+part;
}
export function calendarFile(tasks, now = new Date()) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0',`PRODID:-//relAI//Tasks//${getLanguage().toUpperCase()}`,'CALSCALE:GREGORIAN'];
  for (const task of tasks) {
    const start = new Date(`${task.date}T${task.time}:00`), end = new Date(start.getTime()+30*60000);
    if (!Number.isFinite(start.getTime())) continue;
    lines.push('BEGIN:VEVENT',`UID:${task.id}@future-self.app`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`SUMMARY:${escapeICS(taskTitle(task))}`,`DESCRIPTION:${escapeICS(t('relAI — rok zadatka. Potvrdi dovršavanje u aplikaciji.', 'relAI — task due date. Confirm completion in the app.'))}`,'END:VEVENT');
  }
  return [...lines,'END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
export function downloadICS(tasks) {
  const url=URL.createObjectURL(new Blob([calendarFile(tasks)],{type:'text/calendar;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=t('future-self-zadaci.ics', 'future-self-tasks.ics');link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
