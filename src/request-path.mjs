import * as nodePath from 'node:path';

/**
 * Return an absolute path inside the allowlisted static file directories, or null.
 * Uses the active platform's path operations; injectable win32/posix for regression tests.
 */
export function resolveStudioPath(root, pathname, pathOps = nodePath) {
  const route = pathname === '/' ? '/studio/index.html' : pathname;
  if (typeof route !== 'string' || !route.startsWith('/')) return null;
  const parts = route.slice(1).split('/');
  if (parts.length < 2 || !['studio', 'src', 'examples'].includes(parts[0])) return null;
  if (parts.some(part => !part || part === '.' || part === '..' || /[\\:\x00]/.test(part))) return null;
  const base = pathOps.resolve(root);
  const target = pathOps.resolve(base, ...parts);
  const relative = pathOps.relative(base, target);
  if (!relative || relative === '..' || relative.startsWith('..' + pathOps.sep) || pathOps.isAbsolute(relative)) return null;
  return target;
}
