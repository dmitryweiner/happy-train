#!/usr/bin/env -S npx tsx
// CLI для уровней формата v2 (FIXIN-PLAN.md §4).
//   yarn level validate levels/03.json [...]   — схема, стыковка путей, объекты; код выхода 1 при ошибках
//   yarn level render levels/03.json           — ASCII-превью поля
//   yarn level solve levels/03.json            — найти решение (минимум кликов); код выхода 1, если не нашлось
//   yarn level migrate                         — перегенерировать levels/*.json из legacy-уровней (разово)
import fs from 'node:fs';
import path from 'node:path';
import { compileLevel, formatLevelJson, LevelError } from '../src/core/level-v2';
import { renderLevelAscii } from '../src/core/level-ascii';
import { legacyLevelToV2 } from '../src/core/legacy-import';
import { idleOutcome, solveLevel } from '../src/core/solver';

const [command, ...args] = process.argv.slice(2);

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`${file}: ${(error as Error).message}`);
    process.exit(1);
  }
}

function validate(files: string[]): void {
  let failed = false;
  for (const file of files) {
    try {
      const { warnings } = compileLevel(readJson(file));
      console.log(`${file}: OK${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);
      warnings.forEach(issue => console.log(`  warning: ${issue.message}`));
    } catch (error) {
      if (!(error instanceof LevelError)) throw error;
      failed = true;
      console.log(`${file}: FAILED`);
      error.issues.forEach(issue => console.log(`  ${issue.severity}: ${issue.message}`));
    }
  }
  process.exit(failed ? 1 : 0);
}

function render(files: string[]): void {
  for (const file of files) {
    console.log(`${file}\n${renderLevelAscii(compileLevel(readJson(file)))}`);
  }
}

function solve(files: string[]): void {
  let failed = false;
  for (const file of files) {
    const started = Date.now();
    const { legacy } = compileLevel(readJson(file));
    const idle = idleOutcome(legacy);
    console.log(`${file}: without clicks — ${idle.status} at tick ${idle.tick}`);
    if (idle.status === 'won') {
      failed = true;
      console.log(`  error: the level is won without any clicks`);
      continue;
    }
    const result = solveLevel(legacy);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (result.actions) {
      const clicks = result.actions.map(a => `(${a.x},${a.y})@${a.tick}`).join(' ') || 'no clicks needed';
      console.log(`${file}: solved with ${result.actions.length} click(s), won at tick ${result.wonAtTick}: ${clicks} [${seconds}s, ${result.expanded} states]`);
      console.log(`  actions: ${JSON.stringify(result.actions)}`);
    } else {
      failed = true;
      console.log(`${file}: no solution found [${seconds}s, ${result.expanded} states]`);
    }
  }
  process.exit(failed ? 1 : 0);
}

function migrate(): void {
  // Разовая миграция: исходные уровни — замороженная копия legacy levels.js
  const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'golden', '__golden__', 'legacy-levels.json'), 'utf8'));
  legacy.forEach((level: Parameters<typeof legacyLevelToV2>[0], index: number) => {
    const file = path.join(__dirname, '..', 'levels', `${String(index + 1).padStart(2, '0')}.json`);
    fs.writeFileSync(file, formatLevelJson(legacyLevelToV2(level)));
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  });
}

switch (command) {
  case 'validate':
    validate(args);
    break;
  case 'render':
    render(args);
    break;
  case 'solve':
    solve(args);
    break;
  case 'migrate':
    migrate();
    break;
  default:
    console.log('usage: level validate|render|solve <file.json...> | level migrate');
    process.exit(command ? 1 : 0);
}
