// Редактор уровней: DOM, палитра инструментов, отрисовка. Логика — в model.ts.
import { CELL_SIZE, type CellType } from '../constants';
import { isSwitchCell, legacyLevelToV2 } from '../core/legacy-import';
import { formatLevelJson } from '../core/level-v2';
import { SIDE_DIRECTION } from '../core/geometry';
import { levels } from '../levels';
import {
  drawCell,
  drawSemaphoreCell,
  drawStationIcon,
  drawSwitchCell,
  drawTrainPart,
  generateBackground,
  loadTrainImages,
} from '../render/graphics';
import type { WagonType } from '../types';
import { clientToGridCell } from '../ui/viewport';
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
  type EditorState,
  type ValidationResult,
} from './model';

type ToolType = 'track' | 'semaphore' | 'station' | 'locomotive' | 'wagon1' | 'wagon2';

function requireElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} not found`);
  return element as T;
}

class LevelEditor {
  readonly canvas = requireElement<HTMLCanvasElement>('editorCanvas');
  readonly ctx: CanvasRenderingContext2D;
  readonly configTextarea = requireElement<HTMLTextAreaElement>('level-config');
  readonly issuesPanel = requireElement('level-issues');
  toolType: ToolType | null = null;
  toolValue: string | null = null;
  state: EditorState = emptyState();
  validation: ValidationResult = validate(this.state);
  backgroundCanvas: HTMLCanvasElement;

  constructor() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context is not available');
    this.ctx = ctx;
    this.backgroundCanvas = generateBackground(this.canvas, this.state.grid, false);
    this.setupEventListeners();
    void this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      await loadTrainImages();
    } catch (error) {
      console.error(error);
    }
    this.createToolPreviews();
    this.changed();
  }

  setupEventListeners(): void {
    document.querySelectorAll<HTMLElement>('.tool-item').forEach(item => {
      item.addEventListener('click', () => this.selectTool(item));
    });
    this.canvas.addEventListener('click', e => this.handleCanvasClick(e));
    // Правый клик удаляет объекты в клетке
    this.canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      const cell = this.cellFromEvent(e);
      if (!cell) return;
      removeObjectsAt(this.state, cell.x, cell.y, this.validation.compiled ?? undefined);
      this.changed();
    });
    requireElement('clear-grid').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the entire grid?')) {
        this.state = emptyState();
        this.changed();
      }
    });
    requireElement('load-level').addEventListener('click', () => this.loadLevel());
    requireElement('save-level').addEventListener('click', () => void this.copyConfig());
    requireElement('import-config').addEventListener('click', () => this.importConfig());
    requireElement('export-config').addEventListener('click', () => void this.copyConfig());
  }

  selectTool(toolItem: HTMLElement): void {
    document.querySelectorAll('.tool-item').forEach(item => item.classList.remove('selected'));
    toolItem.classList.add('selected');
    this.toolType = (toolItem.dataset.type ?? null) as ToolType | null;
    this.toolValue = toolItem.dataset.value ?? null;
  }

  // Клетка под курсором с учётом CSS-масштаба канваса (§2.4)
  cellFromEvent(e: MouseEvent): { x: number; y: number } | null {
    const { gridX, gridY } = clientToGridCell(
      e.clientX,
      e.clientY,
      this.canvas.getBoundingClientRect(),
      this.canvas.width,
      this.canvas.height,
      CELL_SIZE
    );
    const height = this.state.grid.length;
    const width = this.state.grid[0]?.length ?? 0;
    if (gridX < 0 || gridY < 0 || gridX >= width || gridY >= height) return null;
    return { x: gridX, y: gridY };
  }

  handleCanvasClick(e: MouseEvent): void {
    const cell = this.cellFromEvent(e);
    if (!cell || !this.toolType) return;
    const { x, y } = cell;
    switch (this.toolType) {
      case 'track':
        placeTrack(this.state, x, y, (this.toolValue ?? ' ') as CellType);
        break;
      case 'semaphore':
        cycleSemaphore(this.state, x, y);
        break;
      case 'station':
        setStation(this.state, x, y);
        break;
      case 'locomotive':
        placeLocomotive(this.state, x, y);
        break;
      case 'wagon1':
      case 'wagon2': {
        // Вагон добавляется в хвост поезда, по части которого кликнули
        const compiled = this.validation.compiled;
        const byHead = this.state.trains.findIndex(t => t.x === x && t.y === y);
        const trainIndex = byHead !== -1 ? byHead : compiled ? trainIndexAt(compiled, x, y) : -1;
        if (trainIndex === -1) {
          this.showMessage('Click a locomotive or a wagon of a train to add a wagon to it');
          return;
        }
        addWagon(this.state, trainIndex, this.toolType as WagonType);
        break;
      }
    }
    this.changed();
  }

  changed(): void {
    this.validation = validate(this.state);
    this.configTextarea.value = formatLevelJson(toV2(this.state));
    this.renderIssues();
    this.render();
  }

  renderIssues(): void {
    const { issues, compiled } = this.validation;
    this.issuesPanel.replaceChildren();
    const summary = document.createElement('p');
    summary.className = compiled ? 'issues-ok' : 'issues-error';
    summary.textContent = compiled
      ? `Level is valid${issues.length ? `, ${issues.length} warning(s)` : ''}`
      : `${issues.filter(i => i.severity === 'error').length} error(s)`;
    this.issuesPanel.append(summary);
    const list = document.createElement('ul');
    for (const issue of issues) {
      const item = document.createElement('li');
      item.className = `issue-${issue.severity}`;
      item.textContent = `${issue.severity}: ${issue.message}`;
      list.append(item);
    }
    this.issuesPanel.append(list);
  }

  showMessage(text: string): void {
    const note = document.createElement('p');
    note.className = 'issues-note';
    note.textContent = text;
    this.issuesPanel.prepend(note);
  }

  render(): void {
    const { ctx, state } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.backgroundCanvas, 0, 0);

    state.grid.forEach((row, y) =>
      row.forEach((cellType, x) => {
        if (state.station?.x === x && state.station.y === y) drawStationIcon(ctx, x, y);
        const semaphore = state.semaphores.find(s => s.x === x && s.y === y);
        if (isSwitchCell(cellType)) {
          const diverging = state.divergingSwitches.some(s => s.x === x && s.y === y);
          drawSwitchCell(ctx, x, y, cellType, !diverging);
        } else if (semaphore) {
          drawSemaphoreCell(ctx, x, y, cellType, semaphore.isOpen);
        } else if (cellType !== ' ') {
          drawCell(ctx, x, y, cellType);
        }
      })
    );

    // Если уровень собирается — поезда с вагонами в вычисленных позициях, иначе только локомотивы
    const compiled = this.validation.compiled;
    if (compiled) {
      compiled.legacy.trains.flat().forEach(part => {
        drawTrainPart(ctx, {
          ...part,
          pixelX: (part.x + 0.5) * CELL_SIZE,
          pixelY: (part.y + 0.5) * CELL_SIZE,
          wagonType: part.type === 'wagon' ? part.wagonType : undefined,
        });
      });
    } else {
      state.trains.forEach(train => {
        drawTrainPart(ctx, {
          type: 'locomotive',
          pixelX: (train.x + 0.5) * CELL_SIZE,
          pixelY: (train.y + 0.5) * CELL_SIZE,
          direction: SIDE_DIRECTION[train.heading],
        });
      });
    }
  }

  createToolPreviews(): void {
    const previewSize = 36;
    document.querySelectorAll<HTMLElement>('.tool-item[data-type="track"]').forEach(toolItem => {
      const preview = toolItem.querySelector('.tool-preview');
      const cellType = toolItem.dataset.value;
      // Empty cell keeps its own styling
      if (!preview || cellType === undefined || cellType === ' ') return;

      const canvas = document.createElement('canvas');
      canvas.width = previewSize;
      canvas.height = previewSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, previewSize, previewSize);
      ctx.save();
      ctx.scale(previewSize / CELL_SIZE, previewSize / CELL_SIZE);
      if (isSwitchCell(cellType)) {
        drawSwitchCell(ctx, 0, 0, cellType, true);
      } else {
        drawCell(ctx, 0, 0, cellType);
      }
      ctx.restore();
      preview.replaceChildren(canvas);
    });
  }

  loadLevel(): void {
    const answer = prompt(`Enter level number (1–${levels.length}):`);
    const number = parseInt(answer ?? '', 10);
    if (number >= 1 && number <= levels.length) {
      this.state = fromV2(legacyLevelToV2(levels[number - 1]));
      this.changed();
    } else if (answer !== null) {
      alert('Invalid level number');
    }
  }

  // Импорт уровня формата v2 из текстового поля: JSON.parse вместо eval (§2.4)
  importConfig(): void {
    try {
      this.state = fromV2(JSON.parse(this.configTextarea.value));
      this.changed();
    } catch (error) {
      alert('Error importing configuration: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async copyConfig(): Promise<void> {
    const text = formatLevelJson(toV2(this.state));
    this.configTextarea.value = text;
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage('Level JSON copied to clipboard — save it as levels/NN.json');
    } catch {
      this.configTextarea.select();
      this.showMessage('Clipboard is not available: the JSON is selected, copy it manually');
    }
  }
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
  (window as unknown as { editor: LevelEditor }).editor = new LevelEditor();
});
