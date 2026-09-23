// Формат уровня v2 (FIXIN-PLAN.md §4): грид из токенов соединений + объекты с явными координатами.
// compileLevel проверяет уровень и собирает из него LegacyLevel, на котором пока работает движок.
import { DIRECTIONS, GRID_HEIGHT, GRID_WIDTH, type CellType } from '../constants';
import type { LegacyLevel, TrainPartConfig, WagonType } from '../types';
import { LEGACY_CELL_CONNECTIONS } from './legacy-import';
import {
  classifyCell,
  connectionSides,
  formatToken,
  OPPOSITE,
  parseToken,
  SIDE_OFFSET,
  SIDES,
  validateTrackMap,
  type Connection,
  type Side,
  type TrackIssue,
  type TrackMap,
} from './track';

export type Point = [number, number];

export interface LevelV2 {
  $schema?: string;
  version: 2;
  // grid[y][x] — токен клетки: '' | 'EW' | 'SW' | 'EW+SW' | 'EW+NS' ...
  grid: string[][];
  switches?: { at: Point; initial: 'straight' | 'diverging' }[];
  semaphores?: { at: Point; initial: 'open' | 'closed' }[];
  // heading — куда едет поезд (сторона, через которую голова выйдет из своей клетки)
  trains: { at: Point; heading: Side; wagons?: WagonType[] }[];
  station: Point;
}

export interface CompiledLevel {
  legacy: LegacyLevel;
  track: TrackMap;
  warnings: TrackIssue[];
}

export class LevelError extends Error {
  constructor(readonly issues: TrackIssue[]) {
    super(issues.map(issue => `${issue.severity}: ${issue.message}`).join('\n'));
    this.name = 'LevelError';
  }
}

export const HEADING_DIRECTION: Record<Side, number> = {
  E: DIRECTIONS.right,
  S: DIRECTIONS.down,
  W: DIRECTIONS.left,
  N: DIRECTIONS.up,
};

const WAGON_TYPES: readonly string[] = ['wagon1', 'wagon2'];

const LEGACY_BY_TOKEN = new Map<string, CellType>(
  (Object.entries(LEGACY_CELL_CONNECTIONS) as [CellType, readonly Connection[]][]).map(([cellType, connections]) => [
    formatToken(connections),
    cellType,
  ])
);

const isPoint = (value: unknown): value is Point =>
  Array.isArray(value) && value.length === 2 && value.every(n => Number.isInteger(n));

