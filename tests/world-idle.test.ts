import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { compileLevel } from '../src/core/level-v2';
import { clickCell, createWorld, isWorldIdle, stepWorld } from '../src/core/world';

const level3 = () =>
  compileLevel(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', '03.json'), 'utf8'))).legacy;

describe('isWorldIdle: мир стоит, следующий тик ничего не изменит', () => {
  test('на старте поезда разгоняются — не стоит', () => {
    expect(isWorldIdle(createWorld(level3()))).toBe(false);
  });

  test('оба поезда остановились на закрытых семафорах — стоит; открыли семафор — нет', () => {
    const world = createWorld(level3());
    clickCell(world, 4, 2);
    clickCell(world, 4, 8);
    let ticks = 0;
    while (!isWorldIdle(world) && ticks < 600) {
      stepWorld(world);
      ticks++;
    }
    expect(isWorldIdle(world)).toBe(true);
    expect(world.status).toBe('running');
    // Действительно ничего не меняется
    const before = JSON.stringify(world.trains);
    for (let i = 0; i < 60; i++) stepWorld(world);
    expect(JSON.stringify(world.trains)).toBe(before);
    clickCell(world, 4, 2);
    expect(isWorldIdle(world)).toBe(false);
  });

  test('один поезд стоит, другой едет — не стоит', () => {
    const world = createWorld(level3());
    clickCell(world, 4, 2);
    // Ждём, пока первый поезд встанет на семафоре (4,2); второй в это время едет
    for (let i = 0; i < 600 && world.trainStates[0].speed + (world.tick > 0 ? 0 : 1) > 0; i++) stepWorld(world);
    expect(world.status).toBe('running');
    expect(world.trainStates[0].speed).toBe(0);
    expect(world.trainStates[1].speed).toBeGreaterThan(0);
    expect(isWorldIdle(world)).toBe(false);
  });
});
