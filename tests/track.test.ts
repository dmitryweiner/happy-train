import { describe, expect, test } from 'vitest';
import { CELL_SIZE, CELL_TYPES, DIRECTIONS, type CellType } from '../src/constants';
import { LEGACY_CELL_CONNECTIONS, legacyGridToTrackMap } from '../src/core/legacy-import';
import { calculateNextPosition, isSwitchCell } from '../src/core/movement';
import {
  classifyCell,
  connectionSides,
  formatToken,
  OPPOSITE,
  parseToken,
  tokensToTrackMap,
  validateTrackMap,
  type Side,
} from '../src/core/track';

describe('parseToken / formatToken', () => {
  test('разбирает прямую, поворот, стрелку и пересечение', () => {
    expect(parseToken('').connections).toEqual([]);
    expect(parseToken('EW').connections).toEqual(['EW']);
    expect(parseToken('SW').connections).toEqual(['SW']);
    expect(parseToken('EW+SW').connections).toEqual(['EW', 'SW']);
    expect(parseToken('EW+NS').connections).toEqual(['EW', 'NS']);
  });

  test('принимает неканонический порядок букв, но помечает его', () => {
    expect(parseToken('WE')).toEqual({ connections: ['EW'], nonCanonical: true });
    expect(parseToken('EW')).toEqual({ connections: ['EW'], nonCanonical: false });
  });

  test('отклоняет мусор', () => {
    expect(() => parseToken('EX')).toThrow(/bad connection "EX"/);
    expect(() => parseToken('EE')).toThrow(/cannot connect to itself/);
    expect(() => parseToken('EW+WE')).toThrow(/duplicate connection "EW"/);
    expect(() => parseToken('-')).toThrow(/bad connection/);
  });

  test('каноническая запись: прямая ветка первой', () => {
    expect(formatToken(['SW', 'EW'])).toBe('EW+SW');
    expect(formatToken(['NS', 'EW'])).toBe('EW+NS');
    expect(formatToken(['ES', 'NS'])).toBe('NS+ES');
    expect(formatToken([])).toBe('');
  });
});

describe('classifyCell', () => {
  test('виды клеток', () => {
    expect(classifyCell([])).toEqual({ kind: 'empty' });
    expect(classifyCell(['EW'])).toEqual({ kind: 'straight', connection: 'EW' });
    expect(classifyCell(['NE'])).toEqual({ kind: 'turn', connection: 'NE' });
    expect(classifyCell(['EW', 'NS'])).toEqual({ kind: 'crossing', connections: ['EW', 'NS'] });
    expect(classifyCell(['EW', 'SW'])).toEqual({ kind: 'switch', root: 'W', straight: 'EW', diverging: 'SW' });
    expect(classifyCell(['NS', 'NE'])).toEqual({ kind: 'switch', root: 'N', straight: 'NS', diverging: 'NE' });
  });

  test('недопустимые сочетания', () => {
    expect(() => classifyCell(['NE', 'SW'])).toThrow(/neither share a side/);
    expect(() => classifyCell(['NE', 'NW'])).toThrow(/no straight branch/);
    expect(() => classifyCell(['EW', 'NS', 'NE'])).toThrow(/at most 2/);
  });
});

describe('validateTrackMap', () => {
  test('замкнутое кольцо без замечаний', () => {
    const map = tokensToTrackMap([
      ['ES', 'SW'],
      ['NE', 'NW'],
    ]);
    expect(validateTrackMap(map)).toEqual([]);
  });

  test('несостыкованный сосед — ошибка с координатами', () => {
    const map = tokensToTrackMap([['EW', 'NS', 'EW']]);
    const errors = validateTrackMap(map).filter(issue => issue.severity === 'error');
    expect(errors.map(issue => issue.message)).toContain('cell (0,0) "EW": exits E, but cell (1,0) "NS" has no W');
  });

  test('путь за край поля — предупреждение', () => {
    const issues = validateTrackMap(tokensToTrackMap([['EW']]));
    expect(issues).toEqual([
      { severity: 'warning', x: 0, y: 0, message: 'cell (0,0) "EW": exits E off the field' },
      { severity: 'warning', x: 0, y: 0, message: 'cell (0,0) "EW": exits W off the field' },
    ]);
  });

  test('строки разной длины', () => {
    expect(() => tokensToTrackMap([['EW', 'EW'], ['EW']])).toThrow(/row 1 has 1 cells, expected 2/);
  });
});