// Разбирает и проверяет уровень. Все найденные ошибки собираются в LevelError сразу, а не по одной.
export function compileLevel(input: unknown): CompiledLevel {
  const errors: TrackIssue[] = [];
  const warnings: TrackIssue[] = [];
  const error = (message: string, x = -1, y = -1) => errors.push({ severity: 'error', x, y, message });
  const warn = (message: string, x = -1, y = -1) => warnings.push({ severity: 'warning', x, y, message });
  const fail = (): never => {
    throw new LevelError([...errors, ...warnings]);
  };

  // --- Общая форма документа
  if (typeof input !== 'object' || input === null) {
    error('level must be a JSON object');
    fail();
  }
  const level = input as Partial<LevelV2> & Record<string, unknown>;
  const known = new Set(['$schema', 'version', 'grid', 'switches', 'semaphores', 'trains', 'station']);
  for (const key of Object.keys(level)) {
    if (!known.has(key)) error(`unknown field "${key}"`);
  }
  if (level.version !== 2) error(`"version" must be 2`);
  if (!Array.isArray(level.grid) || !level.grid.every(row => Array.isArray(row) && row.every(cell => typeof cell === 'string'))) {
    error('"grid" must be an array of rows, each an array of cell tokens (strings)');
    fail();
  }
  const grid = level.grid as string[][];

  // --- Размер поля: движок пока рисует и считает только 15×10
  if (grid.length !== GRID_HEIGHT || grid.some(row => row.length !== GRID_WIDTH)) {
    const widths = [...new Set(grid.map(row => row.length))].join('/');
    error(`grid must be ${GRID_WIDTH}×${GRID_HEIGHT} cells (got ${widths}×${grid.length}); other sizes are not supported yet`);
    fail();
  }

  // --- Клетки и стыковка
  const cells: { connections: Connection[] }[][] = grid.map((row, y) =>
    row.map((token, x) => {
      try {
        const parsed = parseToken(token);
        if (parsed.nonCanonical) {
          warn(`cell (${x},${y}) "${token}" is not canonical, write "${formatToken(parsed.connections)}"`, x, y);
        }
        return { connections: parsed.connections };
      } catch (e) {
        error(`cell (${x},${y}): ${(e as Error).message}`, x, y);
        return { connections: [] };
      }
    })
  );
  const track: TrackMap = { width: GRID_WIDTH, height: GRID_HEIGHT, cells };
  for (const issue of validateTrackMap(track)) {
    (issue.severity === 'error' ? errors : warnings).push(issue);
  }
  if (errors.length > 0) fail();

  const list = <T>(value: T[] | undefined, field: string): T[] => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      error(`"${field}" must be an array`);
      return [];
    }
    return value;
  };

  const shapeAt = (x: number, y: number) => classifyCell(cells[y][x].connections);
  const inField = ([x, y]: Point) => x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT;
  const checkPoint = (what: string, point: unknown): point is Point => {
    if (!isPoint(point)) {
      error(`${what}: "at" must be [x, y] with integer coordinates`);
      return false;
    }
    if (!inField(point)) {
      error(`${what} at (${point[0]},${point[1]}) is outside the ${GRID_WIDTH}×${GRID_HEIGHT} field`, point[0], point[1]);
      return false;
    }
    return true;
  };

  // --- Стрелки: начальное положение
  const switchStates = new Map<string, boolean>();
  for (const [index, sw] of list(level.switches, 'switches').entries()) {
    const what = `switches[${index}]`;
    if (!checkPoint(what, sw?.at)) continue;
    const [x, y] = sw.at;
    if (shapeAt(x, y).kind !== 'switch') {
      error(`${what} at (${x},${y}): cell "${grid[y][x]}" is not a switch`, x, y);
    } else if (sw.initial !== 'straight' && sw.initial !== 'diverging') {
      error(`${what} at (${x},${y}): "initial" must be "straight" or "diverging"`, x, y);
    } else if (switchStates.has(`${x},${y}`)) {
      error(`${what} at (${x},${y}): switch is listed twice`, x, y);
    } else {
      switchStates.set(`${x},${y}`, sw.initial === 'straight');
    }
  }

  // --- Семафоры
  const semaphores: LegacyLevel['semaphores'] = [];
  for (const [index, semaphore] of list(level.semaphores, 'semaphores').entries()) {
    const what = `semaphores[${index}]`;
    if (!checkPoint(what, semaphore?.at)) continue;
    const [x, y] = semaphore.at;
    if (shapeAt(x, y).kind === 'empty') {
      error(`${what} at (${x},${y}): no track in this cell`, x, y);
    } else if (shapeAt(x, y).kind === 'switch') {
      // Клик по такой клетке переключает стрелку, семафор было бы не переключить (§2.3.6)
      error(`${what} at (${x},${y}): a semaphore cannot stand on a switch`, x, y);
    } else if (semaphore.initial !== 'open' && semaphore.initial !== 'closed') {
      error(`${what} at (${x},${y}): "initial" must be "open" or "closed"`, x, y);
    } else if (semaphores.some(s => s.x === x && s.y === y)) {
      error(`${what} at (${x},${y}): semaphore is listed twice`, x, y);
    } else {
      semaphores.push({ x, y, isOpen: semaphore.initial === 'open' });
    }
  }

  // --- Станция
  let station: Point = [0, 0];
  if (checkPoint('station', level.station)) {
    station = level.station as Point;
    if (shapeAt(station[0], station[1]).kind === 'empty') {
      error(`station at (${station[0]},${station[1]}): no track in this cell`, station[0], station[1]);
    }
  }

  // --- Поезда: голова + направление, вагоны расставляются по пути назад
  const occupied = new Map<string, string>();
  const trains: TrainPartConfig[][] = [];
  if (!Array.isArray(level.trains) || level.trains.length === 0) {
    error('"trains" must be a non-empty array');
  }
  for (const [index, train] of (Array.isArray(level.trains) ? level.trains : []).entries()) {
    const what = `trains[${index}]`;
    if (!checkPoint(what, train?.at)) continue;
    const [hx, hy] = train.at;
    if (!(SIDES as readonly unknown[]).includes(train.heading)) {
      error(`${what} at (${hx},${hy}): "heading" must be one of N, E, S, W`, hx, hy);
      continue;
    }
    const wagons = train.wagons ?? [];
    const badWagon = wagons.find(wagon => !WAGON_TYPES.includes(wagon));
    if (!Array.isArray(wagons) || badWagon !== undefined) {
      error(`${what}: "wagons" must be a list of "wagon1" / "wagon2"${badWagon !== undefined ? `, got "${badWagon}"` : ''}`, hx, hy);
      continue;
    }

    // Голова: в клетке должно быть соединение, выходящее на сторону heading
    const headOptions = cells[hy][hx].connections.filter(c => connectionSides(c).includes(train.heading));
    if (headOptions.length === 0) {
      error(`${what} at (${hx},${hy}) heading ${train.heading}: cell "${grid[hy][hx]}" has no track leaving ${train.heading}`, hx, hy);
      continue;
    }
    const pickConnection = (x: number, y: number, side: Side, options: Connection[]): Connection => {
      if (options.length === 1) return options[0];
      // Две ветки через одну сторону — это корень стрелки: берём ветку по её начальному положению
      const shape = shapeAt(x, y);
      if (shape.kind !== 'switch') throw new Error(`ambiguous track at (${x},${y}) through ${side}`);
      return (switchStates.get(`${x},${y}`) ?? true) ? shape.straight : shape.diverging;
    };

    const parts: TrainPartConfig[] = [];
    let x = hx;
    let y = hy;
    let exit: Side = train.heading;
    let ok = true;
    for (let i = 0; i <= wagons.length; i++) {
      const options = cells[y][x].connections.filter(c => connectionSides(c).includes(exit));
      if (options.length === 0) {
        error(`${what}: wagon ${i} would stand at (${x},${y}) "${grid[y][x]}", which has no track towards ${exit}`, x, y);
        ok = false;
        break;
      }
      const through = pickConnection(x, y, exit, options);
      const entry = connectionSides(through).find(side => side !== exit) as Side;
      // Направление части — направление движения на выходе из клетки
      const direction = HEADING_DIRECTION[exit];
      const key = `${x},${y}`;
      if (occupied.has(key)) {
        error(`${what}: cell (${x},${y}) is already taken by ${occupied.get(key)}`, x, y);
        ok = false;
        break;
      }
      occupied.set(key, what);
      parts.push(
        i === 0
          ? { type: 'locomotive', x, y, direction }
          : { type: 'wagon', x, y, direction, wagonType: wagons[i - 1] }
      );
      if (i === wagons.length) break;
      // Следующий вагон — в соседней клетке со стороны въезда
      const nx = x + SIDE_OFFSET[entry].dx;
      const ny = y + SIDE_OFFSET[entry].dy;
      if (!inField([nx, ny]) || cells[ny][nx].connections.length === 0) {
        error(`${what}: not enough track behind the locomotive for ${wagons.length} wagon(s) (stops at (${x},${y}))`, x, y);
        ok = false;
        break;
      }
      x = nx;
      y = ny;
      exit = OPPOSITE[entry];
    }
    if (ok) trains.push(parts);
  }

  if (errors.length > 0) fail();

  const legacyGrid = cells.map((row, y) =>
    row.map((cell, x) => {
      const cellType = LEGACY_BY_TOKEN.get(formatToken(cell.connections));
      if (cellType === undefined) {
        // Все допустимые классификатором клетки есть в таблице; сюда попадать не должны
        throw new Error(`cell (${x},${y}) "${formatToken(cell.connections)}" has no legacy equivalent`);
      }
      return cellType;
    })
  );

  const switches = [...switchStates].map(([key, isStraight]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, isStraight };
  });
  return {
    legacy: {
      grid: legacyGrid,
      semaphores,
      trains,
      targetPoint: { x: station[0], y: station[1] },
      // Поле добавляется, только если положения заданы: так старые уровни компилируются в точности как были
      ...(switches.length > 0 ? { switches } : {}),
    },
    track,
    warnings,
  };
}

