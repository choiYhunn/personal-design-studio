import {render,audit,themes,types} from '../src/engine.mjs';
import {fontPairs,resolveTypography} from '../src/design.mjs';
import {normalizeProject,projectFromImport} from '../src/project.mjs';
import {importFile} from '../src/importer.mjs';
import {embedFonts} from '../src/export.mjs';

const $=id=>document.getElementById(id);
const copy=value=>structuredClone(value);
const fields={
  cv:[['name','이름'],['role','전문 분야'],['summary','소개','textarea'],['year','작성 연도']],
  slides:[['title','발표 제목'],['subtitle','부제'],['organization','기관 또는 팀'],['year','연도']],
  report:[['title','보고서 제목'],['subtitle','부제'],['executiveSummary','요약','textarea'],['author','작성자'],['date','작성일']],
  dashboard:[['title','대시보드 제목'],['subtitle','설명'],['period','기준 기간'],['source','데이터 출처','textarea']]
};
const collections={
  cv:[['experience','경력',[['role','직무'],['organization','기관'],['period','기간'],['bullets','주요 내용','lines']]],['projects','프로젝트',[['name','프로젝트'],['stack','기술'],['period','기간'],['bullets','주요 내용','lines']]],['education','학력',[['school','학교'],['degree','학위'],['period','기간'],['note','설명']]],['skills','기술',[['category','분류'],['items','항목','lines']]],['contact','연락처','strings'],['awards','수상','strings'],['languages','언어','strings']],
  slides:[['slides','슬라이드',[['layout','레이아웃','layout'],['title','제목'],['subtitle','부제'],['bullets','요점','lines'],['notes','발표 노트','textarea']]]],
  report:[['sections','본문 섹션',[['heading','소제목'],['body','본문','textarea'],['bullets','목록','lines']]],['sources','출처','strings']],
  dashboard:[['kpis','핵심 지표',[['label','이름'],['value','값'],['unit','단위'],['denominator','분모'],['period','기간'],['note','설명']]],['chart','차트 값',[['label','항목'],['value','수치','number'],['display','표시']]],['insights','관찰','strings']]
};
const titles={cv:'CV / 이력서',slides:'슬라이드',report:'보고서',dashboard:'대시보드'};
const layouts=['cover','statement','bullets','columns','metrics','timeline'];
const storageIndex='pds:v2:index';
let defaults={},index=[],state=null,activeId='',history=[],future=[],tab='content',imports=[],selectedImport=-1,compare=false,compareTheme='technical';
let fieldId=0;

