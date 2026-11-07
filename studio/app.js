import {render,audit,themes,types,themePalettes} from '../src/engine.mjs';
import {fontPairs,resolveTypography} from '../src/design.mjs';
import {fontFamilies} from '../src/design.mjs';
import {presets,presetsFor,resolvePreset,applyPreset} from '../src/presets.mjs';
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
const layouts=['cover','section','statement','bullets','columns','comparison','metrics','chart','process','timeline','image','summary'];
const storageIndex='pds:v2:index';
let defaults={},index=[],state=null,activeId='',history=[],future=[],tab='content',imports=[],selectedImport=-1,compare=false,comparePreset='',galleryTimer;
let fieldId=0;

function id(){return globalThis.crypto?.randomUUID?.()||`project-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function title(doc){return doc.data.name||doc.data.title||'제목 없는 프로젝트';}
function blankProject(type){
  const data={cv:{name:'',role:'',summary:'',year:'',contact:[],experience:[],projects:[],education:[],skills:[],awards:[],languages:[]},slides:{title:'',subtitle:'',organization:'',year:'',slides:[{layout:'cover',title:'',subtitle:''}]},report:{title:'',subtitle:'',executiveSummary:'',author:'',date:'',sections:[],sources:[]},dashboard:{title:'',subtitle:'',period:'',source:'',kpis:[],chart:[],insights:[]}};
  return normalizeProject({type,theme:'editorial',data:data[type]});
}
function fillNewPresets(){const select=$('new-preset');select.replaceChildren();for(const preset of presetsFor($('new-type').value)){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;select.append(option);}}
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
  change(state);state.metadata.updatedAt=new Date().toISOString();store();refresh?paint():update();
  if(!refresh){clearTimeout(galleryTimer);galleryTimer=setTimeout(updateGallery,300);}
  updateHistoryButtons();
}
function updateHistoryButtons(){$('undo').disabled=!history.length;$('redo').disabled=!future.length;}
function undo(){if(!history.length)return;future.push(copy(state));state=history.pop();store();paint();updateHistoryButtons();}
function redo(){if(!future.length)return;history.push(copy(state));state=future.pop();store();paint();updateHistoryButtons();}
function field(label,value,onChange,kind='text',path=''){
  const wrapper=document.createElement('div');wrapper.className='field';
  const name=document.createElement('label');name.textContent=label;
  const input=kind==='textarea'||kind==='lines'?document.createElement('textarea'):kind==='layout'?document.createElement('select'):document.createElement('input');
  input.id=`editor-field-${++fieldId}`;name.htmlFor=input.id;
  if(path)input.dataset.projectPath=path;
  if(kind==='layout'){for(const layout of layouts){const option=document.createElement('option');option.value=layout;option.textContent=layout;input.append(option);}}
  if(kind==='number')input.type='number';
  input.value=kind==='lines'?(Array.isArray(value)?value.join('\n'):''):String(value??'');
  input.addEventListener(kind==='layout'?'change':'input',()=>onChange(kind==='lines'?input.value.split('\n').map(x=>x.trim()).filter(Boolean):kind==='number'?Number(input.value):input.value));
  wrapper.append(name,input);return wrapper;
}
function makeFields(){
  const host=$('fields');host.replaceChildren();
  for(const [key,label,kind] of fields[state.type])host.append(field(label,state.data[key],value=>commit(doc=>{doc.data[key]=value;}),kind,`data.${key}`));
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
      if(schema==='strings')card.append(field('내용',item,value=>commit(doc=>{doc.data[key][i]=value;}),'text',`data.${key}.${i}`));
      else for(const [name,caption,kind] of schema)card.append(field(caption,item?.[name],value=>commit(doc=>{doc.data[key][i][name]=value;} ,kind==='layout'),kind,`data.${key}.${i}.${name}`));
      if(state.type==='slides' && key==='slides')renderSlideExtras(card,item,i);
      section.append(card);
    });
    const add=document.createElement('button');add.className='button';add.textContent=`+ ${label} 추가`;add.addEventListener('click',()=>commit(doc=>{doc.data[key]??=[];doc.data[key].push(schema==='strings'?'':Object.fromEntries(schema.map(([name,,kind])=>[name,kind==='lines'?[]:kind==='layout'?'bullets':''])));},true));section.append(add);host.append(section);
  }
}
function renderSlideExtras(card,slide,indexValue){
  const config={metrics:['metrics','지표',[['value','값'],['label','이름'],['note','설명']]],columns:['columns','컬럼',[['heading','제목'],['bullets','내용','lines']]],comparison:['columns','비교 항목',[['heading','제목'],['bullets','내용','lines']]],timeline:['steps','단계',[['heading','제목'],['detail','설명']]],process:['steps','단계',[['heading','제목'],['detail','설명']]],chart:['chart','차트 값',[['label','이름'],['value','수치','number'],['display','표시']]]}[slide.layout];
  if(config){
    const [key,label,schema]=config;const heading=document.createElement('h3');heading.textContent=label;heading.className='field-label';card.append(heading);
    (Array.isArray(slide[key])?slide[key]:[]).forEach((item,j)=>{
      const wrap=document.createElement('div');wrap.className='nested-item';
      for(const [name,caption,kind] of schema)wrap.append(field(caption,item[name],value=>commit(doc=>{doc.data.slides[indexValue][key][j][name]=value;}),kind||'text',`data.slides.${indexValue}.${key}.${j}.${name}`));
      const remove=document.createElement('button');remove.className='button';remove.textContent=`${label} ${j+1} 삭제`;remove.addEventListener('click',()=>commit(doc=>doc.data.slides[indexValue][key].splice(j,1),true));wrap.append(remove);card.append(wrap);
    });
    const add=document.createElement('button');add.className='button';add.textContent=`+ ${label} 추가`;add.addEventListener('click',()=>commit(doc=>{doc.data.slides[indexValue][key]??=[];doc.data.slides[indexValue][key].push(Object.fromEntries(schema.map(([name,,kind])=>[name,kind==='lines'?[]:kind==='number'?0:''])));},true));card.append(add);
  }
  if(slide.layout==='image'){
    const label=document.createElement('label');label.className='field-label';label.textContent='이미지 참조';const select=document.createElement('select');select.id=`slide-image-${indexValue}`;label.htmlFor=select.id;
    for(const asset of [{id:'',name:'이미지 없음'},...state.assets.filter(x=>x.dataUri)]){const option=document.createElement('option');option.value=asset.id;option.textContent=asset.name;select.append(option);}select.value=slide.imageAssetId||'';select.addEventListener('change',()=>commit(doc=>{doc.data.slides[indexValue].imageAssetId=select.value;},true));card.append(label,select);
    card.append(field('대체 텍스트',slide.imageAlt,value=>commit(doc=>{doc.data.slides[indexValue].imageAlt=value;}),'text',`data.slides.${indexValue}.imageAlt`));
    card.append(field('이미지 설명',slide.imageCaption,value=>commit(doc=>{doc.data.slides[indexValue].imageCaption=value;}),'text',`data.slides.${indexValue}.imageCaption`));
  }
}
function updateGallery(){
  const host=$('gallery');host.replaceChildren();
  for(const preset of presetsFor(state.type)){
    const button=document.createElement('button');button.className='preset-card'+(state.preset===preset.id?' active':'');button.type='button';
    const thumb=document.createElement('div');thumb.className=`preset-thumb thumb-${state.type}`;const frame=document.createElement('iframe');frame.title=`${preset.name} 미리보기`;frame.loading='lazy';frame.setAttribute('sandbox','');frame.srcdoc=render(applyPreset(copy(state),preset.id));thumb.append(frame);
    const label=document.createElement('strong');label.textContent=preset.name;
    const info=document.createElement('small');info.textContent=preset.description+(preset.ats?' · ATS 친화':'');button.append(thumb,label,info);
    button.addEventListener('click',()=>commit(doc=>{applyPreset(doc,preset.id);},true));host.append(button);
  }
}
function paint(){
  if(!state)return;
  document.querySelectorAll('#types button').forEach(button=>button.classList.toggle('active',button.dataset.type===state.type));
  $('theme').value=state.theme;$('font-pair').value=state.typography.pair||fontPairs[0].id;
  makeFields();makeCollections();makeTypeControls();updateGallery();refreshComparePresets();$('json').value=JSON.stringify(state,null,2);update();updateHistoryButtons();
}
function update(){
  if(!state)return;
  $('canvas-title').textContent=title(state);$('frame').srcdoc=render(state);
  $('compare-frame').hidden=!compare;if(compare && comparePreset)$('compare-frame').srcdoc=render(applyPreset(copy(state),comparePreset));
  const report=audit(state),count=report.errors.length+report.warnings.length;
  $('audit').classList.toggle('warn',count>0);$('audit').textContent=`검사 ${report.ok?'통과':'오류'} · 오류 ${report.errors.length} · 주의 ${report.warnings.length}`+(count?' · '+[...report.errors,...report.warnings].slice(0,2).join(' / '):'');
}
function refreshComparePresets(){
  const select=$('compare-preset'),options=presetsFor(state.type);select.replaceChildren();
  for(const preset of options){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;select.append(option);}
  if(!options.some(x=>x.id===comparePreset)||comparePreset===state.preset)comparePreset=options.find(x=>x.id!==state.preset)?.id||options[0]?.id||'';
  select.value=comparePreset;select.hidden=!compare;
}
function makeTypeControls(){
  const host=$('type-controls');host.replaceChildren();const t=resolveTypography(state);
  const rows=[['size','본문 크기',.75,1.5,.05,'typography'],['weight','본문 굵기',400,700,300,'typography'],['headingScale','제목 크기',.75,1.4,.05,'typography'],['lineHeight','줄간격',1.2,2.2,.05,'typography'],['letterSpacing','자간',-.08,.12,.01,'typography'],['paragraphSpacing','문단 간격',.5,2,.1,'typography'],['margin','페이지 여백',8,30,1,'page'],['columnGap','컬럼 간격',5,25,1,'page']];
  for(const [key,label,min,max,step,area] of rows){
    const wrapper=document.createElement('div');wrapper.className='field';const caption=document.createElement('label');caption.textContent=`${label} · ${t[key]}`;const slider=document.createElement('input');slider.type='range';Object.assign(slider,{min,max,step,value:t[key]});
    slider.addEventListener('change',()=>{commit(doc=>{doc[area][key]=Number(slider.value);},true);});wrapper.append(caption,slider);host.append(wrapper);
  }
  const alignment=field('텍스트 정렬',t.align,value=>commit(doc=>{doc.typography.align=value;},true));const align=alignment.querySelector('input');const select=document.createElement('select');select.id=align.id;align.remove();for(const value of ['left','center','right','justify']){const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);}select.value=t.align;select.addEventListener('change',()=>commit(doc=>{doc.typography.align=select.value;},true));alignment.append(select);host.append(alignment);
  const fontHost=$('font-controls');fontHost.replaceChildren();
  for(const [key,label] of [['heading','제목 글꼴'],['body','본문 글꼴'],['mono','코드·수치 글꼴']]){
    const wrap=document.createElement('div');wrap.className='field';const name=document.createElement('label');name.textContent=label;const select=document.createElement('select');select.id=`font-${key}`;name.htmlFor=select.id;
    for(const [id,font] of Object.entries(fontFamilies)){const option=document.createElement('option');option.value=id;option.textContent=font.name;select.append(option);}
    select.value=t[key];select.addEventListener('change',()=>commit(doc=>{doc.typography[key]=select.value;},true));
    const sample=document.createElement('span');sample.className='font-sample';sample.textContent='가나다 ABC 123';sample.style.fontFamily=`'${fontFamilies[t[key]].name}',sans-serif`;
    wrap.append(name,select,sample);fontHost.append(wrap);
  }
  const colorHost=$('color-controls');colorHost.replaceChildren();
  for(const [key,label] of [['ink','본문'],['primary','주색'],['accent','강조'],['paper','용지'],['soft','카드 배경']]){
    const wrap=document.createElement('div');wrap.className='field';const name=document.createElement('label');name.textContent=label;const input=document.createElement('input');input.type='color';input.id=`color-${key}`;input.value=state.themeTokens?.[key]||themePalettes[state.theme]?.[key]||'#ffffff';name.htmlFor=input.id;input.addEventListener('change',()=>commit(doc=>{doc.themeTokens[key]=input.value;},true));wrap.append(name,input);colorHost.append(wrap);
  }
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
$('new-project').addEventListener('click',()=>{$('new-type').value=state.type;$('new-title').value='';fillNewPresets();$('new-dialog').showModal();$('new-title').focus();});
$('new-type').addEventListener('change',fillNewPresets);
$('new-title').addEventListener('input',()=>$('new-title').setCustomValidity(''));
$('cancel-new').addEventListener('click',()=>$('new-dialog').close());
$('confirm-new').addEventListener('click',()=>{
  const title=$('new-title').value.trim();if(!title){$('new-title').setCustomValidity('제목을 입력하세요.');$('new-title').reportValidity();return;}
  const doc=blankProject($('new-type').value);if(doc.type==='cv')doc.data.name=title;else doc.data.title=title;applyPreset(doc,$('new-preset').value);create(doc);$('new-dialog').close();tabTo('content');
});
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
$('theme').addEventListener('change',event=>commit(doc=>{doc.theme=event.target.value;},true));
$('font-pair').addEventListener('change',event=>commit(doc=>{doc.typography.pair=event.target.value;delete doc.typography.heading;delete doc.typography.body;delete doc.typography.mono;},true));
$('compare').addEventListener('click',()=>{compare=!compare;refreshComparePresets();update();$('compare').textContent=compare?'비교 닫기':'A/B 비교';});
$('compare-preset').addEventListener('change',event=>{comparePreset=event.target.value;update();});
for(const part of ['content','design','import','json'])$(`tab-${part}`).addEventListener('click',()=>tabTo(part));
$('apply-json').addEventListener('click',()=>{try{const next=normalizeProject(JSON.parse($('json').value));if(next.type!==state.type)throw Error('유형을 바꾸려면 새 프로젝트로 가져오세요.');commit(()=>{state=next;},true);$('json-error').textContent='';}catch(error){$('json-error').textContent=error.message;}});
$('download-json').addEventListener('click',()=>download(filename('json'),JSON.stringify(state,null,2)+'\n','application/json'));
$('download-html').addEventListener('click',async()=>{try{const result=audit(state);if(!result.ok)throw Error(result.errors.join(' / '));setStatus('글꼴을 포함하는 중');download(filename('html'),await embedFonts(render(state)),'text/html;charset=utf-8');setStatus('HTML 내보내기 완료');}catch(error){setStatus(error.message,true);}});
$('print').addEventListener('click',()=>{const frame=$('frame');frame.contentWindow?.focus();frame.contentWindow?.print();});
$('frame').addEventListener('load',()=>{
  try{$('frame').contentDocument?.addEventListener('click',event=>{
    const path=event.target.closest?.('[data-edit-path]')?.dataset.editPath;if(!path)return;
    const input=[...document.querySelectorAll('[data-project-path]')].find(x=>x.dataset.projectPath===path);if(!input)return;
    event.preventDefault();tabTo('content');input.scrollIntoView({block:'center',behavior:'smooth'});input.focus();input.select?.();
  });}catch{/* sandboxed output remains view-only if frame access is unavailable */}
});
$('file-upload').addEventListener('change',event=>{filesChosen([...event.target.files]);event.target.value='';});
const drop=$('drop-zone');for(const name of ['dragenter','dragover'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('drag');});for(const name of ['dragleave','drop'])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('drag');});drop.addEventListener('drop',event=>filesChosen([...event.dataTransfer.files]));
$('create-from-import').addEventListener('click',()=>useImport());$('attach-source').addEventListener('click',()=>useImport(true));
window.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey))return;if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}if(event.key.toLowerCase()==='s'){event.preventDefault();$('download-json').click();}});
start().catch(error=>setStatus(`시작 실패: ${error.message}`,true));
