import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ComponentSource {
  content: string;
  filePath: string;
  dependencies: string[];
}

/**
 * Read a component's generated registry file at build time. Returns the first
 * source file's content and its install dependencies, or null when the file is
 * absent or carries no source. The pages prerender per slug, so this runs
 * during the build, not on request.
 */
export function getComponentSource(slug: string): ComponentSource | null {
  try {
    const path = join(process.cwd(), 'public', 'r', `${slug}.json`);
    const json = JSON.parse(readFileSync(path, 'utf-8')) as {
      files?: Array<{ path: string; content: string }>;
      dependencies?: string[];
    };
    const file = json.files?.[0];
    if (!file) return null;
    return {
      content: file.content,
      filePath: file.path,
      dependencies: json.dependencies ?? [],
    };
  } catch {
    return null;
  }
}
