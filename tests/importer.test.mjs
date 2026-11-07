import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {importBytes,inspectZip,maxFileSize} from '../src/importer.mjs';
import {normalizeProject,projectFromImport} from '../src/project.mjs';
import {render,audit} from '../src/engine.mjs';
import {embedFonts} from '../src/export.mjs';

const fixture=async name=>readFile(new URL(`./fixtures/${name}`,import.meta.url));
const parse=async name=>importBytes({name,bytes:await fixture(name)});

test('TXT and Markdown keep source text and distinct block structure',async()=>{
  const txt=await parse('sample.txt'),md=await parse('sample.md');
  assert.match(txt.text,/Reproducible tests/);assert.equal(md.blocks[0].kind,'heading');assert.equal(md.blocks[1].kind,'list');
});
test('DOCX extracts headings and text without exposing source HTML',async()=>{
  const doc=await parse('sample.docx');assert.match(doc.text,/validation workflow/);assert.ok(doc.blocks.some(x=>x.kind==='heading'&&x.text==='Experience'));
  const project=projectFromImport(doc,'cv');assert.equal(project.schemaVersion,2);assert.equal(project.sourceDocuments[0].originalStored,false);assert.equal(project.provenance.reviewed,false);
});
test('PDF extracts per-page text, with an accurate report title',async()=>{
  const pdf=await parse('sample.pdf');assert.equal(pdf.blocks[0].kind,'page');assert.match(pdf.text,/12 ms/);
  const project=projectFromImport(pdf,'report');assert.equal(project.data.title,'Research report sample');assert.match(project.data.sections[0].body,/12 ms/);
});
test('PPTX extracts slide text and notes without promising original layout',async()=>{
  const pptx=await parse('sample.pptx');assert.equal(pptx.slides.length,2);assert.equal(pptx.slides[1].title,'Evidence');assert.match(pptx.slides[0].notes,/Speaker note/);
  const project=projectFromImport(pptx,'slides');assert.equal(project.data.slides.length,2);assert.ok(audit(project).ok);assert.match(render(project),/Repeat the measurement/);
});
test('v0.1 JSON migrates without changing its content and renders through the same engine',async()=>{
  const legacy=JSON.parse(await readFile(new URL('../examples/cv.json',import.meta.url),'utf8'));
  const migrated=normalizeProject(legacy);assert.equal(migrated.schemaVersion,2);assert.deepEqual(migrated.data,legacy.data);assert.match(render(migrated),/Kim Jiyun/);
  assert.equal((await importBytes({name:'sample.json',bytes:new TextEncoder().encode(JSON.stringify(legacy))})).project.schemaVersion,2);
});
test('size, unsupported format, corrupt ZIP, and image signature failures explain the cause',async()=>{
  await assert.rejects(importBytes({name:'bad.exe',bytes:Uint8Array.of(1)}),/지원하지 않는 형식/);
  await assert.rejects(importBytes({name:'huge.txt',bytes:new Uint8Array(maxFileSize+1)}),/12 MiB/);
  await assert.rejects(importBytes({name:'broken.docx',bytes:Uint8Array.of(0x50,0x4b)}),/ZIP 끝 기록/);
  await assert.rejects(importBytes({name:'wrong.png',bytes:Uint8Array.of(1,2,3)}),/시그니처/);
  const zip=new Uint8Array(await fixture('sample.docx'));const view=new DataView(zip.buffer);let index=zip.length-22;while(view.getUint32(index,true)!==0x06054b50)index--;
  const at=view.getUint32(index+16,true);view.setUint32(at+24,17*1024*1024,true);assert.throws(()=>inspectZip(zip),/안전 한도/);
});
test('standalone HTML contains local font data, without server URLs',async()=>{
  const doc=normalizeProject(JSON.parse(await readFile(new URL('../examples/cv.json',import.meta.url),'utf8')));
  const html=await embedFonts(render(doc));assert.match(html,/data:font\/woff2;base64,/);assert.match(html,/font-license-notices/);assert.doesNotMatch(html,/\/vendor\/fonts\//);
});
test('CLI import refuses to overwrite a previously created project',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'pds-import-')), output=join(directory,'project.json');
  try{
    const run=()=>spawnSync(process.execPath,['bin/studio.mjs','import','tests/fixtures/sample.txt','--type','report','-o',output],{encoding:'utf8'});
    assert.equal(run().status,0);const first=await readFile(output,'utf8');const second=run();assert.equal(second.status,1);assert.match(second.stderr,/already exists/);assert.equal(await readFile(output,'utf8'),first);
  }finally{await rm(directory,{recursive:true,force:true});}
});
