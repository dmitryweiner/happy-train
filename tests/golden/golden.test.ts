// Golden-снимки поведения (FIXIN-PLAN.md §5).
//  *.events.json — событийный уровень B: клетки локомотивов с тиком входа, итог, клетки всех частей в конце;
//  *.trace.json  — строгий уровень A: позиции всех частей каждые 0.25 с.
// __golden__/legacy/  — снимки замороженного legacy-движка (GOLDEN_ENGINE=legacy, yarn test:golden:update-legacy).
// __golden__/current/ — точные снимки движка из src/ (yarn test:golden:update).
// Движок из src/ дополнительно сверяется с legacy по событиям: клетки и итог — строго, время — ±0.2 с.
// Снимка нет и UPDATE_GOLDEN не задан → тест падает (молча эталоны не создаются).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createSim, ENGINE } from './current-sim';
import { LegacySim, runScenario } from './legacy-harness';
import { levels as srcLevels } from '../../src/levels';
import { legacyGridToTrackMap } from '../../src/core/legacy-import';
import { trackMapToTokens, validateTrackMap } from '../../src/core/track';
import scenarios from './scenarios.json';

interface Events {
  tickRate: number;
  outcome: { status: string; reason: string | null; tick: number };
  finalCells: [number, number][][];
  trains: { cells: [number, number, number][] }[];
}

// Допуск по времени при сверке с legacy: 0.2 с (FIXIN-PLAN.md §7, решение 3)
const TIME_TOLERANCE_TICKS = 12;

function compareWithLegacy(actual: Events, legacy: Events, maxTicks: number): void {
  expect(actual.outcome.status).toBe(legacy.outcome.status);
  expect(actual.outcome.reason).toBe(legacy.outcome.reason);
  const finished = legacy.outcome.status !== 'timeout';
  if (finished) {
    expect(Math.abs(actual.outcome.tick - legacy.outcome.tick)).toBeLessThanOrEqual(TIME_TOLERANCE_TICKS);
    if (legacy.outcome.status === 'won') {
      // В кадре победы legacy не двигал вагоны: сравниваем только локомотивы (они на станции)
      expect(actual.finalCells.map(train => train[0])).toEqual(legacy.finalCells.map(train => train[0]));
    } else {
      expect(actual.finalCells).toEqual(legacy.finalCells);
    }
  }
  // При таймауте последние клетки могут разойтись из-за допуска по времени — их не сравниваем
  const limit = finished ? Infinity : maxTicks - TIME_TOLERANCE_TICKS;
  expect(actual.trains).toHaveLength(legacy.trains.length);
  legacy.trains.forEach((legacyTrain, i) => {
    const expected = legacyTrain.cells.filter(cell => cell[2] <= limit);
    const got = actual.trains[i].cells.slice(0, expected.length);
    expect(got.map(([x, y]) => [x, y]), `train ${i}: cells`).toEqual(expected.map(([x, y]) => [x, y]));
    got.forEach((cell, k) => {
      const diff = Math.abs(cell[2] - expected[k][2]);
      if (diff > TIME_TOLERANCE_TICKS) {
        throw new Error(`train ${i}: cell (${cell[0]},${cell[1]}) entered at tick ${cell[2]}, legacy ${expected[k][2]} (diff ${diff} > ${TIME_TOLERANCE_TICKS})`);
      }
    });
  });
}

const GOLDEN_DIR = path.join(__dirname, '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

// Один кадр/клетка на строку: диффы снимков читаются построчно.
function stringifyByLine(value: { scenario: string; frames: unknown[] }): string {
  const { frames: list, ...rest } = value;
  const listKey = 'frames';
  const head = JSON.stringify(rest, null, 2).replace(/\n}$/, '');
  const body = list.map(item => '    ' + JSON.stringify(item)).join(',\n');
  return `${head},\n  "${listKey}": [\n${body}\n  ]\n}\n`;
}

