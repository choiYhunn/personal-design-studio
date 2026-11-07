import {types, themes} from './engine.mjs';

export const schemaVersion = 2;
const copy = value => structuredClone(value);
const str = value => String(value ?? '').trim();

/** Keep the v0.1 data object intact while adding the shared workbench envelope. */
export function normalizeProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('프로젝트 JSON은 객체여야 합니다.');
  if (!types.includes(input.type)) throw Error('지원하지 않는 프로젝트 유형입니다.');
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) throw Error('프로젝트 data가 올바르지 않습니다.');
  if (input.schemaVersion && input.schemaVersion !== schemaVersion) throw Error(`지원하지 않는 schemaVersion ${input.schemaVersion}입니다.`);
  const doc = copy(input);
  doc.schemaVersion = schemaVersion;
  doc.theme = themes.includes(doc.theme) ? doc.theme : 'editorial';
  doc.metadata ??= {title: str(doc.data.name || doc.data.title), createdAt: new Date().toISOString(), status: 'draft'};
  doc.sourceDocuments ??= [];
  doc.preset ??= null;
  doc.themeTokens ??= {};
  doc.typography ??= {};
  doc.page ??= {};
  doc.assets ??= [];
  doc.exportSettings ??= {};
  doc.revisions ??= [];
  doc.provenance ??= {};
  return doc;
}

export function projectFromImport(result, type) {
  if (!types.includes(type)) throw Error('문서 유형을 선택하세요.');
  const sourceId = globalThis.crypto?.randomUUID?.() || `source-${Date.now()}`;
  const lines = result.blocks?.length ? result.blocks.flatMap(item=>item.kind==='page'?item.text.split(/\n+/).map(text=>({kind:'paragraph',text})):[item]) : result.text.split(/\n+/).map(text => ({kind:'paragraph',text}));
  const values = lines.map(x => str(x.text)).filter(Boolean);
  const title = values[0] || result.name.replace(/\.[^.]+$/, '');
  const body = values.slice(1).join('\n');
  let data;
  if (type === 'cv') {
    const section = {experience:[],projects:[],education:[],skills:[]};
    let current = 'summary';
    for (const item of lines.slice(1)) {
      const value = str(item.text);
      if (!value) continue;
      const heading = /^(experience|work experience|경력|projects?|프로젝트|education|학력|skills?|기술|역량)\s*:?$/i.exec(value)?.[1]?.toLowerCase();
      if (heading) {current = /experience|경력/.test(heading)?'experience':/project|프로젝트/.test(heading)?'projects':/education|학력/.test(heading)?'education':'skills'; continue;}
      if (current === 'experience' && item.kind==='list' && section.experience.length) section.experience.at(-1).bullets.push(value);
      else if (current === 'projects' && item.kind==='list' && section.projects.length) section.projects.at(-1).bullets.push(value);
      else if (current === 'experience') section.experience.push({role:value,organization:'',period:'',bullets:[]});
      else if (current === 'projects') section.projects.push({name:value,stack:'',period:'',bullets:[]});
      else if (current === 'education') section.education.push({school:value,degree:'',period:''});
      else if (current === 'skills') section.skills.push({category:'기술',items:[value]});
    }
    data = {name:title,role:'',summary:body.slice(0,1500),contact:[],...section,awards:[],languages:[]};
  } else if (type === 'slides') {
    const slides = result.slides?.length ? result.slides.map((s,i) => ({layout:i===0?'cover':'bullets',title:s.title || `Slide ${i+1}`,subtitle:'',bullets:s.lines.filter(x=>x!==s.title),notes:s.notes || ''})) : values.map((v,i)=>({layout:i===0?'cover':'bullets',title:v,subtitle:'',bullets:[]}));
    data = {title,subtitle:'',slides:slides.length?slides:[{layout:'cover',title,subtitle:''}]};
  } else if (type === 'report') {
    const sections = [];
    for (const item of lines.slice(1)) {
      const value=str(item.text);if(!value)continue;
      if (item.kind==='heading') sections.push({heading:value,body:''});
      else if (!sections.length) sections.push({heading:'본문',body:value});
      else sections.at(-1).body += (sections.at(-1).body?'\n':'')+value;
    }
    data = {title,subtitle:'',author:'',date:'',executiveSummary:'',sections:sections.length?sections:[{heading:'본문',body}],sources:[result.name]};
  } else {
    data = {title,subtitle:'가져온 문서의 수치를 검토하세요.',period:'',source:result.name,kpis:[],chart:[],insights:values.slice(1,8)};
  }
  return normalizeProject({type,theme:'editorial',data,sourceDocuments:[{id:sourceId,name:result.name,format:result.format,size:result.size,text:result.text,blocks:result.blocks,slides:result.slides,images:result.images,warnings:result.warnings,originalStored:false,importedAt:new Date().toISOString()}],provenance:{kind:'imported',sourceIds:[sourceId],reviewed:false},metadata:{title,createdAt:new Date().toISOString(),status:'needs-review'}});
}
