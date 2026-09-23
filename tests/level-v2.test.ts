import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { legacyLevelToV2 } from '../src/core/legacy-import';
import { renderLevelAscii } from '../src/core/level-ascii';
import { compileLevel, formatLevelJson, LevelError, type LevelV2 } from '../src/core/level-v2';
import { createWorld } from '../src/core/world';
import { levelFiles, levels } from '../src/levels';
import type { LegacyLevel } from '../src/types';

const ROOT = path.join(__dirname, '..');
const legacyLevels: LegacyLevel[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests', 'golden', '__golden__', 'legacy-levels.json'), 'utf8')
);
const readLevel = (n: number): LevelV2 =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'levels', `${String(n).padStart(2, '0')}.json`), 'utf8'));

function issuesOf(level: unknown): string[] {
  try {
    compileLevel(level);
  } catch (error) {
    if (error instanceof LevelError) return error.issues.map(issue => `${issue.severity}: ${issue.message}`);
    throw error;
  }
  return [];
}

function modified(n: number, change: (level: LevelV2) => void): LevelV2 {
  const level = readLevel(n);
  change(level);
  return level;
}

describe('миграция уровней на v2', () => {
  test('в levels/ ровно столько уровней, сколько было', () => {
    expect(levelFiles).toHaveLength(legacyLevels.length);
  });

  legacyLevels.forEach((legacy, index) => {
    test(`уровень ${index + 1}: v2 компилируется в исходный уровень`, () => {
      // Включая координаты и углы вагонов, которые в v2 не записаны, а вычисляются
      expect(compileLevel(readLevel(index + 1)).legacy).toEqual(legacy);
      expect(levels[index]).toEqual(legacy);
    });

    test(`уровень ${index + 1}: файл совпадает с автоматическим переводом`, () => {
      const file = fs.readFileSync(path.join(ROOT, 'levels', `${String(index + 1).padStart(2, '0')}.json`), 'utf8');
      expect(file).toBe(formatLevelJson(legacyLevelToV2(legacy)));
    });
  });
});

describe('compileLevel: ошибки', () => {
  test('несостыкованные рельсы', () => {
    const level = modified(1, l => {
      l.grid[0][2] = 'NS';
    });
    expect(issuesOf(level)).toContain('error: cell (1,0) "EW": exits E, but cell (2,0) "NS" has no W');
  });

  test('недопустимая клетка', () => {
    expect(issuesOf(modified(1, l => { l.grid[4][3] = 'XY'; }))).toContain(
      'error: cell (3,4): bad connection "XY" in token "XY": expected two of N, E, S, W'
    );
    expect(issuesOf(modified(1, l => { l.grid[4][3] = 'NE+SW'; }))[0]).toMatch(/neither share a side/);
  });

  test('размер поля', () => {
    expect(issuesOf(modified(1, l => { l.grid.pop(); }))).toEqual([
      'error: grid must be 15×10 cells (got 15×9); other sizes are not supported yet',
    ]);
  });

  test('лишние поля и версия', () => {
    const issues = issuesOf({ ...readLevel(1), version: 1, extra: true });
    expect(issues).toContain('error: unknown field "extra"');
    expect(issues).toContain('error: "version" must be 2');
  });

  test('локомотив смотрит туда, где нет пути', () => {
    const issues = issuesOf(modified(1, l => { l.trains[0].heading = 'N'; }));
    expect(issues).toContain('error: trains[0] at (4,0) heading N: cell "EW" has no track leaving N');
  });

  test('вагонам не хватает пути за локомотивом', () => {
    // Уровень 5: за локомотивом в (2,0) только две клетки до края поля
    const issues = issuesOf(modified(5, l => { l.trains[0].wagons = ['wagon1', 'wagon2', 'wagon1']; }));
    expect(issues).toContain('error: trains[0]: not enough track behind the locomotive for 3 wagon(s) (stops at (0,0))');
  });

  test('поезда пересекаются', () => {
    const issues = issuesOf(modified(1, l => { l.trains.push({ at: [3, 0], heading: 'E' }); }));
    expect(issues).toContain('error: trains[1]: cell (3,0) is already taken by trains[0]');
  });

  test('объекты вне пути и вне поля', () => {
    const issues = issuesOf(
      modified(1, l => {
        l.station = [1, 1];
        l.semaphores = [{ at: [20, 0], initial: 'open' }];
        l.switches = [{ at: [1, 0], initial: 'straight' }];
      })
    );
    expect(issues).toContain('error: station at (1,1): no track in this cell');
    expect(issues).toContain('error: semaphores[0] at (20,0) is outside the 15×10 field');
    expect(issues).toContain('error: switches[0] at (1,0): cell "EW" is not a switch');
  });

  test('все ошибки сообщаются сразу', () => {
    const issues = issuesOf(modified(1, l => { l.station = [1, 1]; l.trains[0].heading = 'N'; }));
    expect(issues.filter(issue => issue.startsWith('error'))).toHaveLength(2);
  });

  test('неканоническая запись — только предупреждение', () => {
    const { warnings } = compileLevel(modified(1, l => { l.grid[0][1] = 'WE'; }));
    expect(warnings.map(w => w.message)).toContain('cell (1,0) "WE" is not canonical, write "EW"');
  });
});

describe('compileLevel: возможности v2', () => {
  test('начальное положение стрелки доходит до мира', () => {
    const compiled = compileLevel(modified(1, l => { l.switches = [{ at: [5, 3], initial: 'diverging' }]; }));
    const world = createWorld(compiled.legacy);
    expect(world.switchStates['5,3'].isStraight).toBe(false);
    expect(world.switchStates['6,3'].isStraight).toBe(true);
  });

  test('вагоны встают по пути назад, в том числе через поворот', () => {
    // Уровень 1: локомотив в (1,0) едет на восток, за ним поворот (0,0) "ES" и вертикаль вниз
    const compiled = compileLevel(modified(1, l => { l.trains[0] = { at: [1, 0], heading: 'E', wagons: ['wagon1', 'wagon2'] }; }));
    expect(compiled.legacy.trains[0].map(part => [part.x, part.y])).toEqual([[1, 0], [0, 0], [0, 1]]);
  });

  test('ASCII-превью', () => {
    const ascii = renderLevelAscii(compileLevel(readLevel(1)));
    expect(ascii.split('\n')[1]).toBe('  0  ┌  -  - -w ->  ┐  .  .  .  ┌  -  -  -  -  ┐');
  });
});
