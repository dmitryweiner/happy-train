// Импорт старого формата уровней (символы псевдографики) в топологию путей.
import { CELL_TYPES, type CellType } from '../constants';
import type { LegacyLevel } from '../types';
import type { LevelV2 } from './level-v2';
import { formatToken, type Connection, type Side, type TrackMap } from './track';

// Геометрия поворотов совпадает с movement.ts: например, "┐" — дуга с центром в левом нижнем углу, соединяет W и S.
export const LEGACY_CELL_CONNECTIONS: Record<CellType, readonly Connection[]> = {
  [CELL_TYPES.EMPTY]: [],
  [CELL_TYPES.RAIL_H]: ['EW'],
  [CELL_TYPES.RAIL_V]: ['NS'],
  [CELL_TYPES.RAIL_H_V]: ['EW', 'NS'],
  [CELL_TYPES.TURN_RIGHT_DOWN]: ['SW'],
  [CELL_TYPES.TURN_LEFT_DOWN]: ['ES'],
  [CELL_TYPES.TURN_LEFT_UP]: ['NW'],
  [CELL_TYPES.TURN_RIGHT_UP]: ['NE'],
  [CELL_TYPES.SWITCH_RIGHT_DOWN_V]: ['NS', 'SW'],
  [CELL_TYPES.SWITCH_LEFT_DOWN_V]: ['NS', 'ES'],
  [CELL_TYPES.SWITCH_LEFT_UP_V]: ['NS', 'NW'],
  [CELL_TYPES.SWITCH_RIGHT_UP_V]: ['NS', 'NE'],
  [CELL_TYPES.SWITCH_RIGHT_DOWN_H]: ['EW', 'SW'],
  [CELL_TYPES.SWITCH_LEFT_DOWN_H]: ['EW', 'ES'],
  [CELL_TYPES.SWITCH_LEFT_UP_H]: ['EW', 'NW'],
  [CELL_TYPES.SWITCH_RIGHT_UP_H]: ['EW', 'NE'],
};

// Стрелка в старом формате — два символа: "┐|", "-┌" ...
export function isSwitchCell(cellType: string): boolean {
  return (LEGACY_CELL_CONNECTIONS[cellType as CellType]?.length ?? 0) === 2 && cellType !== CELL_TYPES.RAIL_H_V;
}

export function legacyGridToTrackMap(grid: readonly (readonly CellType[])[]): TrackMap {
  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  return {
    width,
    height,
    cells: grid.map((row, y) =>
      row.map((cellType, x) => {
        const connections = LEGACY_CELL_CONNECTIONS[cellType];
        if (!connections) {
          throw new Error(`cell (${x},${y}): unknown legacy cell "${cellType}"`);
        }
        return { connections };
      })
    ),
  };
}

// Направление в радианах → сторона, куда едет часть поезда (допуск — на случай неточной записи π)
function headingFromDirection(direction: number): Side {
  const quarter = Math.round(direction / (Math.PI / 2));
  const normalized = ((quarter % 4) + 4) % 4;
  if (Math.abs(direction - quarter * (Math.PI / 2)) > 1e-6) {
    throw new Error(`direction ${direction} is not a multiple of 90°`);
  }
  return (['E', 'S', 'W', 'N'] as const)[normalized];
}

// Старый уровень → формат v2. Вагоны в v2 задаются только типами: компилятор сам ставит их за локомотивом.
export function legacyLevelToV2(level: LegacyLevel): LevelV2 {
  const grid = legacyGridToTrackMap(level.grid).cells.map(row => row.map(cell => formatToken(cell.connections)));
  return {
    $schema: './level.schema.json',
    version: 2,
    grid,
    ...(level.switches?.length
      ? { switches: level.switches.map(sw => ({ at: [sw.x, sw.y], initial: sw.isStraight ? 'straight' : 'diverging' })) }
      : {}),
    semaphores: level.semaphores.map(semaphore => ({
      at: [semaphore.x, semaphore.y],
      initial: semaphore.isOpen ? 'open' : 'closed',
    })),
    trains: level.trains.map(train => {
      const [head, ...wagons] = train;
      return {
        at: [head.x, head.y],
        heading: headingFromDirection(head.direction),
        wagons: wagons.map(wagon => {
          if (wagon.type !== 'wagon') throw new Error(`train part at (${wagon.x},${wagon.y}) after the head must be a wagon`);
          return wagon.wagonType;
        }),
      };
    }),
    station: [level.targetPoint.x, level.targetPoint.y],
  };
}
