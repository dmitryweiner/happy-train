const { drawCell } = require('../graphics');

// Функция для создания контекста-заглушки
function createMockContext() {
  return {
    calls: [],
    save() { this.calls.push(['save']); },
    restore() { this.calls.push(['restore']); },
    beginPath() { this.calls.push(['beginPath']); },
    moveTo(x, y) { this.calls.push(['moveTo', x, y]); },
    lineTo(x, y) { this.calls.push(['lineTo', x, y]); },
    arc(x, y, radius, startAngle, endAngle) { 
      this.calls.push(['arc', x, y, radius, startAngle, endAngle]); 
    },
    stroke() { this.calls.push(['stroke']); },
    fill() { this.calls.push(['fill']); },
    translate(x, y) { this.calls.push(['translate', x, y]); },
    rotate(angle) { this.calls.push(['rotate', angle]); },
    fillRect(x, y, width, height) { this.calls.push(['fillRect', x, y, width, height]); },
    strokeRect(x, y, width, height) { this.calls.push(['strokeRect', x, y, width, height]); },
    fillText(text, x, y) { this.calls.push(['fillText', text, x, y]); },
    clearMethod() { this.calls = []; }
  };
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