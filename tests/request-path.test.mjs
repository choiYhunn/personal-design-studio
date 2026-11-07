import test from 'node:test';
import assert from 'node:assert/strict';
import {win32, posix} from 'node:path';
import {resolveStudioPath} from '../src/request-path.mjs';

test('index route works with Windows paths (regression: Forbidden on localhost)', () => {
  const root = 'C:\\Users\\Student\\personal-design-studio';
  assert.equal(resolveStudioPath(root, '/', win32), 'C:\\Users\\Student\\personal-design-studio\\studio\\index.html');
  assert.equal(resolveStudioPath(root, '/src/engine.mjs', win32), 'C:\\Users\\Student\\personal-design-studio\\src\\engine.mjs');
  assert.equal(resolveStudioPath(root, '/examples/cv.json', win32), 'C:\\Users\\Student\\personal-design-studio\\examples\\cv.json');
});

test('index route works on POSIX', () => {
  assert.equal(resolveStudioPath('/workspace/studio', '/', posix), '/workspace/studio/studio/index.html');
});

test('rejects traversal and unrelated files on both platforms', () => {
  for (const p of [win32,posix]) {
    const root = p === win32 ? 'C:\\Users\\Student\\personal-design-studio' : '/workspace/studio';
    for (const route of ['/README.md','/.git/config','/studio/../AGENTS.md','/studio//index.html','/studio/.','/studio/..','/studio/evil\\escape.js','/src/C:/Windows','/other/test.txt']) {
      assert.equal(resolveStudioPath(root, route, p), null, route);
    }
  }
});
