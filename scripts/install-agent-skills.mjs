#!/usr/bin/env node
import {homedir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const has = f => args.includes(f);
const value = f => {const n=args.indexOf(f);return n<0?undefined:args[n+1]};
if (args.some(x => x.startsWith('-') && !['--dry-run','--force','--home'].includes(x))) {
  console.error('Usage: node scripts/install-agent-skills.mjs [--dry-run] [--force] [--home <test-home>]');
  process.exitCode = 2;
} else {
  const home = value('--home') || homedir();
  if (!home || has('--home') && !value('--home')) throw Error('--home requires an explicit directory');
  const canonical = join(root,'skills','personal-design-studio','SKILL.md');
  await access(canonical);
  const description = 'Create or revise CVs, resumes, academic portfolios, presentations, PowerPoint-style slides, reports, and dashboards with locally rendered visual quality checks. Trigger for visual document design, not computer-vision code or generic programming.';
  const bin = join(root,'bin','studio.mjs');
  const content = [
    '---',
    'name: personal-design-studio',
    'description: '+description,
    '---',
    '',
    '# Personal Design Studio — user-level skill',
    '',
    'This local skill references a separate checkout. It never automatically sends data to a website.',
    '',
    'Installed studio root: `'+root+'`',
    'Authoritative design workflow: `'+canonical+'`',
    'Command-line entrypoint: `'+bin+'`',
    '',
    'When the user requests a relevant design artifact, first read the authoritative design workflow above. Create project JSON based on samples in that checkout, but save user-specific files only in the current working project or private workspace. For user documents, use `node "'+bin+'" import <file> --type <cv|slides|report|dashboard> -o <new-project.json>`, inspect extracted text and provenance, then build with `node "'+bin+'" build <project.json> -o <output.html>`. Run the audit and visually inspect the output, including page breaks. Do not invent factual claims. Do not commit private CVs or employer data to public repositories. Do not assume upstream Oh My Design or slides-grab is installed.',
    '',
  ].join('\n');
  const locations = [
    {agent:'Codex',path:join(home,'.agents','skills','personal-design-studio','SKILL.md')},
    {agent:'Claude Code',path:join(home,'.claude','skills','personal-design-studio','SKILL.md')}
  ];
  const dry = has('--dry-run'), force = has('--force');
  for (const {agent,path} of locations) {
    let previous = null;
    try {previous = await readFile(path,'utf8')} catch(e) {if (e.code !== 'ENOENT') throw e}
    if (previous === content) {console.log(agent+': up-to-date '+path);continue}
    if (previous !== null && !force) {
      console.error(agent+': existing skill not replaced (run with --force to overwrite): '+path);
      process.exitCode = 1;
      continue;
    }
    if (dry) {console.log(agent+': would '+(previous===null?'install':'replace')+' '+path);continue}
    await mkdir(dirname(path),{recursive:true});
    await writeFile(path,content,{encoding:'utf8',flag:'w'});
    console.log(agent+': '+(previous===null?'installed':'updated')+' '+path);
  }
}
