// Golden-снимки поведения legacy-движка (FIXIN-PLAN.md §5).
//  *.events.json — событийный уровень B: клетки локомотивов с тиком входа и итог; должен пережить рефакторинг.
//  *.trace.json  — строгий уровень A: позиции всех частей каждые 0.25 с; перегенерируется только на этапе 5.
// Обновить снимки: UPDATE_GOLDEN=1 npx jest tests/golden
// Снимка нет и UPDATE_GOLDEN не задан → тест падает (молча эталоны не создаются).
const fs = require('fs');
const path = require('path');
const { runScenario } = require('./legacy-harness');
const scenarios = require('./scenarios.json');

const GOLDEN_DIR = path.join(__dirname, '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

// Один кадр/клетка на строку: диффы снимков читаются построчно.
function stringifyByLine(value, listKey) {
  const { [listKey]: list, ...rest } = value;
  const head = JSON.stringify(rest, null, 2).replace(/\n}$/, '');
  const body = list.map(item => '    ' + JSON.stringify(item)).join(',\n');
  return `${head},\n  "${listKey}": [\n${body}\n  ]\n}\n`;
}

function stringifyEvents(events) {
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

function checkGolden(file, actualText) {
  const goldenPath = path.join(GOLDEN_DIR, file);
  if (UPDATE) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    fs.writeFileSync(goldenPath, actualText);
    return;
  }
  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Нет эталона ${file}. Создайте его: UPDATE_GOLDEN=1 npx jest tests/golden`);
  }
  expect(JSON.parse(actualText)).toEqual(JSON.parse(fs.readFileSync(goldenPath, 'utf8')));
}

describe('golden: legacy engine', () => {
  for (const scenario of scenarios) {
    describe(scenario.name, () => {
      const result = runScenario(scenario);

      if (scenario.expect) {
        test(`итог сценария: ${scenario.expect}`, () => {
          expect(result.events.outcome.status).toBe(scenario.expect);
        });
      }

      test('events (уровень B)', () => {
        checkGolden(`${scenario.name}.events.json`, stringifyEvents(result.events));
      });

      test('trace (уровень A)', () => {
        checkGolden(`${scenario.name}.trace.json`, stringifyByLine({ scenario: scenario.name, frames: result.trace }, 'frames'));
      });
    });
  }
});

// Эталон исходных уровней: от него отталкивается миграция на формат v2 (этапы 3–4).
describe('golden: levels.js', () => {
  test('уровни совпадают с эталоном', () => {
    const { LegacySim } = require('./legacy-harness');
    const levels = JSON.parse(JSON.stringify(new LegacySim(0).ctx.levels));
    const text = '[\n' + levels.map(level => '  ' + JSON.stringify(level)).join(',\n') + '\n]\n';
    checkGolden('legacy-levels.json', text);
  });
});
