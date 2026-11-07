/** Make HTML exports usable after the local server has been closed. */
export async function embedFonts(html){
  const paths=[...new Set([...html.matchAll(/\/vendor\/fonts\/[\w-]+\/[\w-]+\.woff2/g)].map(m=>m[0]))];
  const packages=[...new Set(paths.map(path=>path.split('/')[3]))];
  let output=html;
  for(const path of paths){
    let bytes;
    if(typeof window==='undefined'){
      const {readFile}=await import('node:fs/promises');
      bytes=await readFile(new URL(`../node_modules/@fontsource/${path.split('/')[3]}/files/${path.split('/')[4]}`,import.meta.url));
    }else{
      const response=await fetch(path);if(!response.ok)throw Error(`글꼴을 읽지 못했습니다: ${path}`);
      bytes=new Uint8Array(await response.arrayBuffer());
    }
    let base64;
    if(typeof Buffer!=='undefined') base64=Buffer.from(bytes).toString('base64');
    else {let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));base64=btoa(binary);}
    output=output.replaceAll(path,`data:font/woff2;base64,${base64}`);
  }
  const licenses={};
  for(const name of packages){
    if(typeof window==='undefined'){
      const {readFile}=await import('node:fs/promises');
      licenses[name]=await readFile(new URL(`../node_modules/@fontsource/${name}/LICENSE`,import.meta.url),'utf8');
    }else{
      const response=await fetch(`/vendor/fonts/${name}/LICENSE`);if(!response.ok)throw Error(`글꼴 라이선스를 읽지 못했습니다: ${name}`);
      licenses[name]=await response.text();
    }
  }
  const notices=JSON.stringify(licenses).replace(/</g,'\\u003c');
  return output.replace('</head>',`<script type="application/json" id="font-license-notices">${notices}</script></head>`);
}
