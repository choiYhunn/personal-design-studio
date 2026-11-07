import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {presets,presetsFor,applyPreset} from '../src/presets.mjs';
import {fontPairs} from '../src/design.mjs';
import {normalizeProject} from '../src/project.mjs';
import {render,audit} from '../src/engine.mjs';

const sample=async type=>normalizeProject(JSON.parse(await readFile(new URL(`../examples/${type}.json`,import.meta.url),'utf8')));

test('24 presets are type-specific and change actual layout rules',()=>{
  assert.deepEqual(['cv','slides','report','dashboard'].map(type=>presetsFor(type).length),[8,8,4,4]);
  assert.equal(new Set(presets.map(p=>p.id)).size,24);
  assert.equal(new Set(presets.map(p=>p.css)).size,24);
  assert.equal(fontPairs.length,12);assert.equal(new Set(fontPairs.map(p=>`${p.heading}/${p.body}/${p.mono}`)).size,12);
  for(const p of presets){assert.match(p.css,/\.|@media/);assert.ok(p.css.length>180,p.id);}
});

for(const type of ['cv','slides','report','dashboard']){
  test(`${type} presets render the same content with their own composition`,async()=>{
    const base=await sample(type);
    for(const preset of presetsFor(type)){
      const doc=applyPreset(structuredClone(base),preset.id),report=audit(doc),html=render(doc);
      assert.equal(report.ok,true,`${preset.id}: ${JSON.stringify(report)}`);
      assert.match(html,new RegExp(`data-preset="${preset.id}"`));
      assert.ok(html.includes(preset.css));
      assert.deepEqual(doc.data,base.data);
    }
  });
}

test('CV academic and engineering presets change section order without changing facts',async()=>{
  const original=await sample('cv');
  const academic=render(applyPreset(structuredClone(original),'academic-cv'));
  const engineering=render(applyPreset(structuredClone(original),'engineering-technical'));
  assert.ok(academic.indexOf('>EDUCATION</h2>')<academic.indexOf('>PROJECTS</h2>'));
  assert.ok(engineering.indexOf('>PROJECTS</h2>')<engineering.indexOf('>EXPERIENCE</h2>'));
});

test('extra slide layouts render structured process, chart and summary content',async()=>{
  const doc=await sample('slides');doc.data.slides=[
    {layout:'section',title:'Method',subtitle:'Repeatable procedure'},
    {layout:'comparison',title:'Two options',columns:[{heading:'A',bullets:['Fast']},{heading:'B',bullets:['Reliable']}]},
    {layout:'chart',title:'Measured values',chart:[{label:'Read',value:12},{label:'Write',value:8}]},
    {layout:'process',title:'Workflow',steps:[{heading:'Prepare',detail:'Record inputs'}]},
    {layout:'summary',title:'Decision',bullets:['Keep evidence']},
    {layout:'image',title:'Reference image',imageAssetId:'missing'}
  ];
  const html=render(applyPreset(doc,'research-presentation'));
  for(const text of ['Repeatable procedure','Reliable','Measured values','Record inputs','Keep evidence','이미지 참조를 선택하세요'])assert.ok(html.includes(text));
});

test('dashboard renders optional unit, denominator and period labels',async()=>{
  const doc=await sample('dashboard');doc.data.kpis[0].unit='runs';doc.data.kpis[0].denominator='all scheduled tests';doc.data.kpis[0].period='2026 Q4';
  const html=render(applyPreset(doc,'engineering-validation'));
  assert.match(html,/runs · 분모 all scheduled tests · 2026 Q4/);
});

test('CLI init and import apply presets readable by the shared engine',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'pds-presets-'));
  try{
    const cli=fileURLToPath(new URL('../bin/studio.mjs',import.meta.url));
    const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
    const cv=join(dir,'cv.json'),report=join(dir,'report.json');
    assert.equal(run(['init','cv','--preset','classic-ats','-o',cv]).status,0);
    assert.equal(run(['import',fileURLToPath(new URL('./fixtures/sample.txt',import.meta.url)),'--type','report','--preset','academic-paper','-o',report]).status,0);
    for(const [file,preset] of [[cv,'classic-ats'],[report,'academic-paper']]){
      const project=normalizeProject(JSON.parse(await readFile(file,'utf8')));
      assert.equal(project.preset,preset);
      assert.equal(audit(project).ok,true);
      assert.match(render(project),new RegExp(`data-preset="${preset}"`));
    }
  }finally{await rm(dir,{recursive:true,force:true});}
});
