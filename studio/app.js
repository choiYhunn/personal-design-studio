import {render, audit} from '../src/engine.mjs';
const examples=['cv','slides','report','dashboard'];
const fields={
  cv:[['name','이름'],['role','전문 분야 / 직무'],['summary','요약 소개','textarea'],['year','작성 연도']],
  slides:[['title','발표자료 제목'],['subtitle','발표 부제'],['organization','기관 · 팀'],['year','연도']],
  report:[['title','보고서 제목'],['subtitle','부제'],['executiveSummary','핵심 요약','textarea'],['author','작성자'],['date','작성일']],
  dashboard:[['title','대시보드 제목'],['subtitle','설명'],['period','기준 기간'],['source','데이터 출처','textarea']]
};
const $=id=>document.getElementById(id);let state={},type='cv',tab='fields';let defaults={};
const clone=o=>JSON.parse(JSON.stringify(o));
const text=v=>v==null?'':String(v);
async function loadDefaults(){for(const t of examples){const r=await fetch(`/examples/${t}.json`);if(!r.ok)throw Error('Sample files not available');defaults[t]=await r.json()}await select('cv')}
function escapeHTML(v){return text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function getStored(t){try{const v=JSON.parse(localStorage.getItem('pds:'+t)||'null');return v?.type===t?v:null}catch{return null}}
function save(){try{localStorage.setItem('pds:'+type,JSON.stringify(state))}catch{/* storage disabled; downloads still work */}}
async function select(t){type=t;state=getStored(t)||clone(defaults[t]);document.querySelectorAll('.type').forEach(b=>b.classList.toggle('active',b.dataset.type===t));$('editor-title').textContent={cv:'CV & Resume',slides:'Slides',report:'Report',dashboard:'Dashboard'}[t];$('theme').value=state.theme||'editorial';paint()}
function makeFields(){const host=$('fields');host.replaceChildren();for(const [name,label,kind] of fields[type]){
  const parent=document.createElement('div');parent.className='field';
  const lab=document.createElement('label');lab.textContent=label;lab.htmlFor='field-'+name;
  const input=document.createElement(kind==='textarea'?'textarea':'input');input.id='field-'+name;input.value=text(state.data[name]);
  input.addEventListener('input',()=>{state.data[name]=input.value;update();});parent.append(lab,input);host.append(parent);
 }
 const info=document.createElement('p');info.className='hint';info.textContent='프로젝트·경력·슬라이드·차트 항목 추가와 상세 내용 수정은 ‘고급 JSON’에서 가능합니다.';host.append(info);
}
function paint(){makeFields();$('json').value=JSON.stringify(state,null,2);update()}
function update(){save();$('frame').srcdoc=render(state);$('preview-title').textContent=(state.data.name||state.data.title||'Untitled')+' · '+type.toUpperCase();$('status').textContent=type.toUpperCase();const result=audit(state);const count=result.errors.length+result.warnings.length;const box=$('audit');box.classList.toggle('warn',count>0);box.textContent=`Audit: ${result.ok?'passed':'errors'} · ${result.errors.length} errors · ${result.warnings.length} warnings`+(count?' · '+[...result.errors,...result.warnings].slice(0,2).join(' / '):'');}
function download(name,content,mime){const a=document.createElement('a');const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)}
function filename(ext){const slug=(state.data.name||state.data.title||type).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,48)||type;return slug+'.'+ext}
document.querySelectorAll('.type').forEach(b=>b.addEventListener('click',()=>select(b.dataset.type)));
$('theme').addEventListener('change',e=>{state.theme=e.target.value;paint()});
$('tab-fields').addEventListener('click',()=>switchTab('fields'));
$('tab-json').addEventListener('click',()=>switchTab('json'));
function switchTab(which){tab=which;$('advanced').hidden=which!=='json';$('fields').hidden=which==='json';$('tab-fields').classList.toggle('active',which==='fields');$('tab-json').classList.toggle('active',which==='json');if(which==='json')$('json').value=JSON.stringify(state,null,2)}
$('apply-json').addEventListener('click',()=>{try{const next=JSON.parse($('json').value);if(next.type!==type)throw Error('현재 문서 유형(type)을 유지하세요');state=next;$('json-error').textContent='';$('theme').value=state.theme||'editorial';paint()}catch(e){$('json-error').textContent=e.message}});
$('file-upload').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!examples.includes(parsed.type))throw Error('지원하지 않는 문서 유형입니다.');type=parsed.type;state=parsed;save();document.querySelectorAll('.type').forEach(b=>b.classList.toggle('active',b.dataset.type===type));$('editor-title').textContent={cv:'CV & Resume',slides:'Slides',report:'Report',dashboard:'Dashboard'}[type];$('theme').value=state.theme||'editorial';paint()}catch(e){alert('파일 오류: '+e.message)}e.target.value=''});
$('download-html').addEventListener('click',()=>{const results=audit(state);if(!results.ok){alert(results.errors.join('\n'));return}download(filename('html'),render(state),'text/html;charset=utf-8')});
$('download-json').addEventListener('click',()=>download(filename('json'),JSON.stringify(state,null,2)+'\n','application/json'));
$('print').addEventListener('click',()=>{const frame=$('frame');if(!frame.contentWindow){alert('미리보기를 먼저 확인하세요.');return}frame.contentWindow.focus();frame.contentWindow.print()});
loadDefaults().catch(e=>{$('audit').textContent='Startup error: '+e.message});
