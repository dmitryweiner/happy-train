// Примеры уровней (levels/examples/): проходят проверку, не выигрываются без кликов и решаются.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { compileLevel } from '../src/core/level-v2';
import { idleOutcome, solveLevel } from '../src/core/solver';

const DIR = path.join(__dirname, '..', 'levels', 'examples');
const files = fs.readdirSync(DIR).filter(file => file.endsWith('.json'));

describe('примеры уровней', () => {
  for (const file of files) {
    test(`${file}: корректен, не проходится сам и решается минимум за 2 клика`, () => {
      const compiled = compileLevel(JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')));
      expect(compiled.warnings).toEqual([]);
      expect(idleOutcome(compiled.legacy).status).not.toBe('won');
      const result = solveLevel(compiled.legacy);
      expect(result.actions?.length).toBeGreaterThanOrEqual(2);
    }, 60_000);
  }
});
