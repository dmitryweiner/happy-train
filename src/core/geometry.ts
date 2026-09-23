// Геометрия путей: позиция на сегменте (клетка + стороны въезда/выезда + пройденная доля) → пиксели и угол.
// Только для отрисовки и проверки столкновений: в состояние мира результат не записывается.
import { CELL_SIZE, DIRECTIONS } from '../constants';
import { isStraightConnection, connection, type Side } from './track';

export interface Segment {
  x: number;
  y: number;
  from: Side; // сторона въезда
  to: Side; // сторона выезда
  length: number; // длина в единицах пути (см. world.ts)
}

export interface Pose {
  pixelX: number;
  pixelY: number;
  direction: number; // радианы, как DIRECTIONS
}

// Середина стороны клетки в долях клетки
const SIDE_POINT: Record<Side, [number, number]> = {
  N: [0.5, 0],
  E: [1, 0.5],
  S: [0.5, 1],
  W: [0, 0.5],
};

export const SIDE_DIRECTION: Record<Side, number> = {
  E: DIRECTIONS.right,
  S: DIRECTIONS.down,
  W: DIRECTIONS.left,
  N: DIRECTIONS.up,
};

// Угол клетки, общий для двух соседних сторон, — центр дуги поворота
function arcCenter(a: Side, b: Side): [number, number] {
  const [ax, ay] = SIDE_POINT[a];
  const [bx, by] = SIDE_POINT[b];
  // У середины N/S координата x = 0.5, у середины E/W — y = 0.5; центр берёт «крайние» координаты обеих сторон
  return [ax === 0.5 ? bx : ax, ay === 0.5 ? by : ay];
}

export function segmentPose(segment: Segment, offset: number): Pose {
  const t = Math.min(1, Math.max(0, offset / segment.length));
  const left = segment.x * CELL_SIZE;
  const top = segment.y * CELL_SIZE;
  const [fx, fy] = SIDE_POINT[segment.from];
  const [tx, ty] = SIDE_POINT[segment.to];

  if (isStraightConnection(connection(segment.from, segment.to))) {
    return {
      pixelX: left + (fx + (tx - fx) * t) * CELL_SIZE,
      pixelY: top + (fy + (ty - fy) * t) * CELL_SIZE,
      direction: SIDE_DIRECTION[segment.to],
    };
  }

  const [cx, cy] = arcCenter(segment.from, segment.to);
  const startAngle = Math.atan2(fy - cy, fx - cx);
  let endAngle = Math.atan2(ty - cy, tx - cx);
  // Четверть окружности: выбираем обход короче π
  if (endAngle - startAngle > Math.PI) endAngle -= 2 * Math.PI;
  if (startAngle - endAngle > Math.PI) endAngle += 2 * Math.PI;
  const angle = startAngle + (endAngle - startAngle) * t;
  const clockwise = endAngle > startAngle;
  const radius = 0.5;
  return {
    pixelX: left + (cx + radius * Math.cos(angle)) * CELL_SIZE,
    pixelY: top + (cy + radius * Math.sin(angle)) * CELL_SIZE,
    // Касательная: по часовой (в экранных координатах угол растёт) — +π/2 к радиус-вектору
    direction: angle + (clockwise ? Math.PI / 2 : -Math.PI / 2),
  };
}
