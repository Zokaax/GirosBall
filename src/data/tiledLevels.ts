import type { LevelData } from './levels';
import { loadTiledLevel } from './tiledLoader';

const CELL_COLS = 8;

const tiledFiles: Record<number, any> = {};

function registerLevel(num: number, module: any) {
  tiledFiles[num] = module;
}

try {
  registerLevel(1, require('../../assets/levels/sample.json'));
} catch {}

export function getTiledLevel(levelNum: number, screenW: number): LevelData | null {
  const data = tiledFiles[levelNum];
  if (!data) return null;
  const cellSize = screenW / CELL_COLS;
  return loadTiledLevel(data, cellSize);
}
