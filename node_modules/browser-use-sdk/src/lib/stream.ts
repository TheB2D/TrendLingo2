import { createHash } from 'crypto';
import stringify from 'fast-json-stable-stringify';

import type { TaskView } from '../resources';

/**
 * Hashes the task view to detect changes.
 * Uses fast-json-stable-stringify for deterministic JSON, then SHA-256.
 */
export function getTaskViewHash(view: TaskView): string {
  const dump = stringify(view);
  const hash = createHash('sha256').update(dump).digest('hex');
  return hash;
}
