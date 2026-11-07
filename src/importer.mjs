import {unzipSync} from 'fflate';
import {normalizeProject} from './project.mjs';

export const supportedFormats = ['.json','.txt','.md','.docx','.pdf','.pptx','.png','.jpg','.jpeg','.svg'];
export const maxFileSize = 12 * 1024 * 1024;
const decoder = new TextDecoder('utf-8',{fatal:true});
const extOf = name => /\.[^.]+$/.exec(String(name).toLowerCase())?.[0] || '';
const clean = value => String(value ?? '').replace(/\0/g,'').trim();
const decode = bytes => decoder.decode(bytes);
const lines = text => text.replace(/\r\n?/g,'\n').split(/\n+/).map(x=>clean(x)).filter(Boolean);
const xmlText = text => text.replace(/<[^>]*>/g,'').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&(?:amp|lt|gt|quot|apos);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m]));
const plainBlocks = text => lines(text).map(text=>({kind:'paragraph',text}));
const asBytes = value => value instanceof Uint8Array ? value : new Uint8Array(value);

/** Check central-directory sizes before a third-party ZIP parser inflates any entry. */
export function inspectZip(input) {
  const bytes=asBytes(input), view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0) throw Error('ZIP 끝 기록이 없습니다. 파일이 손상되었을 수 있습니다.');
  const count=view.getUint16(end+10,true), size=view.getUint32(end+12,true), offset=view.getUint32(end+16,true);
  if(count>800 || size>4*1024*1024 || offset+size>bytes.length) throw Error('압축 파일의 항목 수나 목차가 안전 한도를 넘었습니다.');
  let at=offset,total=0;
  for(let i=0;i<count;i++){
    if(at+46>bytes.length || view.getUint32(at,true)!==0x02014b50) throw Error('ZIP 목차가 손상되었습니다.');
    const flags=view.getUint16(at+8,true), compressed=view.getUint32(at+20,true), expanded=view.getUint32(at+24,true);
    const nameLen=view.getUint16(at+28,true), extra=view.getUint16(at+30,true), comment=view.getUint16(at+32,true);
    const name=decode(bytes.subarray(at+46,at+46+nameLen));
    if(flags&1) throw Error('암호화된 Office 파일은 가져올 수 없습니다.');
    if(expanded>16*1024*1024 || (compressed && expanded/compressed>500)) throw Error('압축 해제 크기 또는 압축률이 안전 한도를 넘었습니다.');
    if(name.startsWith('/') || name.includes('..') || name.includes('\\')) throw Error('압축 파일에 안전하지 않은 경로가 있습니다.');
    total+=expanded;at+=46+nameLen+extra+comment;
  }
  if(total>64*1024*1024 || at!==offset+size) throw Error('압축 해제 총 크기 또는 ZIP 목차가 안전 한도를 넘었습니다.');
  return {entries:count,expandedBytes:total};
}

function markdownBlocks(text){
  return text.replace(/\r\n?/g,'\n').split('\n').map(row=>{
    const value=clean(row);if(!value)return null;
    if(/^#{1,6}\s/.test(value))return {kind:'heading',text:value.replace(/^#{1,6}\s+/,'')};
    if(/^\s*[-*+]\s/.test(row))return {kind:'list',text:value.replace(/^[-*+]\s+/,'')};
    if(value.includes('|') && /^\|/.test(value))return {kind:'table',text:value};
    return {kind:'paragraph',text:value};
  }).filter(Boolean);
}

function htmlBlocks(html){
  const out=[];
  for(const m of html.matchAll(/<(h[1-6]|p|li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi)){
    const text=clean(xmlText(m[2]));if(text)out.push({kind:m[1].startsWith('h')?'heading':m[1]==='li'?'list':m[1]==='tr'?'table':'paragraph',text});
  }
  return out;
}

async function parseDocx(bytes){
  inspectZip(bytes);
  const mammoth=globalThis.mammoth || (await import('mammoth')).default;
  const source=typeof window==='undefined'?{buffer:Buffer.from(bytes)}:{arrayBuffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  const [raw,html]=await Promise.all([mammoth.extractRawText(source),mammoth.convertToHtml(source,{externalFileAccess:false,convertImage:mammoth.images.imgElement(()=>Promise.resolve({src:''}))})]);
  return {text:clean(raw.value),blocks:htmlBlocks(html.value),warnings:[...raw.messages,...html.messages].map(m=>m.message).filter(Boolean)};
}

async function parsePdf(bytes){
  const pdfjs=typeof window==='undefined' ? await import('pdfjs-dist/legacy/build/pdf.mjs') : await import('pdfjs-dist');
  if(typeof window!=='undefined') pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.mjs';
  const standardFontDataUrl=typeof window==='undefined'?(await import('node:url')).fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url))+'/':'/vendor/pdfjs/standard_fonts/';
  const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,enableXfa:false,standardFontDataUrl});
  const pdf=await task.promise;
  try{
    if(pdf.numPages>200)throw Error('PDF가 200페이지를 넘어 처리할 수 없습니다.');
    const blocks=[];let empty=0;
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n), content=await page.getTextContent();
      let pageText='';for(const item of content.items){pageText+=item.str||'';pageText+=item.hasEOL?'\n':' ';}
      pageText=clean(pageText);if(!pageText)empty++;
      blocks.push({kind:'page',page:n,text:pageText});
      page.cleanup();
    }
    return {text:blocks.map(b=>b.text).join('\n\n'),blocks,warnings:empty?[`${empty}개 페이지에서 텍스트를 찾지 못했습니다. 스캔 PDF는 별도 OCR이 필요합니다.`]:[]};
  }finally{await pdf.destroy();}
}

