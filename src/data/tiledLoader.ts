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
  tilesets?: { firstgid: number; name: string }[];
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

const TILE_MAP: Record<number, { type: 'obstacle'; obstacleType: ObstacleType } | { type: 'trap'; trapType: TrapType } | { type: 'coin' } | { type: 'powerup'; powerUpType?: PowerUpType } | { type: 'zone'; zoneType: ZoneType } | { type: 'wall' }> = {
  // Power-ups (size)
  5: { type: 'powerup', powerUpType: 'shield' },
  6: { type: 'powerup', powerUpType: 'big' },
  7: { type: 'powerup', powerUpType: 'small' },
  // Power-ups (material)
  8: { type: 'powerup', powerUpType: 'metal' },
  9: { type: 'powerup', powerUpType: 'plastic' },
  10: { type: 'powerup', powerUpType: 'feather' },
  // Coin
  11: { type: 'coin' },
  // Traps
  12: { type: 'trap', trapType: 'spike' },
  13: { type: 'trap', trapType: 'disappearing' },
  // Obstacles
  24: { type: 'obstacle', obstacleType: 'rotting_floor' },
  25: { type: 'obstacle', obstacleType: 'fragile_wall' },
  26: { type: 'wall' },
  28: { type: 'obstacle', obstacleType: 'thin_ice' },
};

const ZONE_TILE_MAP: Record<number, ZoneType> = {
  17: 'wind',
  21: 'ice',
  23: 'mud',
};

export function loadTiledLevel(json: TiledMap, cellSize: number): LevelData {
  const obstacles: LevelData['obstacles'] = [];
  const traps: LevelData['traps'] = [];
  const collectibles: LevelData['collectibles'] = [];
  const powerUps: LevelData['powerUps'] = [];
  const zones: LevelData['zones'] = [];
  const movingObstacles: LevelData['movingObstacles'] = [];

  let worldHeight = TOP_OFFSET + (json.height + 1) * cellSize;

  const toX = (col: number) => col * cellSize;
  const toY = (row: number) => TOP_OFFSET + row * cellSize;

  for (const layer of json.layers) {
    if (layer.type === 'tilelayer') {
      const tileGrid: number[][] = [];
      for (let r = 0; r < layer.height; r++) {
        tileGrid[r] = [];
        for (let c = 0; c < layer.width; c++) {
          tileGrid[r][c] = layer.data[r * layer.width + c];
        }
      }

      for (let r = 0; r < tileGrid.length; r++) {
        let c = 0;
        while (c < tileGrid[r].length) {
          const tileId = tileGrid[r][c];
          if (tileId === 0) { c++; continue; }

          const zoneType = ZONE_TILE_MAP[tileId];
          if (zoneType) {
            zones.push({ x: toX(c), y: toY(r), width: cellSize, height: cellSize, type: zoneType, dx: 0, dy: 0 });
            c++; continue;
          }

          const mapping = TILE_MAP[tileId];
          if (!mapping) { c++; continue; }

          switch (mapping.type) {
            case 'wall':
            case 'obstacle': {
              const obsType = mapping.type === 'wall' ? 'wall' : mapping.obstacleType;
              let c2 = c + 1;
              while (c2 < tileGrid[r].length && tileGrid[r][c2] === tileId) c2++;
              obstacles.push({ x: toX(c), y: toY(r), width: (c2 - c) * cellSize, height: cellSize, type: obsType });
              c = c2;
              break;
            }
            case 'coin':
              collectibles.push({ x: toX(c) + cellSize / 2, y: toY(r) + cellSize / 2, radius: COL_RADIUS });
              c++;
              break;
            case 'trap':
              traps.push({ x: toX(c), y: toY(r), width: cellSize, height: cellSize, type: mapping.trapType, phase: Math.random() });
              c++;
              break;
            case 'powerup':
              powerUps.push({ x: toX(c) + cellSize / 2, y: toY(r) + cellSize / 2, radius: 18, type: mapping.powerUpType || 'shield' });
              c++;
              break;
            default:
              c++;
          }
        }
      }
    } else if (layer.type === 'objectgroup') {
      for (const obj of layer.objects) {
        const px = obj.x;
        const py = TOP_OFFSET + obj.y;

        if (layer.name === 'zones') {
          const zt = (obj.type || 'wind') as ZoneType;
          const props = obj.properties || {};
          zones.push({ x: px, y: py, width: obj.width || cellSize, height: obj.height || cellSize, type: zt, dx: (props.dx as number) || 0, dy: (props.dy as number) || 0 });
          const bottom = py + (obj.height || cellSize);
          if (bottom > worldHeight) worldHeight = bottom;
        }

        if (layer.name === 'moving') {
          const props = obj.properties || {};
          movingObstacles.push({ x: px, y: py, width: obj.width || cellSize, height: obj.height || cellSize, range: (props.range as number) || 60, speed: (props.speed as number) || 0.5, axis: (props.axis as 'x' | 'y') || 'x' });
          const bottom = py + (obj.height || cellSize);
          if (bottom > worldHeight) worldHeight = bottom;
        }

        if (layer.name === 'powerups') {
          const types: PowerUpType[] = ['shield', 'big', 'small', 'metal', 'plastic', 'feather'];
          const pt = (obj.type && types.includes(obj.type as PowerUpType) ? obj.type : types[Math.floor(Math.random() * types.length)]) as PowerUpType;
          powerUps.push({ x: px + (obj.width || cellSize) / 2, y: py + (obj.height || cellSize) / 2, radius: 18, type: pt });
        }
      }
    }
  }

  return { id: 0, obstacles, movingObstacles, collectibles, powerUps, zones, traps, worldHeight };
}