function id(){return globalThis.crypto?.randomUUID?.()||`project-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function title(doc){return doc.data.name||doc.data.title||'제목 없는 프로젝트';}
function blankProject(type){
  const data={cv:{name:'',role:'',summary:'',year:'',contact:[],experience:[],projects:[],education:[],skills:[],awards:[],languages:[]},slides:{title:'',subtitle:'',organization:'',year:'',slides:[{layout:'cover',title:'',subtitle:''}]},report:{title:'',subtitle:'',executiveSummary:'',author:'',date:'',sections:[],sources:[]},dashboard:{title:'',subtitle:'',period:'',source:'',kpis:[],chart:[],insights:[]}};
  return normalizeProject({type,theme:'editorial',data:data[type]});
}
function setStatus(message,error=false){$('save-status').textContent=message;$('save-status').classList.toggle('error',error);}
function store(){
  if(!state)return;
  try{
    localStorage.setItem(`pds:v2:${activeId}`,JSON.stringify(state));
    const row=index.find(x=>x.id===activeId);if(row){row.title=title(state);row.type=state.type;row.updatedAt=Date.now();}
    localStorage.setItem(storageIndex,JSON.stringify(index));localStorage.setItem('pds:v2:active',activeId);
    setStatus('이 브라우저에 자동 저장됨');refreshProjects();
  }catch(error){setStatus('자동 저장 실패 · JSON을 내려받으세요',true);}
}
function create(doc){
  const next=normalizeProject(doc),newId=id();next.metadata.id=newId;
  index.unshift({id:newId,type:next.type,title:title(next),updatedAt:Date.now()});activeId=newId;state=next;history=[];future=[];store();paint();
}
function open(idValue){
  const value=localStorage.getItem(`pds:v2:${idValue}`);if(!value)throw Error('저장된 프로젝트를 찾지 못했습니다.');
  const next=normalizeProject(JSON.parse(value));activeId=idValue;state=next;history=[];future=[];store();paint();
}
function refreshProjects(){
  const list=$('projects'),previous=list.value;list.replaceChildren();
  for(const entry of index){const option=document.createElement('option');option.value=entry.id;option.textContent=`${titles[entry.type]} · ${entry.title}`;list.append(option);}
  list.value=activeId||previous;
}
function commit(change,refresh=false){
  if(!state)return;
  history.push(copy(state));if(history.length>50)history.shift();future=[];
  change(state);state.metadata.updatedAt=new Date().toISOString();store();refresh?paint():update();updateHistoryButtons();
}
function updateHistoryButtons(){$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function undo(){if(!history.length)return;future.push(copy(state));state=history.pop();store();paint();updateHistoryButtons();}
function redo(){if(!future.length)return;history.push(copy(state));state=future.pop();store();paint();updateHistoryButtons();}
function field(label,value,onChange,kind='text'){
  const wrapper=document.createElement('div');wrapper.className='field';
  const name=document.createElement('label');name.textContent=label;
  const input=kind==='textarea'||kind==='lines'?document.createElement('textarea'):kind==='layout'?document.createElement('select'):document.createElement('input');
  input.id=`editor-field-${++fieldId}`;name.htmlFor=input.id;
  if(kind==='layout'){for(const layout of layouts){const option=document.createElement('option');option.value=layout;option.textContent=layout;input.append(option);}}
  if(kind==='number')input.type='number';
  input.value=kind==='lines'?(Array.isArray(value)?value.join('\n'):''):String(value??'');
  input.addEventListener(kind==='layout'?'change':'input',()=>onChange(kind==='lines'?input.value.split('\n').map(x=>x.trim()).filter(Boolean):kind==='number'?Number(input.value):input.value));
  wrapper.append(name,input);return wrapper;
}
function makeFields(){
  const host=$('fields');host.replaceChildren();
  for(const [key,label,kind] of fields[state.type])host.append(field(label,state.data[key],value=>commit(doc=>{doc.data[key]=value;}),kind));
}
function makeCollections(){
  const host=$('collections');host.replaceChildren();
  for(const [key,label,schema] of collections[state.type]){
    const section=document.createElement('section');section.className='collection';const heading=document.createElement('h2');heading.textContent=label;section.append(heading);
    const items=Array.isArray(state.data[key])?state.data[key]:[];
    items.forEach((item,i)=>{
      const card=document.createElement('div');card.className='collection-item';
      const top=document.createElement('header');const text=document.createElement('span');text.textContent=`${label} ${i+1}`;
      const actions=document.createElement('span');actions.className='item-actions';
      for(const [symbol,delta] of [['↑',-1],['↓',1]]){const button=document.createElement('button');button.type='button';button.textContent=symbol;button.title='순서 변경';button.disabled=i+delta<0||i+delta>=items.length;button.addEventListener('click',()=>commit(doc=>{const list=doc.data[key];[list[i],list[i+delta]]=[list[i+delta],list[i]];},true));actions.append(button);}
      const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.addEventListener('click',()=>commit(doc=>doc.data[key].splice(i,1),true));actions.append(remove);top.append(text,actions);card.append(top);
      if(schema==='strings')card.append(field('내용',item,value=>commit(doc=>{doc.data[key][i]=value;})));
      else for(const [name,caption,kind] of schema)card.append(field(caption,item?.[name],value=>commit(doc=>{doc.data[key][i][name]=value;}),kind));
      section.append(card);
    });
    const add=document.createElement('button');add.className='button';add.textContent=`+ ${label} 추가`;add.addEventListener('click',()=>commit(doc=>{doc.data[key]??=[];doc.data[key].push(schema==='strings'?'':Object.fromEntries(schema.map(([name,,kind])=>[name,kind==='lines'?[]:kind==='layout'?'bullets':''])));},true));section.append(add);host.append(section);
  }
}
function updateGallery(){
  const host=$('gallery');host.replaceChildren();
  for(const theme of themes){
    const button=document.createElement('button');button.className='preset-card'+(state.theme===theme?' active':'');button.type='button';
    const thumb=document.createElement('div');thumb.className='preset-thumb';const frame=document.createElement('iframe');frame.title=`${theme} 미리보기`;frame.setAttribute('sandbox','');frame.srcdoc=render({...state,theme});thumb.append(frame);
    const label=document.createElement('strong');label.textContent={editorial:'Editorial',technical:'Technical',classic:'Classic / ATS',signal:'Dark Signal'}[theme];
    const info=document.createElement('small');info.textContent='현재 내용으로 미리보기';button.append(thumb,label,info);
    button.addEventListener('click',()=>commit(doc=>{doc.theme=theme;},true));host.append(button);
  }
}
function paint(){
  if(!state)return;
  document.querySelectorAll('#types button').forEach(button=>button.classList.toggle('active',button.dataset.type===state.type));
  $('theme').value=state.theme;$('font-pair').value=state.typography.pair||fontPairs[0].id;
  makeFields();makeCollections();makeTypeControls();updateGallery();$('json').value=JSON.stringify(state,null,2);update();updateHistoryButtons();
}
function update(){
  if(!state)return;
  $('canvas-title').textContent=title(state);$('frame').srcdoc=render(state);
  $('compare-frame').hidden=!compare;if(compare)$('compare-frame').srcdoc=render({...state,theme:compareTheme});
  const report=audit(state),count=report.errors.length+report.warnings.length;
  $('audit').classList.toggle('warn',count>0);$('audit').textContent=`검사 ${report.ok?'통과':'오류'} · 오류 ${report.errors.length} · 주의 ${report.warnings.length}`+(count?' · '+[...report.errors,...report.warnings].slice(0,2).join(' / '):'');
}
function makeTypeControls(){
  const host=$('type-controls');host.replaceChildren();const t=resolveTypography(state);
  const rows=[['size','본문 크기',.75,1.5,.05,'typography'],['headingScale','제목 크기',.75,1.4,.05,'typography'],['lineHeight','줄간격',1.2,2.2,.05,'typography'],['letterSpacing','자간',-.08,.12,.01,'typography'],['paragraphSpacing','문단 간격',.5,2,.1,'typography'],['margin','페이지 여백',8,30,1,'page'],['columnGap','컬럼 간격',5,25,1,'page']];
  for(const [key,label,min,max,step,area] of rows){
    const wrapper=document.createElement('div');wrapper.className='field';const caption=document.createElement('label');caption.textContent=`${label} · ${t[key]}`;const slider=document.createElement('input');slider.type='range';Object.assign(slider,{min,max,step,value:t[key]});
    slider.addEventListener('change',()=>{commit(doc=>{doc[area][key]=Number(slider.value);},true);});wrapper.append(caption,slider);host.append(wrapper);
  }
  const alignment=field('텍스트 정렬',t.align,value=>commit(doc=>{doc.typography.align=value;},true));const align=alignment.querySelector('input');const select=document.createElement('select');select.id=align.id;align.remove();for(const value of ['left','center','right','justify']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}select.value=t.align;select.addEventListener('change',()=>commit(doc=>{doc.typography.align=select.value;},true));alignment.append(select);host.append(alignment);
}
function tabTo(name){tab=name;for(const part of ['content','design','import','json']){$(`${part}-panel`).hidden=part!==name;$(`tab-${part}`).classList.toggle('active',part===name);}if(name==='json')$('json').value=JSON.stringify(state,null,2);}
function download(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function filename(ext){return (title(state).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,50)||state.type)+'.'+ext;}

function showImport(indexValue){
  selectedImport=indexValue;const item=imports[indexValue];$('import-empty').hidden=!!item;$('import-review').hidden=!item;if(!item)return;
  $('import-title').textContent=item.file.name;$('import-meta').textContent=`${item.result?.format||''} · ${(item.file.size/1024).toFixed(1)} KiB · ${item.error?'처리 실패':'추출 완료'}`+(item.result?.images?.length?` · 이미지 ${item.result.images.length}개: ${item.result.images.map(x=>x.name).join(', ')}`:'');
  $('import-warning').textContent=item.error||item.result?.warnings?.join(' · ')||'';
  $('import-text').value=item.result?.text||'';$('import-text').disabled=!!item.error||!!item.result?.project;
  $('import-type').value=item.result?.format==='.pptx'?'slides':item.result?.format==='.pdf'?'report':item.result?.format==='.docx'?'cv':'report';
  $('create-from-import').disabled=!!item.error;
  $('create-from-import').textContent=item.result?.project?'프로젝트 사본으로 열기':/^\.(png|jpe?g|svg)$/i.test(item.result?.format||'')?'현재 프로젝트에 이미지 참조 첨부':'검토한 내용으로 새 프로젝트 만들기';
  $('attach-source').hidden=!!item.result?.project||/^\.(png|jpe?g|svg)$/i.test(item.result?.format||'');
  tabTo('import');
}
function renderImportList(){
  const host=$('import-list');host.replaceChildren();$('import-count').textContent=imports.length?String(imports.length):'';
  imports.forEach((entry,i)=>{const row=document.createElement('div');row.className='import-item'+(entry.error?' error':'');const button=document.createElement('button');button.type='button';button.textContent=`${entry.file.name} · ${entry.status}`;button.addEventListener('click',()=>showImport(i));row.append(button);host.append(row);});
}
async function filesChosen(files){
  for(const file of files){
    const entry={file,status:'처리 중',result:null,error:null};imports.push(entry);renderImportList();
    try{entry.result=await importFile(file);entry.status='검토 가능';}
    catch(error){entry.error=error.message;entry.status='오류 · 형식/손상 확인';}
    renderImportList();showImport(imports.length-1);
  }
}
function reviewedResult(){
  const result=copy(imports[selectedImport].result),text=$('import-text').value;
  if(text!==result.text){result.text=text;result.blocks=text.split(/\n+/).map(x=>({kind:'paragraph',text:x.trim()})).filter(x=>x.text);
    if(result.slides)result.slides=text.split('\n').filter(Boolean).map((row,i)=>{const values=row.replace(/^Slide \d+:\s*/,'').split(' · ').filter(Boolean);return {number:i+1,title:values[0]||`Slide ${i+1}`,lines:values,notes:result.slides[i]?.notes||''};});
  }
  return result;
}
async function addImage(result,file){
  if(file.size>3*1024*1024)throw Error('이미지 참조는 3 MiB 이하로 줄여 주세요. JSON에 직접 포함됩니다.');
  let dataUri=null;
  if(result.format!=='.svg'){
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    dataUri=`data:${result.format==='.png'?'image/png':'image/jpeg'};base64,${btoa(binary)}`;
  }
  commit(doc=>{doc.assets.push({id:id(),name:file.name,format:result.format,size:file.size,dataUri,role:'reference',reviewed:false});},true);
  tabTo('content');
}
async function useImport(attachOnly=false){
  const entry=imports[selectedImport];if(!entry?.result)return;
  try{
    if(entry.result.project){create({...entry.result.project,metadata:{...entry.result.project.metadata,id:id(),status:'imported-copy'}});tabTo('content');return;}
    if(/^\.(png|jpe?g|svg)$/i.test(entry.result.format)){await addImage(entry.result,entry.file);return;}
    const result=reviewedResult();
    if(!result.text.trim())throw Error('추출된 텍스트가 없습니다. 스캔 문서라면 OCR 후 다시 가져오세요.');
    if(attachOnly){const sourceId=id();commit(doc=>{doc.sourceDocuments.push({id:sourceId,name:result.name,format:result.format,size:result.size,text:result.text,blocks:result.blocks,slides:result.slides,images:result.images,warnings:result.warnings,originalStored:false,importedAt:new Date().toISOString()});},true);tabTo('content');}
    else {create(projectFromImport(result,$('import-type').value));tabTo('content');}
  }catch(error){$('import-warning').textContent=error.message;}
}

async function start(){
  for(const type of types){const response=await fetch(`/examples/${type}.json`);if(!response.ok)throw Error('예시 프로젝트를 읽을 수 없습니다.');defaults[type]=normalizeProject(await response.json());}
  for(const theme of themes){const option=document.createElement('option');option.value=theme;option.textContent=theme;$('theme').append(option);}
  for(const pair of fontPairs){const option=document.createElement('option');option.value=pair.id;option.textContent=pair.name;$('font-pair').append(option);}
  try{index=JSON.parse(localStorage.getItem(storageIndex)||'[]');if(!Array.isArray(index))index=[];}catch{index=[];}
  if(!index.length){for(const type of types){let legacy;try{legacy=JSON.parse(localStorage.getItem(`pds:${type}`)||'null');}catch{}const doc=normalizeProject(legacy?.type===type?legacy:defaults[type]);const projectId=id();doc.metadata.id=projectId;index.push({id:projectId,type,title:title(doc),updatedAt:Date.now()});localStorage.setItem(`pds:v2:${projectId}`,JSON.stringify(doc));}localStorage.setItem(storageIndex,JSON.stringify(index));}
  const first=localStorage.getItem('pds:v2:active');open(index.some(x=>x.id===first)?first:index[0].id);
}

document.querySelectorAll('#types button').forEach(button=>button.addEventListener('click',()=>{const item=index.find(x=>x.type===button.dataset.type);if(item)open(item.id);else create(blankProject(button.dataset.type));}));
$('projects').addEventListener('change',event=>open(event.target.value));
$('new-project').addEventListener('click',()=>create(blankProject(state.type)));
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
$('theme').addEventListener('change',event=>commit(doc=>{doc.theme=event.target.value;},true));
$('font-pair').addEventListener('change',event=>commit(doc=>{doc.typography.pair=event.target.value;},true));
$('compare').addEventListener('click',()=>{compare=!compare;compareTheme=themes.find(x=>x!==state.theme)||state.theme;update();$('compare').textContent=compare?'비교 닫기':'A/B 비교';});
for(const part of ['content','design','import','json'])$(`tab-${part}`).addEventListener('click',()=>tabTo(part));
$('apply-json').addEventListener('click',()=>{try{const next=normalizeProject(JSON.parse($('json').value));if(next.type!==state.type)throw Error('유형을 바꾸려면 새 프로젝트로 가져오세요.');commit(()=>{state=next;},true);$('json-error').textContent='';}catch(error){$('json-error').textContent=error.message;}});
$('download-json').addEventListener('click',()=>download(filename('json'),JSON.stringify(state,null,2)+'\n','application/json'));
$('download-html').addEventListener('click',async()=>{try{const result=audit(state);if(!result.ok)throw Error(result.errors.join(' / '));setStatus('글꼴을 포함하는 중');download(filename('html'),await embedFonts(render(state)),'text/html;charset=utf-8');setStatus('HTML 내보내기 완료');}catch(error){setStatus(error.message,true);}});
$('print').addEventListener('click',()=>{const frame=$('frame');frame.contentWindow?.focus();frame.contentWindow?.print();});
$('file-upload').addEventListener('change',event=>{filesChosen([...event.target.files]);event.target.value='';});
const drop=$('drop-zone');for(const name of ['dragenter','dragover'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('drag');});for(const name of ['dragleave','drop'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('drag');});drop.addEventListener('drop',event=>filesChosen([...event.dataTransfer.files]));
$('create-from-import').addEventListener('click',()=>useImport());$('attach-source').addEventListener('click',()=>useImport(true));
window.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey))return;if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}if(event.key.toLowerCase()==='s'){event.preventDefault();$('download-json').click();}});
start().catch(error=>setStatus(`시작 실패: ${error.message}`,true));
