// ASCII-превью скомпилированного уровня: для CLI и для сообщений LLM-генератору.
// Клетка — 3 символа. Рельсы — символами старого формата, поверх — объекты:
//   > < ^ v — локомотив и куда он едет, w — вагон, T — станция, S / s — семафор закрыт / открыт.
import { DIRECTIONS } from '../constants';
import type { CompiledLevel } from './level-v2';

const HEAD_ARROW = new Map<number, string>([
  [DIRECTIONS.right, '>'],
  [DIRECTIONS.down, 'v'],
  [DIRECTIONS.left, '<'],
  [DIRECTIONS.up, '^'],
]);

export function renderLevelAscii(compiled: CompiledLevel): string {
  const { legacy } = compiled;
  const overlay = new Map<string, string>();
  for (const semaphore of legacy.semaphores) {
    overlay.set(`${semaphore.x},${semaphore.y}`, semaphore.isOpen ? 's' : 'S');
  }
  overlay.set(`${legacy.targetPoint.x},${legacy.targetPoint.y}`, 'T');
  for (const train of legacy.trains) {
    train.forEach((part, index) => {
      overlay.set(`${part.x},${part.y}`, index === 0 ? (HEAD_ARROW.get(part.direction) ?? 'L') : 'w');
    });
  }

  const width = legacy.grid[0]?.length ?? 0;
  const lines = ['   ' + Array.from({ length: width }, (_, x) => String(x).padStart(3)).join('')];
  legacy.grid.forEach((row, y) => {
    const cells = row.map((cellType, x) => {
      const mark = overlay.get(`${x},${y}`);
      const rail = cellType === ' ' ? ' .' : cellType.padStart(2);
      return mark ? ` ${rail.trim().slice(0, 1) || ' '}${mark}`.slice(-3) : ` ${rail}`;
    });
    lines.push(String(y).padStart(3) + cells.join(''));
  });
  lines.push('legend: > < ^ v locomotive, w wagon, T station, S/s semaphore closed/open, . empty');
  return lines.join('\n');
}
