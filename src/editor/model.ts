// Модель редактора уровней: состояние, операции над ним, перевод в формат v2 и обратно. Без DOM.
import { CELL_TYPES, GRID_HEIGHT, GRID_WIDTH, type CellType } from '../constants';
import { isSwitchCell, legacySymbolForToken, LEGACY_CELL_CONNECTIONS } from '../core/legacy-import';
import { compileLevel, LevelError, type CompiledLevel, type LevelV2 } from '../core/level-v2';
import { formatToken, parseToken, type Side, type TrackIssue } from '../core/track';
import type { WagonType } from '../types';

export interface EditorTrain {
  x: number;
  y: number;
  heading: Side;
  wagons: WagonType[];
}

export interface EditorState {
  // Символы старого формата: ими рисуются клетки и помечены инструменты палитры
  grid: CellType[][];
  // Стрелки, стоящие на старте «ответвлением»; остальные — «прямо»
  divergingSwitches: { x: number; y: number }[];
  semaphores: { x: number; y: number; isOpen: boolean }[];
  trains: EditorTrain[];
  station: { x: number; y: number } | null;
}

const HEADINGS: Side[] = ['E', 'S', 'W', 'N'];
const at = (x: number, y: number) => (item: { x: number; y: number }) => item.x === x && item.y === y;
const notAt = (x: number, y: number) => (item: { x: number; y: number }) => !(item.x === x && item.y === y);

export function emptyState(width = GRID_WIDTH, height = GRID_HEIGHT): EditorState {
  return {
    grid: Array.from({ length: height }, () => Array.from({ length: width }, () => CELL_TYPES.EMPTY as CellType)),
    divergingSwitches: [],
    semaphores: [],
    trains: [],
    station: null,
  };
}

// Клетка рельсов. Повторный клик той же стрелкой меняет её начальное положение.
export function placeTrack(state: EditorState, x: number, y: number, symbol: CellType): void {
  if (state.grid[y][x] === symbol && isSwitchCell(symbol)) {
    const diverging = state.divergingSwitches.some(at(x, y));
    state.divergingSwitches = state.divergingSwitches.filter(notAt(x, y));
    if (!diverging) state.divergingSwitches.push({ x, y });
    return;
  }
  state.grid[y][x] = symbol;
  state.divergingSwitches = state.divergingSwitches.filter(notAt(x, y));
}

// Семафор по кругу: нет → открыт → закрыт → нет
export function cycleSemaphore(state: EditorState, x: number, y: number): void {
  const semaphore = state.semaphores.find(at(x, y));
  if (!semaphore) {
    state.semaphores.push({ x, y, isOpen: true });
  } else if (semaphore.isOpen) {
    semaphore.isOpen = false;
  } else {
    state.semaphores = state.semaphores.filter(notAt(x, y));
  }
}

export function setStation(state: EditorState, x: number, y: number): void {
  state.station = state.station && at(x, y)(state.station) ? null : { x, y };
}

// Новый локомотив едет на восток; клик по существующему поворачивает его на 90° по часовой
export function placeLocomotive(state: EditorState, x: number, y: number): void {
  const train = state.trains.find(at(x, y));
  if (train) {
    train.heading = HEADINGS[(HEADINGS.indexOf(train.heading) + 1) % HEADINGS.length];
  } else {
    state.trains.push({ x, y, heading: 'E', wagons: [] });
  }
}

export function addWagon(state: EditorState, trainIndex: number, wagonType: WagonType): void {
  state.trains[trainIndex]?.wagons.push(wagonType);
}

// Удаляет объекты в клетке: локомотив — вместе с поездом, вагон (по скомпилированным позициям) — последний вагон поезда
export function removeObjectsAt(state: EditorState, x: number, y: number, compiled?: CompiledLevel): void {
  state.semaphores = state.semaphores.filter(notAt(x, y));
  if (state.station && at(x, y)(state.station)) state.station = null;
  const trainIndex = state.trains.findIndex(at(x, y));
  if (trainIndex !== -1) {
    state.trains.splice(trainIndex, 1);
    return;
  }
  const wagonTrain = compiled ? trainIndexAt(compiled, x, y) : -1;
  if (wagonTrain !== -1) state.trains[wagonTrain].wagons.pop();
}

// Номер поезда, часть которого (по скомпилированному уровню) стоит в клетке
export function trainIndexAt(compiled: CompiledLevel, x: number, y: number): number {
  return compiled.legacy.trains.findIndex(parts => parts.some(at(x, y)));
}

export function toV2(state: EditorState): LevelV2 {
  const level = {
    $schema: './level.schema.json',
    version: 2,
    grid: state.grid.map(row => row.map(symbol => formatToken(LEGACY_CELL_CONNECTIONS[symbol] ?? []))),
    semaphores: state.semaphores.map(s => ({ at: [s.x, s.y], initial: s.isOpen ? 'open' : 'closed' })),
    trains: state.trains.map(t => ({ at: [t.x, t.y], heading: t.heading, wagons: [...t.wagons] })),
    // Станции может ещё не быть: компилятор сообщит об этом
    ...(state.station ? { station: [state.station.x, state.station.y] } : {}),
  } as LevelV2;
  if (state.divergingSwitches.length > 0) {
    level.switches = state.divergingSwitches.map(s => ({ at: [s.x, s.y], initial: 'diverging' }));
  }
  return level;
}

// Загрузка v2 без полной проверки: даже уровень с ошибками открывается, чтобы их можно было исправить
export function fromV2(input: unknown): EditorState {
  if (typeof input !== 'object' || input === null) throw new Error('level must be a JSON object');
  const level = input as Partial<LevelV2>;
  if (!Array.isArray(level.grid)) throw new Error('"grid" must be an array of rows');
  const grid = level.grid.map((row, y) => {
    if (!Array.isArray(row)) throw new Error(`grid row ${y} must be an array`);
    return row.map((token, x) => {
      const symbol = legacySymbolForToken(formatToken(parseToken(String(token)).connections));
      if (symbol === undefined) throw new Error(`cell (${x},${y}) "${token}" is not supported by the editor`);
      return symbol;
    });
  });
  const point = (value: unknown) => (Array.isArray(value) && value.length === 2 ? { x: Number(value[0]), y: Number(value[1]) } : null);
  return {
    grid,
    divergingSwitches: (level.switches ?? []).filter(s => s.initial === 'diverging').map(s => point(s.at)!).filter(Boolean),
    semaphores: (level.semaphores ?? []).map(s => ({ ...point(s.at)!, isOpen: s.initial !== 'closed' })),
    trains: (level.trains ?? []).map(t => ({ ...point(t.at)!, heading: t.heading, wagons: [...(t.wagons ?? [])] })),
    station: point(level.station),
  };
}

export interface ValidationResult {
  compiled: CompiledLevel | null;
  issues: TrackIssue[];
}

export function validate(state: EditorState): ValidationResult {
  try {
    const compiled = compileLevel(toV2(state));
    return { compiled, issues: compiled.warnings };
  } catch (error) {
    if (error instanceof LevelError) return { compiled: null, issues: error.issues };
    throw error;
  }
}
