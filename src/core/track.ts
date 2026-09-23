// Топология путей: клетка = набор соединений между её сторонами (FIXIN-PLAN.md §3.1, §4).
// Соединение — пара сторон, по которой поезд проходит клетку, например E–W (прямая) или S–W (поворот).

export const SIDES = ['N', 'E', 'S', 'W'] as const;
export type Side = (typeof SIDES)[number];

// Пара сторон в каноническом порядке N, E, S, W: 'EW', 'NS', 'SW', ...
export type Connection = `${Side}${Side}`;

export const OPPOSITE: Record<Side, Side> = { N: 'S', E: 'W', S: 'N', W: 'E' };

export const SIDE_OFFSET: Record<Side, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

export type TrackKind = 'empty' | 'straight' | 'turn' | 'switch' | 'crossing';

export interface TrackCell {
  readonly connections: readonly Connection[];
}

export interface TrackMap {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly (readonly TrackCell[])[];
}

const sideOrder = (side: Side): number => SIDES.indexOf(side);

function isSide(value: string): value is Side {
  return (SIDES as readonly string[]).includes(value);
}

export function connection(a: Side, b: Side): Connection {
  return (sideOrder(a) <= sideOrder(b) ? `${a}${b}` : `${b}${a}`) as Connection;
}

export function connectionSides(value: Connection): [Side, Side] {
  return [value[0] as Side, value[1] as Side];
}

export const isStraightConnection = (value: Connection): boolean => value === 'EW' || value === 'NS';

export interface TokenParseResult {
  connections: Connection[];
  // Токен записан не в каноническом виде (например, 'WE' вместо 'EW'): не ошибка, но редактор так не пишет
  nonCanonical: boolean;
}

// Токен клетки формата v2: '' — пусто, 'EW' — прямая, 'EW+SW' — стрелка, 'EW+NS' — пересечение
export function parseToken(token: string): TokenParseResult {
  if (token.trim() === '') {
    return { connections: [], nonCanonical: token !== '' };
  }
  const parts = token.split('+');
  const connections: Connection[] = [];
  let nonCanonical = false;
  for (const part of parts) {
    if (part.length !== 2 || !isSide(part[0]) || !isSide(part[1])) {
      throw new Error(`bad connection "${part}" in token "${token}": expected two of N, E, S, W`);
    }
    if (part[0] === part[1]) {
      throw new Error(`bad connection "${part}" in token "${token}": a side cannot connect to itself`);
    }
    const canonical = connection(part[0], part[1]);
    if (canonical !== part) nonCanonical = true;
    if (connections.includes(canonical)) {
      throw new Error(`duplicate connection "${canonical}" in token "${token}"`);
    }
    connections.push(canonical);
  }
  return { connections, nonCanonical };
}

// Канонический токен: прямая ветка стрелки первой, затем по порядку сторон
export function formatToken(connections: readonly Connection[]): string {
  return [...connections]
    .sort((a, b) => Number(isStraightConnection(b)) - Number(isStraightConnection(a)) || a.localeCompare(b, 'en'))
    .join('+');
}

export type CellShape =
  | { kind: 'empty' }
  | { kind: 'straight' | 'turn'; connection: Connection }
  | { kind: 'crossing'; connections: [Connection, Connection] }
  // root — общая сторона ("корень"), straight — прямая ветка (если есть), diverging — боковая
  | { kind: 'switch'; root: Side; straight: Connection; diverging: Connection };

export function classifyCell(connections: readonly Connection[]): CellShape {
  if (connections.length === 0) return { kind: 'empty' };
  if (connections.length === 1) {
    const only = connections[0];
    return { kind: isStraightConnection(only) ? 'straight' : 'turn', connection: only };
  }
  if (connections.length !== 2) {
    throw new Error(`${connections.length} connections in one cell (${connections.join('+')}): at most 2 are allowed`);
  }
  const [a, b] = connections;
  const shared = connectionSides(a).filter(side => connectionSides(b).includes(side));
  if (shared.length === 0) {
    if (isStraightConnection(a) && isStraightConnection(b)) {
      return { kind: 'crossing', connections: [a, b] };
    }
    throw new Error(`connections ${a} and ${b} neither share a side (switch) nor cross straight (crossing)`);
  }
  const root = shared[0];
  // У стрелки ровно одна прямая ветка: две дуги с общим корнем (например, NE+NW) не поддерживаются движком
  const straight = [a, b].find(isStraightConnection);
  if (!straight) {
    throw new Error(`switch ${a}+${b} has no straight branch (two curves from one side are not supported)`);
  }
  const diverging = straight === a ? b : a;
  return { kind: 'switch', root, straight, diverging };
}

export interface TrackIssue {
  severity: 'error' | 'warning';
  x: number;
  y: number;
  message: string;
}

const describeCell = (map: TrackMap, x: number, y: number): string =>
  `cell (${x},${y}) "${formatToken(map.cells[y][x].connections)}"`;

// Стыковка: у каждой стороны, из которой выходит путь, у соседа должна быть противоположная сторона.
// Путь, упирающийся в край поля, — предупреждение: так сделаны ловушки в существующих уровнях.
export function validateTrackMap(map: TrackMap): TrackIssue[] {
  const issues: TrackIssue[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = map.cells[y][x];
      try {
        classifyCell(cell.connections);
      } catch (error) {
        issues.push({ severity: 'error', x, y, message: `${describeCell(map, x, y)}: ${(error as Error).message}` });
        continue;
      }
      const sides = new Set(cell.connections.flatMap(connectionSides));
      for (const side of sides) {
        const nx = x + SIDE_OFFSET[side].dx;
        const ny = y + SIDE_OFFSET[side].dy;
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
          issues.push({ severity: 'warning', x, y, message: `${describeCell(map, x, y)}: exits ${side} off the field` });
          continue;
        }
        const neighbour = map.cells[ny][nx];
        const neighbourSides = new Set(neighbour.connections.flatMap(connectionSides));
        if (!neighbourSides.has(OPPOSITE[side])) {
          issues.push({
            severity: 'error',
            x,
            y,
            message: `${describeCell(map, x, y)}: exits ${side}, but ${describeCell(map, nx, ny)} has no ${OPPOSITE[side]}`,
          });
        }
      }
    }
  }
  return issues;
}

export function trackMapToTokens(map: TrackMap): string[][] {
  return map.cells.map(row => row.map(cell => formatToken(cell.connections)));
}

export function tokensToTrackMap(tokens: readonly (readonly string[])[]): TrackMap {
  const height = tokens.length;
  const width = height > 0 ? tokens[0].length : 0;
  tokens.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`row ${y} has ${row.length} cells, expected ${width}`);
    }
  });
  return {
    width,
    height,
    cells: tokens.map((row, y) =>
      row.map((token, x) => {
        try {
          return { connections: parseToken(token).connections };
        } catch (error) {
          throw new Error(`cell (${x},${y}): ${(error as Error).message}`, { cause: error });
        }
      })
    ),
  };
}
