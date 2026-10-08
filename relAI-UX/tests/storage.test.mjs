import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoStorage} from '../src/storage.js';

test('legacy head-start migration preserves earned HP and only applies once',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 let stored=JSON.stringify({version:4,hp:95,xp:300,position:6,tasks:[{id:'kept',proof:{id:'photo'}}]});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored,setItem:(_,value)=>{stored=value;}}});
 try{
  const seed=()=>({version:4,energyRules:5,hp:0,xp:0,position:0,tasks:[]});
  const store=createDemoStorage(seed), migrated=store.load();
  assert.equal(migrated.hp,15);assert.equal(migrated.xp,300);assert.equal(migrated.position,6);
  assert.equal(migrated.tasks[0].proof.id,'photo');
  store.save(migrated);assert.equal(store.load().hp,15);
  stored=null;assert.equal(createDemoStorage(seed).load().hp,0);
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});
