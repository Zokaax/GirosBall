const MARGIN = 40;
const TOP_OFFSET = 100;
const SPAWN_SAFE_RADIUS = 60;

export type ObstacleType = 'wall' | 'rotting_floor' | 'fragile_wall' | 'thin_ice';

export type Obstacle = {
  x: number; y: number;
  width: number; height: number;
  type: ObstacleType;
};

export type MovingObstacle = {
  x: number; y: number;
  width: number; height: number;
  range: number;
  speed: number;
  axis: 'x' | 'y';
};

export type Collectible = {
  x: number; y: number;
  radius: number;
};

export type PowerUpType = 'shield' | 'big' | 'small' | 'metal' | 'plastic' | 'feather';

export type PowerUp = {
  x: number; y: number;
  radius: number;
  type: PowerUpType;
};

export type BallMaterial = 'metal' | 'plastic' | 'feather';

export type ZoneType = 'wind' | 'magnetic' | 'ice' | 'mud';

export type Zone = {
  x: number; y: number;
  width: number; height: number;
  type: ZoneType;
  dx: number;
  dy: number;
};

export type TrapType = 'spike' | 'disappearing';

export type Trap = {
  x: number; y: number;
  width: number; height: number;
  type: TrapType;
  phase: number;
};

export type LevelData = {
  id: number;
  obstacles: Obstacle[];
  movingObstacles: MovingObstacle[];
  collectibles: Collectible[];
  powerUps: PowerUp[];
  zones: Zone[];
  traps: Trap[];
  worldHeight: number;
};