function stringifyEvents(events: Events): string {
  const trains = events.trains
    .map(train => '    { "cells": [\n' + train.cells.map(cell => '      ' + JSON.stringify(cell)).join(',\n') + '\n    ] }')
    .join(',\n');
  return [
    '{',
    `  "tickRate": ${events.tickRate},`,
    `  "outcome": ${JSON.stringify(events.outcome)},`,
    `  "finalCells": ${JSON.stringify(events.finalCells)},`,
    '  "trains": [',
    trains,
    '  ]',
    '}',
    '',
  ].join('\n');
}

function checkGolden(file: string, actualText: string): void {
  const goldenPath = path.join(GOLDEN_DIR, file);
  if (UPDATE) {
    fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
    fs.writeFileSync(goldenPath, actualText);
    return;
  }
  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Нет эталона ${file}. Создайте его: yarn test:golden:update${ENGINE === 'legacy' ? '-legacy' : ''}`);
  }
  expect(JSON.parse(actualText)).toEqual(JSON.parse(fs.readFileSync(goldenPath, 'utf8')));
}

describe(`golden (${ENGINE} engine)`, () => {
  type Scenario = {
    name: string;
    level: number;
    maxTicks: number;
    expect?: string;
    // Сценарий только для одного движка (например, решение, найденное для нового движка)
    engine?: 'legacy' | 'current';
    // Почему новый движок сознательно ведёт себя иначе, чем legacy (сверка по событиям отключается)
    legacyDivergence?: string;
  };
  for (const scenario of (scenarios as Scenario[]).filter(s => !s.engine || s.engine === ENGINE)) {
    describe(scenario.name, () => {
      const result = runScenario(scenario, { createSim });
      const events = result.events as Events;

      const expected = ENGINE === 'current' && scenario.legacyDivergence ? undefined : scenario.expect;
      if (expected) {
        test(`итог сценария: ${expected}`, () => {
          expect(events.outcome.status).toBe(expected);
        });
      }

      if (ENGINE === 'current' && !scenario.engine) {
        test.skipIf(Boolean(scenario.legacyDivergence))('events совпадают с legacy (клетки и итог строго, время ±0.2 с)', () => {
          const legacy = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'legacy', `${scenario.name}.events.json`), 'utf8'));
          compareWithLegacy(events, legacy, scenario.maxTicks);
        });
      }

      test('events (уровень B)', () => {
        checkGolden(`${ENGINE}/${scenario.name}.events.json`, stringifyEvents(events));
      });

      test('trace (уровень A)', () => {
        checkGolden(`${ENGINE}/${scenario.name}.trace.json`, stringifyByLine({ scenario: scenario.name, frames: result.trace }));
      });
    });
  }
});

// Эталон исходных уровней: от него отталкивается миграция на формат v2 (этапы 3–4).
describe(`golden: levels (${ENGINE} engine)`, () => {
  test('уровни совпадают с эталоном', () => {
    const levels = JSON.parse(JSON.stringify(ENGINE === 'legacy' ? new LegacySim(0).ctx.levels : srcLevels)) as unknown[];
    if (ENGINE === 'current') {
      // Эталон заморожен: уровни из levels/*.json только сравниваются с ним и никогда его не перезаписывают
      expect(levels).toEqual(JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, 'legacy-levels.json'), 'utf8')));
      return;
    }
    const text = '[\n' + levels.map(level => '  ' + JSON.stringify(level)).join(',\n') + '\n]\n';
    checkGolden('legacy-levels.json', text);
  });
});

// Топология путей всех уровней в токенах формата v2 + замечания валидатора (этапы 3–4).
// Эталон для миграции: уровни v2 должны давать ровно эти клетки.
describe('golden: track topology of levels', () => {
  test('токены и замечания совпадают с эталоном', () => {
    const text = srcLevels
      .map((level, i) => {
        const map = legacyGridToTrackMap(level.grid);
        const rows = trackMapToTokens(map).map(row => '    ' + JSON.stringify(row));
        const issues = validateTrackMap(map).map(issue => '    ' + JSON.stringify(issue));
        return `  {\n   "level": ${i + 1},\n   "grid": [\n${rows.join(',\n')}\n   ],\n   "issues": [${issues.length ? '\n' + issues.join(',\n') + '\n   ' : ''}]\n  }`;
      })
      .join(',\n');
    checkGolden('level-tracks.json', `[\n${text}\n]\n`);
  });
});
