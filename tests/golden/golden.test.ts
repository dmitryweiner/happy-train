// Golden-снимки поведения legacy-движка (FIXIN-PLAN.md §5).
//  *.events.json — событийный уровень B: клетки локомотивов с тиком входа и итог; должен пережить рефакторинг.
//  *.trace.json  — строгий уровень A: позиции всех частей каждые 0.25 с; перегенерируется только на этапе 5.
// По умолчанию проверяется код из src/. GOLDEN_ENGINE=legacy — замороженная копия старого движка.
// Обновить снимки: yarn test:golden:update (пишет снимки с GOLDEN_ENGINE=legacy).
// Снимка нет и UPDATE_GOLDEN не задан → тест падает (молча эталоны не создаются).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createSim, ENGINE } from './current-sim';
import { LegacySim, runScenario } from './legacy-harness';
import { levels as srcLevels } from '../../src/levels';
import scenarios from './scenarios.json';

interface Events {
  tickRate: number;
  outcome: unknown;
  finalCells: unknown;
  trains: { cells: unknown[] }[];
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
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    fs.writeFileSync(goldenPath, actualText);
    return;
  }
  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Нет эталона ${file}. Создайте его: yarn test:golden:update`);
  }
  expect(JSON.parse(actualText)).toEqual(JSON.parse(fs.readFileSync(goldenPath, 'utf8')));
}

describe(`golden (${ENGINE} engine)`, () => {
  for (const scenario of scenarios as { name: string; level: number; expect?: string }[]) {
    describe(scenario.name, () => {
      const result = runScenario(scenario, { createSim });

      if (scenario.expect) {
        test(`итог сценария: ${scenario.expect}`, () => {
          expect(result.events.outcome.status).toBe(scenario.expect);
        });
      }

      test('events (уровень B)', () => {
        checkGolden(`${scenario.name}.events.json`, stringifyEvents(result.events));
      });

      test('trace (уровень A)', () => {
        checkGolden(`${scenario.name}.trace.json`, stringifyByLine({ scenario: scenario.name, frames: result.trace }));
      });
    });
  }
});

// Эталон исходных уровней: от него отталкивается миграция на формат v2 (этапы 3–4).
describe(`golden: levels (${ENGINE} engine)`, () => {
  test('уровни совпадают с эталоном', () => {
    const levels = JSON.parse(JSON.stringify(ENGINE === 'legacy' ? new LegacySim(0).ctx.levels : srcLevels)) as unknown[];
    const text = '[\n' + levels.map(level => '  ' + JSON.stringify(level)).join(',\n') + '\n]\n';
    checkGolden('legacy-levels.json', text);
  });
});
