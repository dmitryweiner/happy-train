// Уровни игры: levels/NN.json в формате v2, по порядку имён файлов.
// Компилируются при загрузке; ошибка в уровне — ошибка сборки/запуска с указанием файла.
import { compileLevel } from './core/level-v2';
import type { LegacyLevel } from './types';

const sources = import.meta.glob<unknown>('../levels/[0-9]*.json', { eager: true, import: 'default' });

export const levelFiles: string[] = Object.keys(sources).sort();

export const levels: LegacyLevel[] = levelFiles.map(file => {
  try {
    return compileLevel(sources[file]).legacy;
  } catch (error) {
    throw new Error(`${file}: ${(error as Error).message}`, { cause: error });
  }
});
