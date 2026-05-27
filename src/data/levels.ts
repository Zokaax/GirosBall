const MARGIN = 40;
const TOP_OFFSET = 100;
const SPAWN_SAFE_RADIUS = 60;

export type Obstacle = {
  x: number; y: number;
  width: number; height: number;
};

export type MovingObstacle = Obstacle & {
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
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function isInSafeZone(x: number, y: number, w: number, h: number, cx: number, cy: number): boolean {
  return (
    x + w > cx - SPAWN_SAFE_RADIUS &&
    x < cx + SPAWN_SAFE_RADIUS &&
    y + h > cy - SPAWN_SAFE_RADIUS &&
    y < cy + SPAWN_SAFE_RADIUS
  );
}

function rectsOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
): boolean {
  return x1 + w1 > x2 && x1 < x2 + w2 && y1 + h1 > y2 && y1 < y2 + h2;
}

const CELL = 15;
const BALL_RADIUS = 20;

function areCollectiblesReachable(
  obstacles: Obstacle[],
  movingObstacles: MovingObstacle[],
  traps: Trap[],
  collectibles: Collectible[],
  cx: number, cy: number,
  screenW: number, screenH: number,
): boolean {
  const cols = Math.ceil(screenW / CELL);
  const rows = Math.ceil((screenH - TOP_OFFSET) / CELL);
  const blocked: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  const markBlocked = (rx: number, ry: number, rw: number, rh: number) => {
    const minC = Math.max(0, Math.floor((rx - BALL_RADIUS) / CELL));
    const maxC = Math.min(cols - 1, Math.ceil((rx + rw + BALL_RADIUS) / CELL));
    const minR = Math.max(0, Math.floor((ry - BALL_RADIUS - TOP_OFFSET) / CELL));
    const maxR = Math.min(rows - 1, Math.ceil((ry + rh + BALL_RADIUS - TOP_OFFSET) / CELL));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        blocked[r][c] = true;
      }
    }
  };

  for (const o of obstacles) markBlocked(o.x, o.y, o.width, o.height);
  for (const m of movingObstacles) markBlocked(m.x, m.y, m.width, m.height);
  for (const t of traps) markBlocked(t.x, t.y, t.width, t.height);

  const spawnC = Math.floor(cx / CELL);
  const spawnR = Math.floor((cy - TOP_OFFSET) / CELL);
  if (spawnR < 0 || spawnR >= rows || spawnC < 0 || spawnC >= cols) return true;

  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: [number, number][] = [[spawnC, spawnR]];
  visited[spawnR][spawnC] = true;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let qi = 0; qi < queue.length; qi++) {
    const [c, r] = queue[qi];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !blocked[nr][nc] && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push([nc, nr]);
      }
    }
  }

  for (const col of collectibles) {
    const cc = Math.floor(col.x / CELL);
    const cr = Math.floor((col.y - TOP_OFFSET) / CELL);
    if (cr >= 0 && cr < rows && cc >= 0 && cc < cols && !visited[cr][cc]) {
      return false;
    }
  }
  return true;
}