const CELL_COLS = 10;
const CELL_H = 48;
const COL_RADIUS = 14;
const SPAWN_ROW = 2;
const SPAWN_COL_START = 3;
const SPAWN_COL_END = 6;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateLevel(levelNum: number, screenW: number, screenH: number, seedOffset = 0): LevelData {
  const rng = seededRandom(levelNum * 7919 + 42 + seedOffset * 9973);
  const CELL_W = screenW / CELL_COLS;
  const totalRows = 10 + levelNum * 3;
  const worldHeight = TOP_OFFSET + MARGIN + totalRows * CELL_H;
  const grid: boolean[][] = Array.from({ length: totalRows }, () => Array(CELL_COLS).fill(false));

  const toX = (col: number, w = 1) => col * CELL_W;
  const toY = (row: number, h = 1) => TOP_OFFSET + row * CELL_H;
  const toW = (n: number) => n * CELL_W;
  const toH = (n: number) => n * CELL_H;

  const occupy = (col: number, row: number, w: number, h: number) => {
    for (let r = row; r < Math.min(row + h, totalRows); r++)
      for (let c = col; c < Math.min(col + w, CELL_COLS); c++)
        grid[r][c] = true;
  };

  const isFree = (col: number, row: number, w: number, h: number) => {
    if (col < 0 || row < 0 || col + w > CELL_COLS || row + h > totalRows) return false;
    for (let r = row; r < row + h; r++)
      for (let c = col; c < col + w; c++)
        if (grid[r][c]) return false;
    return true;
  };

  const findFree = (w: number, h: number, maxTries = 50): { col: number; row: number } | null => {
    const maxCol = CELL_COLS - w;
    const maxRow = totalRows - h;
    for (let t = 0; t < maxTries; t++) {
      const col = Math.floor(rng() * maxCol);
      const row = Math.floor(rng() * maxRow);
      if (isFree(col, row, w, h)) return { col, row };
    }
    return null;
  };

  // Reserve spawn area
  for (let r = 0; r <= SPAWN_ROW + 1; r++)
    for (let c = SPAWN_COL_START; c <= SPAWN_COL_END; c++)
      if (r < totalRows && c < CELL_COLS) grid[r][c] = true;

  const allPlaced: { x: number; y: number; w: number; h: number }[] = [];

  const place = (x: number, y: number, w: number, h: number) => {
    allPlaced.push({ x, y, w, h });
  };

  const colsFor = (min: number, max: number) => Math.min(max, Math.max(min, 1 + Math.floor(rng() * (max - min + 1))));
  const rowsFor = (min: number, max: number) => Math.min(max, Math.max(min, 1 + Math.floor(rng() * (max - min + 1))));

  // Obstacles
  const numObstacles = Math.max(0, Math.floor((levelNum - 1) * 0.6));
  const obstacles: Obstacle[] = [];
  const obstacleTypes: ObstacleType[] = ['wall', 'rotting_floor', 'fragile_wall', 'thin_ice'];
  for (let i = 0; i < numObstacles; i++) {
    const cw = colsFor(1, 3);
    const ch = rowsFor(1, 2);
    const pos = findFree(cw, ch);
    if (!pos) continue;
    occupy(pos.col, pos.row, cw, ch);
    const ot = levelNum >= 4 ? obstacleTypes[Math.floor(rng() * obstacleTypes.length)] : 'wall';
    obstacles.push({ x: toX(pos.col), y: toY(pos.row), width: toW(cw), height: toH(ch), type: ot });
    place(toX(pos.col), toY(pos.row), toW(cw), toH(ch));
  }

  // Moving obstacles
  const numMoving = Math.max(0, Math.floor((levelNum - 4) / 3));
  const movingObstacles: MovingObstacle[] = [];
  for (let i = 0; i < numMoving; i++) {
    const pos = findFree(3, 1);
    if (!pos) continue;
    occupy(pos.col, pos.row, 3, 1);
    movingObstacles.push({
      x: toX(pos.col), y: toY(pos.row),
      width: toW(3), height: toH(1),
      range: 30 + rng() * 90,
      speed: 0.4 + rng() * 0.8,
      axis: rng() > 0.5 ? 'x' : 'y',
    });
    place(toX(pos.col), toY(pos.row), toW(3), toH(1));
  }

  // Collectibles
  const numCollectibles = Math.min(3 + levelNum, 15);
  const collectibles: Collectible[] = [];
  for (let i = 0; i < numCollectibles; i++) {
    const pos = findFree(1, 1, 30);
    if (!pos) continue;
    occupy(pos.col, pos.row, 1, 1);
    const cx = toX(pos.col) + CELL_W / 2;
    const cy = toY(pos.row) + CELL_H / 2;
    collectibles.push({ x: cx, y: cy, radius: COL_RADIUS });
    place(cx - COL_RADIUS, cy - COL_RADIUS, COL_RADIUS * 2 + 4, COL_RADIUS * 2 + 4);
  }

  // Power-ups
  const numPowerUps = levelNum >= 3 ? (levelNum >= 8 ? (levelNum >= 14 ? 4 : 2) : 1) : 0;
  const powerUpTypes: PowerUpType[] = ['shield', 'big', 'small', 'metal', 'plastic', 'feather'];
  const powerUps: PowerUp[] = [];
  for (let i = 0; i < numPowerUps; i++) {
    const pos = findFree(1, 1, 30);
    if (!pos) continue;
    occupy(pos.col, pos.row, 1, 1);
    const type = powerUpTypes[Math.floor(rng() * powerUpTypes.length)];
    const px = toX(pos.col) + CELL_W / 2;
    const py = toY(pos.row) + CELL_H / 2;
    powerUps.push({ x: px, y: py, radius: 18, type });
    place(px - 18, py - 18, 36, 36);
  }

  // Zones
  const numZones = levelNum >= 5 ? (levelNum >= 10 ? (levelNum >= 15 ? 3 : 2) : 1) : 0;
  const zoneTypes: ZoneType[] = ['wind', 'magnetic', 'ice', 'mud'];
  const zones: Zone[] = [];
  for (let i = 0; i < numZones; i++) {
    const zt = zoneTypes[Math.floor(rng() * zoneTypes.length)];
    const cw = colsFor(2, 4);
    const ch = rowsFor(2, 4);
    const pos = findFree(cw + 1, ch + 1, 30);
    if (!pos) continue;
    // zones don't occupy cells (they overlap)
    const zx = toX(pos.col);
    const zy = toY(pos.row);
    const zW = toW(cw);
    const zH = toH(ch);
    const zDx = pos.col + (cw + 1) / 2;
    const zDy = pos.row + (ch + 1) / 2;
    const spawnCx = screenW / 2;
    const spawnCy = TOP_OFFSET + SPAWN_ROW * CELL_H + CELL_H;
    if (Math.abs(zDx * CELL_W - spawnCx) < 80 && Math.abs(zDy * CELL_H - spawnCy) < 80) continue;
    const angle = rng() * Math.PI * 2;
    zones.push({ x: zx, y: zy, width: zW, height: zH, type: zt, dx: Math.cos(angle), dy: Math.sin(angle) });
  }

  // Traps: spikes (1x1) and disappearing (2x1)
  const numSpikes = levelNum >= 3 ? Math.floor((levelNum - 2) / 3) : 0;
  const numDisappearing = levelNum >= 6 ? Math.floor(levelNum / 5) : 0;
  const traps: Trap[] = [];
  for (let i = 0; i < numSpikes; i++) {
    const pos = findFree(1, 1, 30);
    if (!pos || pos.row <= SPAWN_ROW + 1) continue;
    occupy(pos.col, pos.row, 1, 1);
    traps.push({ x: toX(pos.col), y: toY(pos.row), width: toW(1), height: toH(1), type: 'spike', phase: rng() });
    place(toX(pos.col), toY(pos.row), toW(1), toH(1));
  }
  for (let i = 0; i < numDisappearing; i++) {
    const pos = findFree(2, 1, 30);
    if (!pos) continue;
    occupy(pos.col, pos.row, 2, 1);
    traps.push({ x: toX(pos.col), y: toY(pos.row), width: toW(2), height: toH(1), type: 'disappearing', phase: rng() });
    place(toX(pos.col), toY(pos.row), toW(2), toH(1));
  }

  return { id: levelNum, obstacles, movingObstacles, collectibles, powerUps, zones, traps, worldHeight };
}

