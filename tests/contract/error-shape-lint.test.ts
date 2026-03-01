import { describe, it, expect } from 'vitest';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'node:path';

async function walk(dir: string, collector: string[]) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip hidden and build/vendor dirs
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      const skipDirs = new Set(['node_modules', '.next', 'tests', 'e2e', 'playwright-report', 'coverage']);
      if (skipDirs.has(entry.name)) continue;
      await walk(path.join(dir, entry.name), collector);
    } else {
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      // Skip test/spec files
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;
      collector.push(path.join(dir, entry.name));
    }
  }
}

async function findNonStandardErrors() {
  const roots = ['app/api', 'lib'];
  const hits: { file: string; line: number; snippet: string }[] = [];
  const cwd = process.cwd();

  for (const root of roots) {
    const absRoot = path.join(cwd, root);
    try {
      const rootStat = await stat(absRoot);
      if (!rootStat.isDirectory()) continue;
    } catch {
      continue;
    }

    const files: string[] = [];
    await walk(absRoot, files);

    for (const file of files) {
      const content = await readFile(file, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((line, idx) => {
        // Look for NextResponse.json({ error: ... in production code
        if (/NextResponse\.json\(\s*{[^}]*\berror\b\s*:/.test(line)) {
          hits.push({
            file: path.relative(cwd, file),
            line: idx + 1,
            snippet: line.trim(),
          });
        }
      });
    }
  }

  return hits;
}

describe('API error contract hygiene', () => {
  it('does not use inline { error: ... } responses in app/api or lib', async () => {
    const hits = await findNonStandardErrors();
    expect(hits).toEqual([]);
  });
});
