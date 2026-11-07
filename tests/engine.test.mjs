import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {render, audit, types, themes} from '../src/engine.mjs';
const load=async(type)=>JSON.parse(await readFile(new URL(`../examples/${type}.json`,import.meta.url),'utf8'));
for(const type of types){
  test(`${type} example passes deterministic audit`,async()=>{const doc=await load(type);const report=audit(doc);assert.equal(report.ok,true,JSON.stringify(report));assert.equal(report.warnings.length,0);});
  test(`${type} renders a standalone HTML page`,async()=>{const doc=await load(type);const html=render(doc);assert.match(html,/<!doctype html>/);assert.match(html,/<style>/);assert.match(html,/<\/html>/);assert.ok(html.length>1500);});
}
test('escapes untrusted text',async()=>{const doc=await load('cv');doc.data.name='<script>alert(1)</script>';const html=render(doc);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'));});
test('warns about excessive slide bullet counts',async()=>{const doc=await load('slides');doc.data.slides[1].bullets=['a','b','c','d','e','f'];assert.match(audit(doc).warnings.join(' '),/Slide 2/);});
test('requires slide titles',async()=>{const doc=await load('slides');doc.data.slides[2].title='';assert.equal(audit(doc).ok,false);});
test('does not accept unsupported types',()=>{assert.equal(audit({type:'invoice',theme:'classic',data:{title:'X'}}).ok,false);});
test('theme palettes have sufficient primary text contrast',async()=>{for(const theme of themes){const doc=await load('cv');doc.theme=theme;assert.ok(Number(audit(doc).checks.mainTextContrast.split(':')[0])>4.5,theme);}});
test('clamps chart values and escapes labels',async()=>{const doc=await load('dashboard');doc.data.chart=[{label:'<img src=x>',value:99999},{label:'negative',value:-3}];const html=render(doc);assert.ok(!html.includes('<img src=x>'));assert.match(html,/width:0\.00%/);});