// JSON уровня для хранения: строка грида — одна строка файла, чтобы поле читалось как карта
export function formatLevelJson(level: LevelV2): string {
  const width = Math.max(...level.grid.flat().map(token => JSON.stringify(token).length));
  const rows = level.grid.map(row => {
    const cells = row.map((token, i) => (JSON.stringify(token) + (i < row.length - 1 ? ',' : '')).padEnd(width + 2));
    return '    [' + cells.join('').trimEnd() + ']';
  });
  const lines = ['{'];
  const fields: string[] = [];
  if (level.$schema) fields.push(`  "$schema": ${JSON.stringify(level.$schema)}`);
  fields.push(`  "version": ${level.version}`);
  fields.push(`  "grid": [\n${rows.join(',\n')}\n  ]`);
  const list = (items: unknown[]) => (items.length ? `[\n${items.map(item => '    ' + JSON.stringify(item)).join(',\n')}\n  ]` : '[]');
  if (level.switches) fields.push(`  "switches": ${list(level.switches)}`);
  if (level.semaphores) fields.push(`  "semaphores": ${list(level.semaphores)}`);
  fields.push(`  "trains": ${list(level.trains)}`);
  fields.push(`  "station": ${JSON.stringify(level.station)}`);
  lines.push(fields.join(',\n'));
  lines.push('}');
  return lines.join('\n') + '\n';
}
