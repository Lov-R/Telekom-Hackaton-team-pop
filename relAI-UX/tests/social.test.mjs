import test from 'node:test';
import assert from 'node:assert/strict';
import {circleMembers,rankMembers,messageText} from '../src/social-model.js';

test('race ranks steps first, XP breaks ties and exact ties share a place',()=>{
  const members=[{id:'c',steps:2,xp:90},{id:'a',steps:3,xp:30},{id:'b',steps:2,xp:90},{id:'d',steps:2,xp:80}];
  assert.deepEqual(rankMembers(members).map(m=>[m.id,m.rank]),[['a',1],['b',2],['c',2],['d',4]]);
  assert.equal(members[0].id,'c');
});
test('map and race share current user weekly progress rather than lifetime XP',()=>{
  const state={profile:{username:'test.user'},xp:900,position:20,weekXP:70,weekPosition:1,hp:5,avatar:{gender:'male'}};
  const self=circleMembers(state).find(m=>m.self);
  assert.equal(self.xp,70);assert.equal(self.steps,1);assert.equal(self.name,'test.user');
  assert.equal(circleMembers({...state,weekXP:390,weekPosition:7}).find(m=>m.self).steps,7);
  assert.equal(rankMembers(circleMembers({...state,weekXP:390,weekPosition:7}))[0].id,'self');
});
test('local chat rejects blank input and caps messages at 1000 characters',()=>{
  assert.equal(messageText('  \n '),'');assert.equal(messageText(null),'');
  assert.equal(messageText('  Hi 💙  '),'Hi 💙');assert.equal(messageText('x'.repeat(1100)).length,1000);
});
