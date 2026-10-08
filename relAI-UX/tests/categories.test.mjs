import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CATEGORIES,categoryLabel,categoryMatches,categoryIdForTask,validateCategoryChange} from '../src/categories.js';

test('category filters include direct children and preserve legacy task categories',()=>{
 assert.equal(categoryMatches(DEFAULT_CATEGORIES,'water','utilities'),true);
 assert.equal(categoryMatches(DEFAULT_CATEGORIES,'water','health'),false);
 assert.equal(categoryMatches(DEFAULT_CATEGORIES,'water',''),true);
 assert.equal(categoryLabel(DEFAULT_CATEGORIES,'water'),'Režije › Voda');
 assert.equal(categoryLabel(DEFAULT_CATEGORIES,'missing'),'Nerazvrstano');
 assert.equal(categoryIdForTask(DEFAULT_CATEGORIES,{category:'Zdravlje'}),'health');
 assert.equal(categoryIdForTask(DEFAULT_CATEGORIES,{category:'Za sebe'}),'self');
 assert.equal(categoryIdForTask(DEFAULT_CATEGORIES,{category:'Zdravlje',categoryId:''}),'');
});

test('category edits prevent cycles, third levels and moving parents with children',()=>{
 assert.throws(()=>validateCategoryChange(DEFAULT_CATEGORIES,{id:'water',name:'Voda',parentId:'water'}),/glavnu kategoriju/);
 assert.throws(()=>validateCategoryChange(DEFAULT_CATEGORIES,{name:'Treća razina',parentId:'water'}),/dvije razine/);
 assert.throws(()=>validateCategoryChange(DEFAULT_CATEGORIES,{id:'utilities',name:'Režije',parentId:'health'}),/mora ostati glavna/);
 assert.deepEqual(validateCategoryChange(DEFAULT_CATEGORIES,{id:'water',name:' Voda i odvodnja ',parentId:'personal'}),{name:'Voda i odvodnja',parentId:'personal'});
});

test('category names are required and unique within their parent after normalization',()=>{
 assert.throws(()=>validateCategoryChange(DEFAULT_CATEGORIES,{name:'  ',parentId:null}),/1–40/);
 assert.throws(()=>validateCategoryChange(DEFAULT_CATEGORIES,{name:'a'.repeat(41)}),/1–40/);
 assert.throws(()=>validateCategoryChange(DEFAULT_CATEGORIES,{name:' VODA ',parentId:'utilities'}),/već postoji/);
 assert.deepEqual(validateCategoryChange(DEFAULT_CATEGORIES,{name:'Voda',parentId:'personal'}),{name:'Voda',parentId:'personal'});
 assert.deepEqual(validateCategoryChange(DEFAULT_CATEGORIES,{id:'water',name:'Voda',parentId:'utilities'}),{name:'Voda',parentId:'utilities'});
});
