#!/usr/bin/env -S npx tsx
// CLI для уровней формата v2 (FIXIN-PLAN.md §4).
//   yarn level validate levels/03.json [...]   — схема, стыковка путей, объекты; код выхода 1 при ошибках
//   yarn level render levels/03.json           — ASCII-превью поля
//   yarn level migrate                         — перегенерировать levels/*.json из legacy-уровней (разово)
import fs from 'node:fs';
import path from 'node:path';
import { compileLevel, formatLevelJson, LevelError } from '../src/core/level-v2';
import { renderLevelAscii } from '../src/core/level-ascii';
import { legacyLevelToV2 } from '../src/core/legacy-import';

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
  case 'migrate':
    migrate();
    break;
  default:
    console.log('usage: level validate|render <file.json...> | level migrate');
    process.exit(command ? 1 : 0);
}
