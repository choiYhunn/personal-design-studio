#!/usr/bin/env node
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve, dirname, extname, join, normalize} from 'node:path';
import {createServer} from 'node:http';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {render, audit, types, themes} from '../src/engine.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const help=`Personal Design Studio · local-first design workbench

Usage:
  npm start                            Open visual editor on http://127.0.0.1:4177
  node bin/studio.mjs init <type> [-o project.json]
  node bin/studio.mjs audit <project.json> [--strict]
  node bin/studio.mjs build <project.json> [-o out.html]
  node bin/studio.mjs pdf <project.json> [-o out.pdf]
  node bin/studio.mjs screenshot <project.json> [-o out.png]
  node bin/studio.mjs doctor

Types: ${types.join(', ')}; themes: ${themes.join(', ')}.
PDF and screenshots require locally installed Chrome/Chromium. No API key required.
`;
const args=process.argv.slice(2);const command=args[0]||'help';
const flag=(name,defaultValue)=>{let i=args.indexOf(name);return i>=0&&args[i+1]?args[i+1]:defaultValue};
const positional=args.slice(1).filter((v,i,a)=>{if(['-o','--out','--port'].includes(a[i-1]))return false;return !v.startsWith('-')&&!(a[i+1]&&['-o','--out','--port'].includes(v));});
const outputFile=(fallback)=>resolve(flag('-o',flag('--out',fallback)));
async function load(name){if(!name)throw Error('Input project JSON is required');let d=JSON.parse(await readFile(resolve(name),'utf8'));return d}
async function save(path,data){await mkdir(dirname(path),{recursive:true});await writeFile(path,data);console.log('Saved:',path)}
function chrome(){const env=process.env.CHROME_PATH;const names=[env,'chromium','chromium-browser','google-chrome','chrome'].filter(Boolean);for(const name of names){const p=spawnSync(process.platform==='win32'?'where':'which',[name],{encoding:'utf8'});if(p.status===0)return p.stdout.trim().split(/\r?\n/)[0]}return null}
function browserOutput(html,name,isPdf){const exe=chrome();if(!exe)throw Error('Chromium/Chrome not found. Install Chromium or set CHROME_PATH.');const tmp=resolve(dirname(name),'.design-studio-preview.html');return save(tmp,html).then(()=>{
 const flags=['--headless','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--no-first-run','--disable-extensions','--virtual-time-budget=2000',`--window-size=${isPdf?'1350,900':'1440,1000'}`];if(process.getuid?.()===0)flags.push('--no-sandbox');
 if(isPdf)flags.push('--print-to-pdf='+name,'--no-pdf-header-footer');else flags.push('--screenshot='+name);
 flags.push('file://'+tmp);
 const proc=spawnSync(exe,flags,{encoding:'utf8',timeout:12000});if(proc.status!==0||!existsSync(name))throw Error('Browser export failed: '+(proc.stderr||'exit '+proc.status).slice(0,600));console.log('Exported:',name);
 }).finally(async()=>{const {rm}=await import('node:fs/promises');await rm(tmp,{force:true})})}
async function server(){const port=Number(flag('--port','4177'));const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};const srv=createServer(async(req,res)=>{
  try{const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const target=resolve(root, '.'+(route==='/'?'/studio/index.html':route));
    if(!target.startsWith(root+'/')||!['/studio/','/src/','/examples/'].some(p=>(route==='/'?'/studio/':route).startsWith(p))) {res.writeHead(403);res.end('Forbidden');return}
    const content=await readFile(target);res.writeHead(200,{'content-type':mime[extname(target)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self' 'unsafe-inline' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'"});res.end(content);
  }catch{res.writeHead(404);res.end('Not found')}});
 srv.listen(port,'127.0.0.1',()=>console.log(`Studio ready: http://127.0.0.1:${port}\nFiles stay on this computer. Press Ctrl+C to stop.`));
}
try{
 if(command==='help'||command==='--help'||command==='-h')console.log(help);
 else if(command==='serve')await server();
 else if(command==='doctor'){console.log('Node:',process.version,Number(process.versions.node.split('.')[0])>=20?'OK':'Requires Node 20+');console.log('Browser:',chrome()||'not found (PDF/screenshot unavailable)');console.log('Modules: built in; API keys: none; network: none');}
 else if(command==='init'){const t=positional[0];if(!types.includes(t))throw Error('Expected type: '+types.join(', '));await copyFile(join(root,'examples',t+'.json'),outputFile(t+'.json'));console.log('Created:',outputFile(t+'.json'));}
 else if(['audit','build','pdf','screenshot'].includes(command)){
  const file=positional[0];const doc=await load(file);const result=audit(doc);
  if(command==='audit'){console.log(JSON.stringify(result,null,2));if(!result.ok||(args.includes('--strict')&&result.warnings.length))process.exitCode=1;}
  else {if(!result.ok)throw Error('Audit errors:\n'+result.errors.join('\n'));const output=outputFile(file.replace(/\.json$/i,command==='pdf'?'.pdf':command==='screenshot'?'.png':'.html'));const html=render(doc);if(command==='build')await save(output,html);else {await mkdir(dirname(output),{recursive:true});await browserOutput(html,output,command==='pdf')}if(result.warnings.length)console.warn('Audit warnings:',result.warnings.join(' | '));}
 } else throw Error(`Unknown command: ${command}\n${help}`);
}catch(e){console.error('ERROR:',e.message);process.exitCode=1;}