function parsePptx(bytes){
  inspectZip(bytes);
  const zip=unzipSync(bytes);
  const names=Object.keys(zip).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a,b)=>Number(/slide(\d+)/.exec(a)[1])-Number(/slide(\d+)/.exec(b)[1]));
  if(!names.length)throw Error('PPTX에 슬라이드 XML이 없습니다.');
  const slides=names.map((name,i)=>{
    const xml=decode(zip[name]);
    const texts=[...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m=>clean(xmlText(m[1]))).filter(Boolean);
    const notes=zip[`ppt/notesSlides/notesSlide${i+1}.xml`];
    const noteText=notes?[...decode(notes).matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map(m=>clean(xmlText(m[1]))).filter(Boolean).join(' '):'';
    return {number:i+1,title:texts[0]||`Slide ${i+1}`,lines:texts,notes:noteText};
  });
  const images=Object.keys(zip).filter(x=>/^ppt\/media\//.test(x)).map(name=>({name,size:zip[name].length}));
  return {text:slides.map(s=>`Slide ${s.number}: ${s.lines.join(' · ')}`).join('\n'),blocks:slides.map(s=>({kind:'slide',page:s.number,text:s.lines.join(' · ')})),slides,images,warnings:['슬라이드 텍스트와 노트만 새 디자인으로 옮깁니다. 원본 배치·이미지 위치·애니메이션은 복원하지 않습니다.']};
}

export async function importBytes({name,bytes}){
  const format=extOf(name), data=asBytes(bytes), size=data.byteLength;
  if(!supportedFormats.includes(format)) throw Error(`지원하지 않는 형식 ${format||'(확장자 없음)'}입니다. ${supportedFormats.join(', ')} 파일을 선택하세요.`);
  if(!size)throw Error('빈 파일입니다. 원본 파일을 확인하세요.');
  if(size>maxFileSize)throw Error('파일이 12 MiB 제한을 넘었습니다. 파일을 나누거나 크기를 줄여 다시 시도하세요.');
  let result;
  try{
    if(format==='.json'){
      const project=normalizeProject(JSON.parse(decode(data)));
      result={text:'',blocks:[],project,warnings:[]};
    }else if(format==='.txt'||format==='.md'){
      const text=decode(data);result={text,blocks:format==='.md'?markdownBlocks(text):plainBlocks(text),warnings:[]};
    }else if(format==='.docx') result=await parseDocx(data);
    else if(format==='.pdf')result=await parsePdf(data);
    else if(format==='.pptx')result=parsePptx(data);
    else if(format==='.svg'){
      const text=decode(data);
      if(!/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(text))throw Error('유효한 SVG 시작 태그가 없습니다.');
      result={text:'',blocks:[],warnings:['SVG는 보안상 참조 파일로만 보관하며 실행하거나 미리보기로 삽입하지 않습니다.']};
    }else{
      const png=format==='.png' && data[0]===137 && data[1]===80 && data[2]===78 && data[3]===71;
      const jpg=['.jpg','.jpeg'].includes(format) && data[0]===255 && data[1]===216 && data.at(-2)===255 && data.at(-1)===217;
      if(!png&&!jpg)throw Error('이미지 시그니처가 확장자와 일치하지 않습니다.');
      result={text:'',blocks:[],warnings:['이미지 참조를 첨부했습니다. 이미지의 텍스트를 읽으려면 별도 OCR이 필요합니다.']};
    }
  }catch(error){throw Error(`${name}: ${error.message} 원본 파일의 형식과 손상 여부를 확인하세요.`);}
  return {name,format,size,...result};
}

export async function importFile(file){return importBytes({name:file.name,bytes:new Uint8Array(await file.arrayBuffer())});}
