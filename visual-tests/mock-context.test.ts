import { describe, test, expect } from 'vitest';
import { CELL_SIZE, CELL_TYPES } from '../src/constants';
import { drawCell } from '../src/render/graphics';

// Функция для создания контекста-заглушки
function createMockContext() {
  const calls: unknown[][] = [];
  const ctx = {
    calls,
    strokeStyle: '' as unknown,
    fillStyle: '' as unknown,
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    beginPath() { calls.push(['beginPath']); },
    closePath() { calls.push(['closePath']); },
    moveTo(x: number, y: number) { calls.push(['moveTo', x, y]); },
    lineTo(x: number, y: number) { calls.push(['lineTo', x, y]); },
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
      calls.push(['arc', x, y, radius, startAngle, endAngle]);
    },
    stroke() { calls.push(['stroke']); },
    fill() { calls.push(['fill']); },
    setLineDash(segments: number[]) { calls.push(['setLineDash', segments]); },
    translate(x: number, y: number) { calls.push(['translate', x, y]); },
    rotate(angle: number) { calls.push(['rotate', angle]); },
    fillRect(x: number, y: number, width: number, height: number) { calls.push(['fillRect', x, y, width, height]); },
    strokeRect(x: number, y: number, width: number, height: number) { calls.push(['strokeRect', x, y, width, height]); },
    fillText(text: string, x: number, y: number) { calls.push(['fillText', text, x, y]); },
  };
  return ctx;
}

describe('Mock Context Tests', () => {
  test('drawCell with RAIL_H calls expected methods', () => {
    const ctx = createMockContext();
    
    drawCell(ctx, 0, 0, CELL_TYPES.RAIL_H);
    
    // Проверяем вызовы для отрисовки горизонтальных рельсов
    expect(ctx.calls.some(call => call[0] === 'beginPath')).toBeTruthy(); // beginPath был вызван
    
    // Проверяем, что были вызовы moveTo и lineTo для рельсов
    const moveToCall = ctx.calls.some(call => 
      call[0] === 'moveTo' && 
      call[1] === 0 // x координата левого края
    );
    expect(moveToCall).toBeTruthy();
    
    const lineToCall = ctx.calls.some(call => 
      call[0] === 'lineTo' && 
      call[1] === CELL_SIZE // x координата правого края
    );
    expect(lineToCall).toBeTruthy();
    
    // Проверяем, что был вызван stroke
    expect(ctx.calls.some(call => call[0] === 'stroke')).toBeTruthy();
  });
  
  test('drawCell with TURN_RIGHT_DOWN calls arc method', () => {
    const ctx = createMockContext();
    
    drawCell(ctx, 0, 0, CELL_TYPES.TURN_RIGHT_DOWN);
    
    // Проверяем, что вызывается метод arc для рисования дуги
    const arcCalls = ctx.calls.filter(call => call[0] === 'arc');
    expect(arcCalls.length).toBeGreaterThan(0); // Должен быть хотя бы один вызов arc
    
    // Проверяем, что центр дуги находится в правильном месте
    // Для TURN_RIGHT_DOWN центр должен быть в нижнем левом углу клетки
    const correctArcCenter = arcCalls.some(call => 
      call[0] === 'arc' && 
      call[1] === 0 && // x координата центра в левом краю
      call[2] === CELL_SIZE // y координата центра в нижнем краю
    );
    expect(correctArcCenter).toBeTruthy();
  });
  
  test('drawCell with EMPTY does not call drawing methods', () => {
    const ctx = createMockContext();
    
    drawCell(ctx, 0, 0, CELL_TYPES.EMPTY);
    
    // Проверяем, что не было вызовов методов рисования
    expect(ctx.calls.length).toBe(0);
  });
}); 