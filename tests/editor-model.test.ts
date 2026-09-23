import { describe, expect, test } from 'vitest';
import { CELL_TYPES } from '../src/constants';
import { legacyLevelToV2 } from '../src/core/legacy-import';
import { compileLevel, formatLevelJson } from '../src/core/level-v2';
import {
  addWagon,
  cycleSemaphore,
  emptyState,
  fromV2,
  placeLocomotive,
  placeTrack,
  removeObjectsAt,
  setStation,
  toV2,
  trainIndexAt,
  validate,
} from '../src/editor/model';
import { levels } from '../src/levels';

describe('модель редактора: круговой перевод', () => {
  levels.forEach((level, index) => {
    test(`уровень ${index + 1}: v2 → редактор → v2 без потерь`, () => {
      const v2 = legacyLevelToV2(level);
      const roundTrip = toV2(fromV2(v2));
      expect(formatLevelJson(roundTrip)).toBe(formatLevelJson(v2));
      expect(compileLevel(roundTrip).legacy).toEqual(level);
    });
  });
});

describe('модель редактора: операции', () => {
  // Прямая в строке 1 от x=0 до x=14
  function straightLine() {
    const state = emptyState();
    for (let x = 0; x < 15; x++) placeTrack(state, x, 1, CELL_TYPES.RAIL_H);
    return state;
  }

  test('пустой уровень: понятные ошибки', () => {
    const { compiled, issues } = validate(emptyState());
    expect(compiled).toBeNull();
    expect(issues.map(i => i.message)).toEqual(['"station" is required', '"trains" must be a non-empty array']);
  });

  test('минимальный корректный уровень', () => {
    const state = straightLine();
    placeLocomotive(state, 3, 1);
    setStation(state, 10, 1);
    const { compiled, issues } = validate(state);
    expect(compiled).not.toBeNull();
    // Прямая упирается в края поля
    expect(issues.map(i => i.severity)).toEqual(['warning', 'warning']);
  });

  test('повторный клик стрелкой меняет её начальное положение', () => {
    const state = emptyState();
    placeTrack(state, 5, 3, CELL_TYPES.SWITCH_RIGHT_DOWN_H);
    expect(state.divergingSwitches).toEqual([]);
    placeTrack(state, 5, 3, CELL_TYPES.SWITCH_RIGHT_DOWN_H);
    expect(state.divergingSwitches).toEqual([{ x: 5, y: 3 }]);
    expect(toV2(state).switches).toEqual([{ at: [5, 3], initial: 'diverging' }]);
    placeTrack(state, 5, 3, CELL_TYPES.RAIL_H);
    expect(state.divergingSwitches).toEqual([]);
  });

  test('семафор: открыт → закрыт → удалён', () => {
    const state = emptyState();
    cycleSemaphore(state, 2, 1);
    expect(state.semaphores).toEqual([{ x: 2, y: 1, isOpen: true }]);
    cycleSemaphore(state, 2, 1);
    expect(state.semaphores).toEqual([{ x: 2, y: 1, isOpen: false }]);
    cycleSemaphore(state, 2, 1);
    expect(state.semaphores).toEqual([]);
  });

  test('клик по локомотиву поворачивает его', () => {
    const state = emptyState();
    placeLocomotive(state, 3, 1);
    expect(state.trains[0].heading).toBe('E');
    placeLocomotive(state, 3, 1);
    expect(state.trains[0].heading).toBe('S');
    placeLocomotive(state, 3, 1);
    placeLocomotive(state, 3, 1);
    placeLocomotive(state, 3, 1);
    expect(state.trains[0].heading).toBe('E');
  });

  test('вагоны встают за локомотивом, удаление по правому клику', () => {
    const state = straightLine();
    placeLocomotive(state, 5, 1);
    setStation(state, 12, 1);
    addWagon(state, 0, 'wagon1');
    addWagon(state, 0, 'wagon2');
    const { compiled } = validate(state);
    expect(compiled?.legacy.trains[0].map(p => [p.x, p.y])).toEqual([[5, 1], [4, 1], [3, 1]]);
    expect(trainIndexAt(compiled!, 3, 1)).toBe(0);
    // Правый клик по вагону убирает последний вагон, по локомотиву — весь поезд
    removeObjectsAt(state, 3, 1, compiled!);
    expect(state.trains[0].wagons).toEqual(['wagon1']);
    removeObjectsAt(state, 5, 1);
    expect(state.trains).toEqual([]);
  });

  test('импорт неподдерживаемой клетки — понятная ошибка', () => {
    const v2 = toV2(emptyState());
    v2.grid[0][0] = 'NE+NW';
    expect(() => fromV2(v2)).toThrow('cell (0,0) "NE+NW" is not supported by the editor');
  });
});
