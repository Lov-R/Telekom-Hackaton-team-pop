import test from 'node:test';
import assert from 'node:assert/strict';
import {canResumeProfile} from '../src/profile.js';

const profile={firstName:'Demo',lastName:'Profil',birthDate:'1995-04-12',gender:'female',username:'demo.novi'};
test('remembered entry requires explicit opt-in and does not require a stored password',()=>{
 const state={profile,prefs:{rememberMe:true}};
 assert.equal(canResumeProfile(state),true);
 for(const rememberMe of [false,undefined,null,'true',1])assert.equal(canResumeProfile({...state,prefs:{rememberMe}}),false);
 assert.equal(canResumeProfile({profile}),false);
 assert.equal(Object.hasOwn(profile,'password'),false);
 assert.deepEqual(state,{profile,prefs:{rememberMe:true}});
});

test('remembering a device never skips incomplete or invalid profile setup',()=>{
 const state={profile,prefs:{rememberMe:true}};
 for(const missing of [null,{},...Object.keys(profile).map(key=>({...profile,[key]:''}))]){
  assert.equal(canResumeProfile({...state,profile:missing}),false);
 }
 for(const change of [{username:'x'},{username:'invalid name'},{gender:'unknown'},{birthDate:'1995-02-30'},{birthDate:'9999-01-01'},{birthDate:'not-a-date'},{firstName:'   '}]){
  assert.equal(canResumeProfile({...state,profile:{...profile,...change}}),false);
 }
 assert.equal(canResumeProfile(undefined),false);
});