function generateLevel(levelNum: number, screenW: number, screenH: number, seedOffset = 0): LevelData {
  const rng = seededRandom(levelNum * 7919 + 42 + seedOffset * 9973);
  const playH = screenH - TOP_OFFSET - MARGIN;
  const cx = screenW / 2;
  const cy = screenH / 2;
  const COL_RADIUS = 14;
  const COL_PAD = 8;

  const numCollectibles = Math.min(3 + levelNum, 15);
  const numObstacles = Math.max(0, Math.floor((levelNum - 1) * 0.6));
  const numMoving = Math.max(0, Math.floor((levelNum - 4) / 3));

  const allPlaced: { x: number; y: number; w: number; h: number }[] = [];

  const obstacles: Obstacle[] = [];
  for (let i = 0; i < numObstacles; i++) {
    let tries = 0;
    let ox: number, oy: number, ow: number, oh: number;
    do {
      ox = MARGIN + rng() * (screenW - 2 * MARGIN - 60);
      oy = TOP_OFFSET + rng() * (playH - MARGIN - 50);
      ow = 30 + rng() * 50;
      oh = 15 + rng() * 25;
      tries++;
    } while (isInSafeZone(ox, oy, ow, oh, cx, cy) && tries < 20);
    obstacles.push({ x: ox, y: oy, width: ow, height: oh });
    allPlaced.push({ x: ox, y: oy, w: ow, h: oh });
  }

  const movingObstacles: MovingObstacle[] = [];
  for (let i = 0; i < numMoving; i++) {
    let tries = 0;
    let mx: number, my: number;
    do {
      mx = MARGIN + rng() * (screenW - 2 * MARGIN - 50);
      my = TOP_OFFSET + rng() * (playH - MARGIN - 30);
      tries++;
    } while (isInSafeZone(mx, my, 50, 18, cx, cy) && tries < 20);
    movingObstacles.push({
      x: mx, y: my,
      width: 50, height: 18,
      range: 30 + rng() * 90,
      speed: 0.4 + rng() * 0.8,
      axis: rng() > 0.5 ? 'x' : 'y',
    });
    allPlaced.push({ x: mx, y: my, w: 50, h: 18 });
  }

  const collectibles: Collectible[] = [];
  for (let i = 0; i < numCollectibles; i++) {
    let tries = 0;
    let colX: number, colY: number;
    do {
      colX = MARGIN + rng() * (screenW - 2 * MARGIN);
      colY = TOP_OFFSET + rng() * (playH - MARGIN);
      tries++;
    } while (
      tries < 30 &&
      allPlaced.some((p) =>
        rectsOverlap(colX - COL_RADIUS, colY - COL_RADIUS, COL_RADIUS * 2, COL_RADIUS * 2, p.x, p.y, p.w, p.h),
      )
    );
    collectibles.push({ x: colX, y: colY, radius: COL_RADIUS });
    allPlaced.push({ x: colX - COL_RADIUS, y: colY - COL_RADIUS, w: COL_RADIUS * 2 + COL_PAD, h: COL_RADIUS * 2 + COL_PAD });
  }

  const numPowerUps = levelNum >= 3 ? (levelNum >= 8 ? (levelNum >= 14 ? 4 : 2) : 1) : 0;
  const powerUpTypes: PowerUpType[] = ['shield', 'big', 'small', 'metal', 'plastic', 'feather'];
  const powerUps: PowerUp[] = [];
  for (let i = 0; i < numPowerUps; i++) {
    let tries = 0;
    let puX: number, puY: number;
    do {
      puX = MARGIN + rng() * (screenW - 2 * MARGIN);
      puY = TOP_OFFSET + rng() * (playH - MARGIN);
      tries++;
    } while (
      tries < 30 &&
      allPlaced.some((p) =>
        rectsOverlap(puX - 18, puY - 18, 36, 36, p.x, p.y, p.w, p.h),
      )
    );
    const type = powerUpTypes[Math.floor(rng() * powerUpTypes.length)];
    powerUps.push({ x: puX, y: puY, radius: 18, type });
    allPlaced.push({ x: puX - 18, y: puY - 18, w: 36, h: 36 });
  }

  const numZones = levelNum >= 5 ? (levelNum >= 10 ? (levelNum >= 15 ? 3 : 2) : 1) : 0;
  const zoneTypes: ZoneType[] = ['wind', 'magnetic', 'ice', 'mud'];
  const zones: Zone[] = [];
  for (let i = 0; i < numZones; i++) {
    const zt = zoneTypes[Math.floor(rng() * zoneTypes.length)];
    const zW = 60 + rng() * 80;
    const zH = 60 + rng() * 80;
    let tries = 0;
    let zx: number, zy: number;
    let placed = false;
    do {
      zx = MARGIN + rng() * (screenW - MARGIN - zW);
      zy = TOP_OFFSET + rng() * (playH - zH);
      tries++;
      if (
        !isInSafeZone(zx, zy, zW, zH, cx, cy) &&
        !allPlaced.some((p) => rectsOverlap(zx - 5, zy - 5, zW + 10, zH + 10, p.x, p.y, p.w, p.h))
      ) {
        placed = true;
        break;
      }
    } while (tries < 50);
    if (!placed) continue;
    const angle = rng() * Math.PI * 2;
    zones.push({ x: zx, y: zy, width: zW, height: zH, type: zt, dx: Math.cos(angle), dy: Math.sin(angle) });
  }

  const numSpikes = levelNum >= 3 ? Math.floor((levelNum - 2) / 3) : 0;
  const numDisappearing = levelNum >= 6 ? Math.floor(levelNum / 5) : 0;
  const traps: Trap[] = [];
  for (let i = 0; i < numSpikes; i++) {
    let tries = 0;
    let sx: number, sy: number;
    do {
      sx = MARGIN + rng() * (screenW - 2 * MARGIN - 30);
      sy = TOP_OFFSET + rng() * (playH - MARGIN - 30);
      tries++;
    } while (isInSafeZone(sx, sy, 24, 24, cx, cy) && tries < 20);
    traps.push({ x: sx, y: sy, width: 24, height: 24, type: 'spike', phase: rng() });
  }
  for (let i = 0; i < numDisappearing; i++) {
    let tries = 0;
    let dx: number, dy: number;
    do {
      dx = MARGIN + rng() * (screenW - 2 * MARGIN - 50);
      dy = TOP_OFFSET + rng() * (playH - MARGIN - 18);
      tries++;
    } while (isInSafeZone(dx, dy, 50, 18, cx, cy) && tries < 20);
    traps.push({ x: dx, y: dy, width: 50, height: 18, type: 'disappearing', phase: rng() });
  }

  return { id: levelNum, obstacles, movingObstacles, collectibles, powerUps, zones, traps };
}

const cachedLevels = new Map<string, LevelData>();

export function getLevel(levelNum: number, screenW: number, screenH: number): LevelData {
  const key = `${levelNum}-${Math.round(screenW)}-${Math.round(screenH)}`;
  if (!cachedLevels.has(key)) {
    const cx = screenW / 2;
    const cy = screenH / 2;
    let data: LevelData;
    for (let attempt = 0; attempt < 10; attempt++) {
      data = generateLevel(levelNum, screenW, screenH, attempt);
      if (areCollectiblesReachable(data.obstacles, data.movingObstacles, data.traps, data.collectibles, cx, cy, screenW, screenH)) {
        break;
      }
    }
    cachedLevels.set(key, data!);
  }
  return cachedLevels.get(key)!;
}
