export const fontFamilies = {
  'noto-sans-kr': {name:'Noto Sans KR',package:'noto-sans-kr',korean:true,license:'OFL-1.1'},
  'noto-serif-kr': {name:'Noto Serif KR',package:'noto-serif-kr',korean:true,license:'OFL-1.1'},
  inter: {name:'Inter',package:'inter',license:'OFL-1.1'},
  'source-serif-4': {name:'Source Serif 4',package:'source-serif-4',license:'OFL-1.1'},
  'ibm-plex-mono': {name:'IBM Plex Mono',package:'ibm-plex-mono',license:'OFL-1.1'}
};

export const fontPairs = [
  {id:'clear-sans',name:'명료한 산세리프',heading:'noto-sans-kr',body:'noto-sans-kr',mono:'ibm-plex-mono'},
  {id:'editorial-serif',name:'에디토리얼 세리프',heading:'noto-serif-kr',body:'noto-sans-kr',mono:'ibm-plex-mono'},
  {id:'research',name:'연구 논문',heading:'source-serif-4',body:'noto-serif-kr',mono:'ibm-plex-mono'},
  {id:'modern-technical',name:'모던 테크니컬',heading:'inter',body:'noto-sans-kr',mono:'ibm-plex-mono'},
  {id:'humanist-report',name:'휴머니스트 보고서',heading:'noto-serif-kr',body:'noto-serif-kr',mono:'ibm-plex-mono'},
  {id:'compact-cv',name:'압축형 이력서',heading:'inter',body:'inter',mono:'ibm-plex-mono'},
  {id:'quiet-executive',name:'절제된 임원형',heading:'source-serif-4',body:'noto-sans-kr',mono:'ibm-plex-mono'},
  {id:'mono-signal',name:'기술 신호',heading:'ibm-plex-mono',body:'noto-sans-kr',mono:'ibm-plex-mono'},
  {id:'serif-headline',name:'강한 세리프 제목',heading:'noto-serif-kr',body:'inter',mono:'ibm-plex-mono'},
  {id:'international',name:'국영문 균형',heading:'inter',body:'noto-serif-kr',mono:'ibm-plex-mono'},
  {id:'academic-sans',name:'학술 산세리프',heading:'noto-sans-kr',body:'source-serif-4',mono:'ibm-plex-mono'},
  {id:'data-brief',name:'데이터 브리프',heading:'ibm-plex-mono',body:'inter',mono:'ibm-plex-mono'}
];

const safeNumber=(value,baseline,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):baseline;
const family=id=>fontFamilies[id]||fontFamilies['noto-sans-kr'];
const cssFamily=id=>`'${family(id).name}', '${id==='noto-serif-kr'||id==='source-serif-4'?'Noto Serif KR':'Noto Sans KR'}', ${id==='noto-serif-kr'||id==='source-serif-4'?'serif':'sans-serif'}`;
export function resolveTypography(doc){
  const pair=fontPairs.find(x=>x.id===doc?.typography?.pair)||fontPairs[0];
  const t=doc?.typography||{};
  return {pair,heading:Object.hasOwn(fontFamilies,t.heading)?t.heading:pair.heading,body:Object.hasOwn(fontFamilies,t.body)?t.body:pair.body,mono:Object.hasOwn(fontFamilies,t.mono)?t.mono:pair.mono,
    size:safeNumber(t.size,1,.75,1.5),weight:safeNumber(t.weight,400,300,800),lineHeight:safeNumber(t.lineHeight,1.6,1.2,2.2),letterSpacing:safeNumber(t.letterSpacing,0,-.08,.12),paragraphSpacing:safeNumber(t.paragraphSpacing,1,.5,2),headingScale:safeNumber(t.headingScale,1,.75,1.4),align:['left','center','right','justify'].includes(t.align)?t.align:'left',margin:safeNumber(doc?.page?.margin,18,8,30),columnGap:safeNumber(doc?.page?.columnGap,11,5,25)};
}
function fontFaces(id){
  const f=family(id), subsets=f.korean?['korean','latin']:['latin'];
  return subsets.flatMap(subset=>[400,700].map(weight=>`@font-face{font-family:'${f.name}';font-style:normal;font-weight:${weight};font-display:swap;src:url('/vendor/fonts/${f.package}/${f.package}-${subset}-${weight}-normal.woff2') format('woff2')}`)).join('');
}
export function designCSS(doc){
  const t=resolveTypography(doc), ids=new Set([t.heading,t.body,t.mono,'noto-sans-kr','noto-serif-kr']);
  return [...ids].map(fontFaces).join('')+`:root{--font-heading:${cssFamily(t.heading)};--font-body:${cssFamily(t.body)};--font-mono:${cssFamily(t.mono)};--type-scale:${t.size};--heading-scale:${t.headingScale};--body-weight:${t.weight};--line-height:${t.lineHeight};--tracking:${t.letterSpacing}em;--paragraph-space:${t.paragraphSpacing};--page-margin:${t.margin}mm;--column-gap:${t.columnGap}mm}body{font-family:var(--font-body);font-weight:var(--body-weight);text-align:${t.align}}h1,h2,h3{font-family:var(--font-heading);letter-spacing:var(--tracking)}p,li{line-height:var(--line-height)}code,.stat strong{font-family:var(--font-mono)}`;
}
