import type { LevelData, ObstacleType, TrapType, ZoneType, PowerUpType } from './levels';

const CELL_COLS = 8;
const TOP_OFFSET = 100;
const COL_RADIUS = 14;

type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
};

type TiledLayer = TiledTileLayer | TiledObjectLayer;

type TiledTileLayer = {
  name: string;
  type: 'tilelayer';
  data: number[];
  width: number;
  height: number;
};

type TiledObjectLayer = {
  name: string;
  type: 'objectgroup';
  objects: TiledObject[];
};

type TiledObject = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
  properties?: Record<string, number | string | boolean>;
};

const TILE_OBSTACLE: Record<string, ObstacleType> = {
  wall: 'wall',
  rotting_floor: 'rotting_floor',
  fragile_wall: 'fragile_wall',
  thin_ice: 'thin_ice',
};

export function loadTiledLevel(json: TiledMap, cellSize: number): LevelData {
  const obstacles: LevelData['obstacles'] = [];
  const traps: LevelData['traps'] = [];
  const collectibles: LevelData['collectibles'] = [];
  const powerUps: LevelData['powerUps'] = [];
  const zones: LevelData['zones'] = [];
  const movingObstacles: LevelData['movingObstacles'] = [];

  let worldHeight = TOP_OFFSET + (json.height + 1) * cellSize;

  const grid: Record<string, number[][]> = {};
  const objectLayers: TiledObjectLayer[] = [];

  for (const layer of json.layers) {
    if (layer.type === 'tilelayer') {
      grid[layer.name] = [];
      for (let r = 0; r < layer.height; r++) {
        grid[layer.name][r] = [];
        for (let c = 0; c < layer.width; c++) {
          grid[layer.name][r][c] = layer.data[r * layer.width + c];
        }
      }
    } else if (layer.type === 'objectgroup') {
      objectLayers.push(layer);
    }
  }

  const toX = (col: number) => col * cellSize;
  const toY = (row: number) => TOP_OFFSET + row * cellSize;

  for (const [layerName, tileGrid] of Object.entries(grid)) {
    if (layerName === 'coin') {
      for (let r = 0; r < tileGrid.length; r++) {
        for (let c = 0; c < tileGrid[r].length; c++) {
          if (tileGrid[r][c] > 0) {
            collectibles.push({ x: toX(c) + cellSize / 2, y: toY(r) + cellSize / 2, radius: COL_RADIUS });
          }
        }
      }
      continue;
    }

    if (layerName === 'spike' || layerName === 'disappearing') {
      const trapType: TrapType = layerName === 'spike' ? 'spike' : 'disappearing';
      for (let r = 0; r < tileGrid.length; r++) {
        for (let c = 0; c < tileGrid[r].length; c++) {
          if (tileGrid[r][c] > 0) {
            traps.push({ x: toX(c), y: toY(r), width: cellSize, height: cellSize, type: trapType, phase: Math.random() });
          }
        }
      }
      continue;
    }

    const obstacleType = TILE_OBSTACLE[layerName];
    if (obstacleType) {
      for (let r = 0; r < tileGrid.length; r++) {
        let c = 0;
        while (c < tileGrid[r].length) {
          if (tileGrid[r][c] > 0) {
            let c2 = c;
            while (c2 < tileGrid[r].length && tileGrid[r][c2] > 0) c2++;
            obstacles.push({ x: toX(c), y: toY(r), width: (c2 - c) * cellSize, height: cellSize, type: obstacleType });
            c = c2;
          } else {
            c++;
          }
        }
      }
      continue;
    }

    if (layerName === 'powerup') {
      for (let r = 0; r < tileGrid.length; r++) {
        for (let c = 0; c < tileGrid[r].length; c++) {
          if (tileGrid[r][c] > 0) {
            const types: PowerUpType[] = ['shield', 'big', 'small', 'metal', 'plastic', 'feather'];
            powerUps.push({ x: toX(c) + cellSize / 2, y: toY(r) + cellSize / 2, radius: 18, type: types[Math.floor(Math.random() * types.length)] });
          }
        }
      }
    }
  }

  for (const layer of objectLayers) {
    for (const obj of layer.objects) {
      const px = obj.x;
      const py = TOP_OFFSET + obj.y;

      if (layer.name === 'zones') {
        const zoneType = (obj.type || 'wind') as ZoneType;
        const props = obj.properties || {};
        zones.push({
          x: px, y: py,
          width: obj.width || cellSize,
          height: obj.height || cellSize,
          type: zoneType,
          dx: (props.dx as number) || 0,
          dy: (props.dy as number) || 0,
        });
        const bottom = py + (obj.height || cellSize);
        if (bottom > worldHeight) worldHeight = bottom;
      }

      if (layer.name === 'moving') {
        const props = obj.properties || {};
        movingObstacles.push({
          x: px, y: py,
          width: obj.width || cellSize,
          height: obj.height || cellSize,
          range: (props.range as number) || 60,
          speed: (props.speed as number) || 0.5,
          axis: (props.axis as 'x' | 'y') || 'x',
        });
        const bottom = py + (obj.height || cellSize);
        if (bottom > worldHeight) worldHeight = bottom;
      }

      if (layer.name === 'powerups') {
        const types: PowerUpType[] = ['shield', 'big', 'small', 'metal', 'plastic', 'feather'];
        const type = (obj.type && types.includes(obj.type as PowerUpType) ? obj.type : types[Math.floor(Math.random() * types.length)]) as PowerUpType;
        powerUps.push({ x: px + (obj.width || cellSize) / 2, y: py + (obj.height || cellSize) / 2, radius: 18, type });
      }
    }
  }

  return { id: 0, obstacles, movingObstacles, collectibles, powerUps, zones, traps, worldHeight };
}
