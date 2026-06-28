import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getComponentSource } from './component-source.js';

const R_DIR = join(process.cwd(), 'public', 'r');

beforeAll(() => {
  mkdirSync(R_DIR, { recursive: true });
  writeFileSync(join(R_DIR, '__test-widget.json'), JSON.stringify({
    name: 'TestWidget', slug: '__test-widget',
    files: [{ path: '__test-widget.ts', content: 'export const x = 1;' }],
    dependencies: ['@termuijs/core'],
  }));
});
afterAll(() => { rmSync(join(R_DIR, '__test-widget.json'), { force: true }); });

describe('getComponentSource', () => {
  it('returns content + filePath + dependencies for a known slug', () => {
    const src = getComponentSource('__test-widget');
    expect(src).not.toBeNull();
    expect(src!.content).toContain('export const x');
    expect(src!.filePath).toBe('__test-widget.ts');
    expect(src!.dependencies).toEqual(['@termuijs/core']);
  });

  it('returns null for an unknown slug', () => {
    expect(getComponentSource('does-not-exist')).toBeNull();
  });
});
