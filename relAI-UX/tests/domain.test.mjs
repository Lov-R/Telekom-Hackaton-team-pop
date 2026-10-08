import test from 'node:test';
import assert from 'node:assert/strict';
import {finishTask,notificationText,penalty,points,isQuietHour,validateTask,mondayOf,brightness} from '../src/domain.mjs';
import {calendarFile} from '../src/calendar.mjs';
const task=()=>({id:'car',title:'Registracija auta',date:'2026-10-08',time:'14:30',importance:3,difficulty:3,proofPossible:true,proofPolicy:'required',status:'pending',proof:null});
const state=()=>({xp:120,hp:80,position:3,weekXP:120,weekPosition:3,tasks:[task()]});
test('required evidence gates completion; valid completion advances once',()=>{
 const s=state();assert.throws(()=>finishTask(s,'car','completed'),/fotografiju/);
 s.tasks[0].proof={id:'photo'};const done=finishTask(s,'car','completed');
 assert.equal(done.xp,190);assert.equal(done.position,4);assert.equal(done.hp,85);
 assert.equal(finishTask(done,'car','completed').xp,190);assert.equal(s.xp,120);
});
test('optional and inapplicable evidence do not block completion',()=>{
 for(const policy of ['optional','none']){const s=state();s.tasks[0].proofPolicy=policy;assert.equal(finishTask(s,'car','completed').position,4);}
 assert.throws(()=>validateTask({...task(),proofPossible:false}),/nije moguća/);
});
test('penalties, caps and notification copy use identical values',()=>{
 assert.deepEqual([1,2,3].map(importance=>penalty({importance})),[5,10,20]);
 const s=state();s.hp=8;assert.equal(finishTask(s,'car','missed').hp,0);
 s.hp=99;s.tasks[0].proof={id:'photo'};assert.equal(finishTask(s,'car','completed').hp,100);
 assert.match(notificationText(task(),{tone:'roast'}).body,/20 HP/);
 assert.match(notificationText(task(),{tone:'roast'}).body,/Dokaži/);
 assert.equal(notificationText(task(),{hideTitles:true}).title,'Tvoj sljedeći zadatak');
 assert.equal(points({importance:1,difficulty:1}),30);
});
test('quiet hours cross midnight and weeks start on Monday',()=>{
 const prefs={quietEnabled:true,quietStart:22,quietEnd:8,timezone:'Europe/Zagreb'};
 assert.equal(isQuietHour(prefs,new Date('2026-10-08T21:00:00Z')),true);
 assert.equal(isQuietHour(prefs,new Date('2026-10-08T12:00:00Z')),false);
 assert.equal(mondayOf('2026-10-11'),'2026-10-05');
});
test('ICS uses stable IDs, UTC, escaped text and CRLF',()=>{
 const value=calendarFile([{...task(),title:'Sastanak, test; tekst\nNovi red'}],new Date('2026-10-08T10:00:00Z'));
 assert.match(value,/UID:car@future-self.app/);assert.match(value,/DTSTAMP:20261008T100000Z/);
 assert.ok(value.includes('Sastanak\\, test\\; tekst\\nNovi red'));assert.ok(value.endsWith('END:VCALENDAR\r\n'));
});

test('a ghost can recover from zero HP; XP alone never changes presence',()=>{
 const s={...state(),hp:0,xp:0,position:0,weekXP:0,weekPosition:0};
 s.tasks[0].proofPolicy='none';
 const completed=finishTask(s,'car','completed');
 assert.equal(completed.hp,5);assert.equal(completed.position,1);
 assert.ok(brightness(completed.xp,completed.hp)>brightness(s.xp,s.hp));
 assert.equal(brightness(0,0),brightness(10000,0));
 assert.equal(brightness(0,50),brightness(10000,50));
 assert.ok(brightness(0,0)>0);assert.equal(brightness(0,100),100);
 assert.equal(finishTask(s,'car','missed').hp,0);
});

test('HP milestone eligibility survives a later missed task',()=>{
 const s={...state(),hp:20,peakHP:20,tasks:[{...task(),id:'one',proofPolicy:'none'},{...task(),id:'two',proofPolicy:'none'}]};
 const earned=finishTask(s,'one','completed');
 assert.equal(earned.hp,25);assert.equal(earned.peakHP,25);
 const missed=finishTask(earned,'two','missed');
 assert.equal(missed.hp,5);assert.equal(missed.peakHP,25);
 assert.equal(finishTask(missed,'two','missed').peakHP,25);
});
