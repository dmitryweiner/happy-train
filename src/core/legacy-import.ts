// Импорт старого формата уровней (символы псевдографики) в топологию путей.
import { CELL_TYPES, type CellType } from '../constants';
import type { Connection, TrackMap } from './track';

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