// Сверяем таблицу LEGACY_CELL_CONNECTIONS с физикой legacy-движка:
// въезжаем в клетку с каждой стороны и смотрим, с какой стороны поезд из неё выедет.
describe('legacy-символы ↔ соединения: проверка физикой движка', () => {
  const HEADING_INTO: Record<Side, number> = {
    N: DIRECTIONS.down, // въезд с северной стороны — едем вниз
    E: DIRECTIONS.left,
    S: DIRECTIONS.up,
    W: DIRECTIONS.right,
  };
  const ENTRY_POINT: Record<Side, [number, number]> = {
    N: [0.5, 0],
    E: [1, 0.5],
    S: [0.5, 1],
    W: [0, 0.5],
  };

  function exitSide(cellType: CellType, entry: Side, isStraight: boolean): Side | null {
    let x = (1 + ENTRY_POINT[entry][0]) * CELL_SIZE;
    let y = (1 + ENTRY_POINT[entry][1]) * CELL_SIZE;
    // Сдвигаемся внутрь клетки на полпикселя, чтобы стоять в ней, а не на границе
    x += Math.cos(HEADING_INTO[entry]) * 0.5;
    y += Math.sin(HEADING_INTO[entry]) * 0.5;
    let direction: number = HEADING_INTO[entry];
    for (let i = 0; i < 1000; i++) {
      const next = calculateNextPosition(cellType, 1, 1, x, y, direction, 1, 0.005, isSwitchCell(cellType) ? isStraight : undefined);
      x = next.x;
      y = next.y;
      direction = next.direction;
      const cx = Math.floor(x / CELL_SIZE);
      const cy = Math.floor(y / CELL_SIZE);
      if (cx !== 1 || cy !== 1) {
        if (cx === 1 && cy === 0) return 'N';
        if (cx === 2 && cy === 1) return 'E';
        if (cx === 1 && cy === 2) return 'S';
        if (cx === 0 && cy === 1) return 'W';
        return null;
      }
    }
    return null;
  }

  function expectedExits(cellType: CellType, entry: Side): { straight: Side; turn: Side } | null {
    const connections = LEGACY_CELL_CONNECTIONS[cellType];
    const matching = connections.filter(c => connectionSides(c).includes(entry));
    if (matching.length === 0) return null;
    const other = (c: (typeof connections)[number]) => connectionSides(c).find(side => side !== entry) as Side;
    if (matching.length === 1) {
      return { straight: other(matching[0]), turn: other(matching[0]) };
    }
    // Въезд в корень стрелки: выход зависит от её положения
    const shape = classifyCell(connections);
    if (shape.kind !== 'switch') throw new Error('unexpected');
    return {
      straight: connectionSides(shape.straight).find(side => side !== entry) as Side,
      turn: connectionSides(shape.diverging).find(side => side !== entry) as Side,
    };
  }

  const cellTypes = Object.values(CELL_TYPES).filter(cellType => cellType !== CELL_TYPES.EMPTY);
  for (const cellType of cellTypes) {
    for (const entry of ['N', 'E', 'S', 'W'] as const) {
      const expected = expectedExits(cellType, entry);
      if (!expected) continue; // с этой стороны в клетку не въехать
      test(`"${cellType}": въезд ${entry}`, () => {
        expect(exitSide(cellType, entry, true)).toBe(expected.straight);
        expect(exitSide(cellType, entry, false)).toBe(expected.turn);
        // Выход не может совпадать со стороной въезда
        expect(expected.straight).not.toBe(entry);
        expect(OPPOSITE[entry]).toBeDefined();
      });
    }
  }
});

describe('legacyGridToTrackMap', () => {
  test('переводит грид и падает на неизвестном символе', () => {
    const map = legacyGridToTrackMap([[CELL_TYPES.RAIL_H, CELL_TYPES.SWITCH_RIGHT_DOWN_H]]);
    expect(map.cells[0].map(cell => formatToken(cell.connections))).toEqual(['EW', 'EW+SW']);
    expect(() => legacyGridToTrackMap([['x' as CellType]])).toThrow(/unknown legacy cell "x"/);
  });
});