function bfsReachable(grid: boolean[][], totalRows: number, totalCols: number, targets: { r: number; c: number }[]): boolean {
  const spawnRow = SPAWN_ROW + 1;
  const spawnCol = Math.floor((SPAWN_COL_START + SPAWN_COL_END) / 2);
  if (spawnRow >= totalRows || spawnCol >= totalCols) return true;
  const visited: boolean[][] = Array.from({ length: totalRows }, () => Array(totalCols).fill(false));
  const queue: [number, number][] = [[spawnCol, spawnRow]];
  visited[spawnRow][spawnCol] = true;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let qi = 0; qi < queue.length; qi++) {
    const [c, r] = queue[qi];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc >= 0 && nc < totalCols && nr >= 0 && nr < totalRows && !grid[nr][nc] && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push([nc, nr]);
      }
    }
  }
  return targets.every(({ r, c }) => r < 0 || r >= totalRows || c < 0 || c >= totalCols || visited[r][c]);
}

const cachedLevels = new Map<string, LevelData>();

export function getLevel(levelNum: number, screenW: number, screenH: number): LevelData {
  const key = `${levelNum}-${Math.round(screenW)}-${Math.round(screenH)}`;
  if (!cachedLevels.has(key)) {
    let data: LevelData;
    for (let attempt = 0; attempt < 10; attempt++) {
      data = generateLevel(levelNum, screenW, screenH, attempt);
      const CELL_W = screenW / CELL_COLS;
      const totalRows = 10 + levelNum * 3;
      const targets: { r: number; c: number }[] = data.collectibles.map((c) => ({
        r: Math.floor((c.y - TOP_OFFSET) / CELL_H),
        c: Math.floor(c.x / CELL_W),
      }));
      const grid: boolean[][] = Array.from({ length: totalRows }, () => Array(CELL_COLS).fill(false));
      for (const o of data.obstacles) {
        const cr = Math.floor((o.y - TOP_OFFSET) / CELL_H);
        const cc = Math.floor(o.x / CELL_W);
        const cw = Math.max(1, Math.round(o.width / CELL_W));
        const ch = Math.max(1, Math.round(o.height / CELL_H));
        for (let r = cr; r < Math.min(cr + ch, totalRows); r++)
          for (let c = cc; c < Math.min(cc + cw, CELL_COLS); c++)
            grid[r][c] = true;
      }
      for (const m of data.movingObstacles) {
        const mr = Math.floor((m.y - TOP_OFFSET) / CELL_H);
        const mc = Math.floor(m.x / CELL_W);
        const mw = Math.max(1, Math.round(m.width / CELL_W));
        const mh = Math.max(1, Math.round(m.height / CELL_H));
        for (let r = mr; r < Math.min(mr + mh, totalRows); r++)
          for (let c = mc; c < Math.min(mc + mw, CELL_COLS); c++)
            grid[r][c] = true;
      }
      for (const t of data.traps) {
        const tr = Math.floor((t.y - TOP_OFFSET) / CELL_H);
        const tc = Math.floor(t.x / CELL_W);
        const tw = Math.max(1, Math.round(t.width / CELL_W));
        const th = Math.max(1, Math.round(t.height / CELL_H));
        for (let r = tr; r < Math.min(tr + th, totalRows); r++)
          for (let c = tc; c < Math.min(tc + tw, CELL_COLS); c++)
            grid[r][c] = true;
      }
      if (bfsReachable(grid, totalRows, CELL_COLS, targets)) break;
    }
    cachedLevels.set(key, data!);
  }
  return cachedLevels.get(key)!;
}
