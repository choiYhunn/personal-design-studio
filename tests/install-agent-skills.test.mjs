import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('global user-level Codex and Claude skills install only with explicit command', async () => {
  const home = await mkdtemp(join(tmpdir(),'pds-agent-skills-'));
  const cmd = (...opts) => spawnSync(process.execPath, ['scripts/install-agent-skills.mjs', '--home', home,...opts], {encoding:'utf8'});
  try {
    const dry = cmd('--dry-run');
    assert.equal(dry.status, 0, dry.stderr);
    const actual = cmd();
    assert.equal(actual.status,0,actual.stderr);
    for (const loc of ['.agents','.claude']) {
      const path = join(home,loc,'skills','personal-design-studio','SKILL.md');
      const text = await readFile(path,'utf8');
      assert.match(text,/name: personal-design-studio/);
      assert.match(text,/Authoritative design workflow/);
      assert.match(text,/Create project JSON/);
    }
    const path = join(home,'.agents','skills','personal-design-studio','SKILL.md');
    await writeFile(path,'custom existing skill');
    const refused = cmd();
    assert.equal(refused.status,1);
    assert.equal(await readFile(path,'utf8'),'custom existing skill');
    const forced = cmd('--force');
    assert.equal(forced.status,0,forced.stderr);
    assert.match(await readFile(path,'utf8'),/name: personal-design-studio/);
  } finally {
    await rm(home,{recursive:true,force:true});
  }
});
