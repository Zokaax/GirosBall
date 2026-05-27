import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getLevel, type BallMaterial, type MovingObstacle, type PowerUpType, type Trap, type Zone } from '../data/levels';
import GameSprite from '../graphics/Sprite';
import { circleCircleCollision, circleRectCollision } from '../utils/collision';
import { loadScores, isHighScore, insertScore, saveScores } from '../data/highScores';
import { unlockNextLevel } from '../data/progress';

const SPEED_X = 1400;
const SPEED_Y = 1200;
const FRICTION = 0.97;
const HUD_HEIGHT = 90;
const INITIAL_LIVES = 5;
const TOTAL_LEVELS = 20;
const POWERUP_DURATION = 6000;
const TOP_OFFSET = 100;
const CELL_COLS = 8;
const SPAWN_ROW = 2;

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ navigation, route }: Props) {
  const startLevel = route.params?.startLevel ?? 1;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cellSize = screenWidth / CELL_COLS;
  const ballRadius = cellSize * 0.45;
  const ballSize = ballRadius * 2;
  const centerX = screenWidth / 2 - ballSize / 2;
  const spawnY = TOP_OFFSET + SPAWN_ROW * cellSize - ballRadius;

  const [ballPos, setBallPos] = useState({ x: centerX, y: spawnY });
  const [camY, setCamY] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(startLevel);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [collected, setCollected] = useState<boolean[]>([]);
  const [mvOffsets, setMvOffsets] = useState<number[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [shieldActive, setShieldActive] = useState(false);
  const [sizeMultiplier, setSizeMultiplier] = useState(1);
  const [collectedPowerUps, setCollectedPowerUps] = useState<boolean[]>([]);
  const [ballMaterial, setBallMaterial] = useState<BallMaterial>('plastic');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [levelTime, setLevelTime] = useState(0);
  const [startCountdown, setStartCountdown] = useState(0);
  const [debugHitboxes, setDebugHitboxes] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [powerUpProgress, setPowerUpProgress] = useState({ shield: 0, size: 0 });
  const [brokenWalls, setBrokenWalls] = useState<Record<number, boolean>>({});
  const [iceBrokenState, setIceBrokenState] = useState<Record<number, 'intact' | 'cracking' | 'fallen'>>({});

  const MATERIAL_MULT: Record<BallMaterial, Record<string, number>> = {
    metal: { wind: 0.3, magnetic: 1.5, ice: 0.3, mud: 1.2 },
    plastic: { wind: 0.6, magnetic: 0.0, ice: 0.5, mud: 0.7 },
    feather: { wind: 1.5, magnetic: 0.0, ice: 0.8, mud: 0.3 },
  };

  const MATERIAL_PHYSICS: Record<BallMaterial, { accel: number; friction: number }> = {
    metal:   { accel: 0.6,  friction: 0.985 },
    plastic: { accel: 1.0,  friction: 0.97  },
    feather: { accel: 1.5,  friction: 0.95  },
  };

  const ZONE_GLOW: Record<string, string> = {
    wind: 'rgba(100,180,255,0.4)',
    magnetic: 'rgba(200,100,255,0.4)',
    ice: 'rgba(180,230,255,0.4)',
    mud: 'rgba(140,100,60,0.4)',
  };

  const ballMaterialRef = useRef<BallMaterial>('plastic');
  const activeZoneRef = useRef<string | null>(null);
  const shieldRef = useRef(false);
  const sizeRef = useRef(1);
  const shieldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brokenWallsRef = useRef<Record<number, boolean>>({});
  const iceStateRef = useRef<Record<number, { state: 'intact' | 'cracking' | 'fallen'; timer: number }>>({});

  const currentRadius = ballRadius * sizeRef.current;
  const currentSize = currentRadius * 2;

  const pausedRef = useRef(false);
  const levelTimeRef = useRef(0);
  const startDelayRef = useRef(0);
  const comboRef = useRef(0);
  const lastCollectFrameRef = useRef(0);
  const shieldStartRef = useRef(0);
  const sizeStartRef = useRef(0);

  const displaySizeRef = useRef(ballSize);

  const pos = useRef({ x: centerX, y: spawnY });
  const vel = useRef({ x: 0, y: 0 });
  const livesRef = useRef(INITIAL_LIVES);
  const gameOverRef = useRef(false);
  const levelRef = useRef(startLevel);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);
  const camYRef = useRef(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const themeColors: string[] = [
    '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e', '#1a1a2e',
    '#2d1b4e', '#2d1b4e', '#2d1b4e', '#2d1b4e', '#2d1b4e',
    '#4a1a2e', '#4a1a2e', '#4a1a2e', '#4a1a2e', '#4a1a2e',
    '#1a2e2e', '#1a2e2e', '#1a2e2e', '#1a2e2e', '#1a2e2e',
  ];
  const bgColor = themeColors[level - 1] ?? '#1a1a2e';

  type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string };
  const particlesRef = useRef<Particle[]>([]);
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const parts: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 60 + Math.random() * 100;
      parts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 25, maxLife: 25, color });
    }
    particlesRef.current = [...particlesRef.current, ...parts];
  }, []);

  const dyingRef = useRef(0);
  const hideBallRef = useRef(false);
  const respawnBlinkRef = useRef(0);
  const camAnimRef = useRef<{ from: number; to: number; progress: number; duration: number } | null>(null);
  const levelCompleteRef = useRef(0);
  const fireworkColors = ['#ff4444', '#44ff44', '#44aaff', '#ffff44', '#ff44ff', '#ff8844'];

  const levelData = useMemo(
    () => getLevel(level, screenWidth, screenHeight),
    [level, screenWidth, screenHeight],
  );

  const initLevel = useCallback(() => {
    const lvl = getLevel(levelRef.current, screenWidth, screenHeight);
    setCollected(lvl.collectibles.map(() => false));
    setCollectedPowerUps(lvl.powerUps.map(() => false));
    setMvOffsets(lvl.movingObstacles.map(() => 0));
    collectedPowerUpsRef.current = lvl.powerUps.map(() => false);

    const materials: BallMaterial[] = ['metal', 'plastic', 'feather'];
    const randMat = materials[Math.floor(Math.random() * materials.length)];
    ballMaterialRef.current = randMat;
    setBallMaterial(randMat);

    if (shieldTimer.current) clearTimeout(shieldTimer.current);
    if (sizeTimer.current) clearTimeout(sizeTimer.current);
    shieldRef.current = false;
    sizeRef.current = 1;
    setShieldActive(false);
    setSizeMultiplier(1);

    pausedRef.current = false;
    setPaused(false);

    comboRef.current = 0;
    lastCollectFrameRef.current = 0;
    setComboCount(0);

    levelTimeRef.current = 0;
    setLevelTime(0);
    startDelayRef.current = 60;
    setStartCountdown(60);

    pos.current = { x: centerX, y: spawnY };
    vel.current = { x: 0, y: 0 };
    setBallPos({ x: centerX, y: spawnY });

    const sc = spawnY + ballRadius;
    const initCY = Math.max(0, Math.min(lvl.worldHeight - screenHeight, sc - screenHeight / 2));
    camYRef.current = initCY;
    setCamY(initCY);

    timeRef.current = 0;
    brokenWallsRef.current = {};
    iceStateRef.current = {};
    setBrokenWalls({});
    setIceBrokenState({});

    dyingRef.current = 0;
    hideBallRef.current = false;
    respawnBlinkRef.current = 0;
    displaySizeRef.current = ballSize;
    camAnimRef.current = null;
    levelCompleteRef.current = 0;
    particlesRef.current = [];

    fadeAnim.setValue(1);
    Animated.sequence([
      Animated.delay(80),
      Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [centerX, spawnY, screenWidth, screenHeight, fadeAnim]);

  useEffect(() => {
    initLevel();
  }, [level, initLevel]);

  const resetBall = useCallback(() => {
    pos.current = { x: centerX, y: spawnY };
    vel.current = { x: 0, y: 0 };
    setBallPos({ x: centerX, y: spawnY });
  }, [centerX, spawnY]);

  const nextLevel = useCallback(() => {
    const timeBonus = Math.max(0, Math.floor((1800 - levelTimeRef.current) / 6) * 10);
    if (timeBonus > 0) {
      scoreRef.current += timeBonus;
      setScore(scoreRef.current);
    }

    unlockNextLevel(levelRef.current);
    if (levelRef.current >= TOTAL_LEVELS) {
      gameOverRef.current = true;
      setGameWon(true);
      return;
    }
    const next = levelRef.current + 1;
    levelRef.current = next;
    setLevel(next);

    if (next % 3 === 0) {
      livesRef.current += 1;
      setLives(livesRef.current);
    }
  }, []);

  const die = useCallback(() => {
    if (gameOverRef.current) return;
    if (shieldRef.current) {
      shieldRef.current = false;
      setShieldActive(false);
      if (shieldTimer.current) clearTimeout(shieldTimer.current);
      return;
    }
    Vibration.vibrate(100);
    livesRef.current -= 1;
    setLives(livesRef.current);
    iceStateRef.current = {};
    setIceBrokenState({});
    if (livesRef.current <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
    } else {
      resetBall();
    }
  }, [resetBall]);

  useEffect(() => {
    Accelerometer.setUpdateInterval(16);

    const sub = Accelerometer.addListener(({ x: ax, y: ay }) => {
      if (gameOverRef.current) return;

      if (pausedRef.current) return;

      if (startDelayRef.current > 0) {
        startDelayRef.current -= 1;
        setStartCountdown(startDelayRef.current);
        levelTimeRef.current += 1;
        if (levelTimeRef.current % 3 === 0) {
          setLevelTime(levelTimeRef.current);
        }
        return;
      }

      levelTimeRef.current += 1;
      if (levelTimeRef.current % 3 === 0) {
        setLevelTime(levelTimeRef.current);
      }

      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, x: p.x + p.vx * 0.016, y: p.y + p.vy * 0.016, life: p.life - 1 }))
        .filter(p => p.life > 0);

      const lvl = getLevel(levelRef.current, screenWidth, screenHeight);

      if (dyingRef.current > 0) {
        dyingRef.current--;
        if (dyingRef.current === 0) {
          const wasShielded = shieldRef.current;
          die();
          if (!wasShielded && !gameOverRef.current) {
            const sc = spawnY + ballRadius;
            const spawnCY = Math.max(0, Math.min(lvl.worldHeight - screenHeight, sc - screenHeight / 2));
            camAnimRef.current = { from: camYRef.current, to: spawnCY, progress: 0, duration: 25 };
          }
        }
        return;
      }

      if (levelCompleteRef.current > 0) {
        levelCompleteRef.current--;
        if (levelCompleteRef.current % 8 === 0) {
          const fx = Math.random() * screenWidth;
          const fy = camYRef.current + Math.random() * screenHeight * 0.5;
          const c = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
          spawnParticles(fx, fy, c, 18);
        }
        if (levelCompleteRef.current === 0) {
          nextLevel();
        }
        return;
      }

      if (camAnimRef.current) {
        camAnimRef.current.progress++;
        const t = Math.min(camAnimRef.current.progress / camAnimRef.current.duration, 1);
        const eased = t * t * (3 - 2 * t);
        const cur = camAnimRef.current.from + (camAnimRef.current.to - camAnimRef.current.from) * eased;
        camYRef.current = cur;
        setCamY(cur);
        if (t >= 1) {
          camAnimRef.current = null;
          hideBallRef.current = false;
          respawnBlinkRef.current = 24;
        }
      }

      if (respawnBlinkRef.current > 0) respawnBlinkRef.current--;

      timeRef.current += 1;
      const rad = ballRadius * sizeRef.current;
      const sz = rad * 2;
      if (displaySizeRef.current !== sz) {
        displaySizeRef.current += (sz - displaySizeRef.current) * 0.15;
        if (Math.abs(displaySizeRef.current - sz) < 0.5) displaySizeRef.current = sz;
      }

      const mat = ballMaterialRef.current;
      const phys = MATERIAL_PHYSICS[mat];

      vel.current.x -= ax * SPEED_X * 0.016 * phys.accel;
      vel.current.y += ay * SPEED_Y * 0.016 * phys.accel;

      vel.current.x *= phys.friction;
      vel.current.y *= phys.friction;

      let newX = pos.current.x + vel.current.x * 0.016;
      let newY = pos.current.y + vel.current.y * 0.016;

      if (newX < 0) {
        newX = 0;
        vel.current.x *= -0.5;
      } else if (newX > screenWidth - sz) {
        newX = screenWidth - sz;
        vel.current.x *= -0.5;
      }

      if (newY < HUD_HEIGHT) {
        newY = HUD_HEIGHT;
        vel.current.y *= -0.5;
      }
      const worldBottom = lvl.worldHeight;
      if (newY + sz > worldBottom) {
        newY = worldBottom - sz;
        vel.current.y *= -0.5;
      }

      // Camera follows ball (skip if respawn animation is active)
      if (!camAnimRef.current) {
        const ballCenterY = newY + rad;
        const nextCamY = Math.max(0, Math.min(lvl.worldHeight - screenHeight, ballCenterY - screenHeight / 2));
        camYRef.current = nextCamY;
        setCamY(nextCamY);
      }

      const bx = newX + rad;
      const by = newY + rad;

      const mult = MATERIAL_MULT[mat];
      let foundZone: string | null = null;

      for (const zone of lvl.zones) {
        if (!circleRectCollision(bx, by, rad, zone.x, zone.y, zone.width, zone.height)) continue;
        foundZone = zone.type;
        const factor = mult[zone.type];
        if (zone.type === 'wind') {
          const push = factor * 200;
          vel.current.x += zone.dx * push * 0.016;
          vel.current.y += zone.dy * push * 0.016;
        } else if (zone.type === 'magnetic') {
          const zcx = zone.x + zone.width / 2;
          const zcy = zone.y + zone.height / 2;
          const ddx = zcx - bx;
          const ddy = zcy - by;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const pull = factor * 180;
          vel.current.x += (ddx / dist) * pull * 0.016;
          vel.current.y += (ddy / dist) * pull * 0.016;
        } else if (zone.type === 'ice') {
          vel.current.x *= 1 + (0.04 * factor);
          vel.current.y *= 1 + (0.04 * factor);
        } else if (zone.type === 'mud') {
          vel.current.x *= 1 - (0.06 * factor);
          vel.current.y *= 1 - (0.06 * factor);
        }
      }

      if (foundZone !== activeZoneRef.current) {
        activeZoneRef.current = foundZone;
        setActiveZone(foundZone);
      }

      let hitTrap = false;
      let hitLethal = false;
      let bounced = false;

      const bounceOff = (rx: number, ry: number, rw: number, rh: number) => {
        const bx2 = bx - rad;
        const by2 = by - rad;
        const overlapLeft = (bx2 + rad * 2) - rx;
        const overlapRight = (rx + rw) - bx2;
        const overlapTop = (by2 + rad * 2) - ry;
        const overlapBottom = (ry + rh) - by2;
        const minOvr = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOvr === overlapLeft || minOvr === overlapRight) {
          pos.current.x = minOvr === overlapLeft ? rx - rad * 2 : rx + rw;
          vel.current.x = 0;
          vel.current.y *= 0.85;
        } else {
          pos.current.y = minOvr === overlapTop ? ry - rad * 2 : ry + rh;
          vel.current.y = 0;
          vel.current.x *= 0.85;
        }
        newX = pos.current.x;
        newY = pos.current.y;
      };

      for (let oi = 0; oi < lvl.obstacles.length; oi++) {
        const obs = lvl.obstacles[oi];
        if (!circleRectCollision(bx, by, rad, obs.x, obs.y, obs.width, obs.height)) continue;
        if (obs.type === 'wall') {
          bounceOff(obs.x, obs.y, obs.width, obs.height);
          bounced = true;
        } else if (obs.type === 'rotting_floor') {
          if (mat === 'feather') {
          } else {
            hitLethal = true;
            break;
          }
        } else if (obs.type === 'fragile_wall') {
          if (mat === 'metal') {
            brokenWallsRef.current[oi] = true;
            setBrokenWalls({ ...brokenWallsRef.current });
          } else {
            bounceOff(obs.x, obs.y, obs.width, obs.height);
            bounced = true;
          }
        } else if (obs.type === 'thin_ice') {
          if (mat === 'feather') {
          } else if (mat === 'metal') {
            iceStateRef.current[oi] = { state: 'fallen', timer: 0 };
            setIceBrokenState((prev) => ({ ...prev, [oi]: 'fallen' }));
            hitLethal = true;
            break;
          } else {
            const cur = iceStateRef.current[oi];
            if (!cur || cur.state === 'intact') {
              iceStateRef.current[oi] = { state: 'cracking', timer: timeRef.current };
              setIceBrokenState((prev) => ({ ...prev, [oi]: 'cracking' }));
            } else if (cur.state === 'cracking') {
              if (timeRef.current - cur.timer > 60) {
                iceStateRef.current[oi] = { state: 'fallen', timer: 0 };
                setIceBrokenState((prev) => ({ ...prev, [oi]: 'fallen' }));
                hitLethal = true;
                break;
              }
            }
          }
        }
      }

      if (!hitLethal && !bounced) {
        for (const trap of lvl.traps) {
          if (trap.type === 'disappearing') {
            const phase = Math.sin(timeRef.current * 0.03 + trap.phase * Math.PI * 2);
            if (phase < 0) continue;
          }
          if (trap.type === 'spike' && mat === 'metal') continue;
          if (circleRectCollision(bx, by, rad, trap.x, trap.y, trap.width, trap.height)) {
            hitTrap = true;
            break;
          }
        }
      }

      let hitMoving = false;
      if (!hitLethal && !hitTrap) {
        for (let i = 0; i < lvl.movingObstacles.length; i++) {
          const mo = lvl.movingObstacles[i];
          const offset = mvOffsetsRef.current[i] ?? 0;
          let mx = mo.x;
          let my = mo.y;
          if (mo.axis === 'x') mx += offset;
          else my += offset;

          if (circleRectCollision(bx, by, rad, mx, my, mo.width, mo.height)) {
            if (bounced) break;
            bounceOff(mx, my, mo.width, mo.height);
            bounced = true;
            break;
          }
        }
      }

      if (hitLethal || hitTrap) {
        if (shieldRef.current && !hitTrap) {
          vel.current.x *= -0.5;
          vel.current.y *= -0.5;
          const pushX = pos.current.x + vel.current.x * 0.04;
          const pushY = pos.current.y + vel.current.y * 0.04;
          pos.current.x = Math.max(0, Math.min(screenWidth - rad * 2, pushX));
          pos.current.y = Math.max(HUD_HEIGHT, Math.min(screenHeight - rad * 2, pushY));
          setBallPos({ x: pos.current.x, y: pos.current.y });
          dyingRef.current = 8;
        } else {
          spawnParticles(newX + rad, newY + rad, '#ff4444', 16);
          hideBallRef.current = true;
          dyingRef.current = 50;
        }
        return;
      }

      const collectedCopy = [...collectedRef.current];
      const puCollectedCopy = [...collectedPowerUpsRef.current];
      let newScore = scoreRef.current;

      for (let i = 0; i < lvl.collectibles.length; i++) {
        if (collectedCopy[i]) continue;
        const c = lvl.collectibles[i];
        if (circleCircleCollision(bx, by, rad, c.x, c.y, c.radius)) {
          collectedCopy[i] = true;
          spawnParticles(c.x, c.y, '#ffd700', 8);
          const sinceLast = timeRef.current - lastCollectFrameRef.current;
          if (sinceLast < 90 && lastCollectFrameRef.current > 0) {
            comboRef.current = Math.min(comboRef.current + 1, 10);
          } else {
            comboRef.current = 1;
          }
          lastCollectFrameRef.current = timeRef.current;
          const mult = comboRef.current;
          newScore += 100 * mult;
          setComboCount(comboRef.current);
        }
      }

      for (let i = 0; i < lvl.powerUps.length; i++) {
        if (puCollectedCopy[i]) continue;
        const pu = lvl.powerUps[i];
        if (circleCircleCollision(bx, by, rad, pu.x, pu.y, pu.radius)) {
          puCollectedCopy[i] = true;
          applyPowerUp(pu.type);
          newX = pos.current.x;
          newY = pos.current.y;
        }
      }

      if (newScore !== scoreRef.current) {
        scoreRef.current = newScore;
        setScore(newScore);
        collectedRef.current = collectedCopy;
        setCollected(collectedCopy);

        const allCollected = collectedCopy.every(Boolean);
        if (allCollected) {
          pos.current = { x: newX, y: newY };
          setBallPos({ x: newX, y: newY });
          levelCompleteRef.current = 60;
          spawnParticles(screenWidth / 2, screenHeight / 2, '#ffd700', 25);
          spawnParticles(screenWidth / 2, screenHeight / 2, '#ffffff', 15);
          return;
      }
      }

      if (puCollectedCopy.some((v, i) => v !== collectedPowerUpsRef.current[i])) {
        collectedPowerUpsRef.current = puCollectedCopy;
        setCollectedPowerUps(puCollectedCopy);
      }

      pos.current = { x: newX, y: newY };
      setBallPos({ x: newX, y: newY });

      const newOffsets = lvl.movingObstacles.map((mo: MovingObstacle, i: number) => {
        const prev = mvOffsetsRef.current[i] ?? 0;
        return prev + Math.sin(timeRef.current * 0.05 + i) * mo.speed * 1.0;
      });
      mvOffsetsRef.current = newOffsets;
      setMvOffsets(newOffsets);
    });

    return () => sub.remove();
  }, [screenWidth, screenHeight, die, nextLevel]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      setPowerUpProgress({
        shield: shieldRef.current ? Math.max(0, 1 - (now - shieldStartRef.current) / POWERUP_DURATION) : 0,
        size: sizeRef.current !== 1 ? Math.max(0, 1 - (now - sizeStartRef.current) / POWERUP_DURATION) : 0,
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const collectedRef = useRef(collected);
  collectedRef.current = collected;
  const collectedPowerUpsRef = useRef<boolean[]>([]);
  const mvOffsetsRef = useRef(mvOffsets);
  mvOffsetsRef.current = mvOffsets;
  const nameSubmittedRef = useRef(false);

  const applyPowerUp = useCallback((type: PowerUpType) => {
    if (type === 'shield') {
      if (shieldTimer.current) clearTimeout(shieldTimer.current);
      shieldRef.current = true;
      setShieldActive(true);
      shieldTimer.current = setTimeout(() => {
        shieldRef.current = false;
        setShieldActive(false);
      }, POWERUP_DURATION);
    } else if (type === 'big' || type === 'small') {
      const mult = type === 'big' ? 1.5 : 0.5;
      if (sizeTimer.current) clearTimeout(sizeTimer.current);
      const oldR = ballRadius * sizeRef.current;
      const newR = ballRadius * mult;
      pos.current.x += oldR - newR;
      pos.current.y += oldR - newR;
      sizeRef.current = mult;
      setSizeMultiplier(mult);
      setBallPos({ x: pos.current.x, y: pos.current.y });
      const resetSize = () => {
        const oldR2 = ballRadius * sizeRef.current;
        pos.current.x += oldR2 - ballRadius;
        pos.current.y += oldR2 - ballRadius;
        sizeRef.current = 1;
        setSizeMultiplier(1);
        setBallPos({ x: pos.current.x, y: pos.current.y });
      };
      sizeTimer.current = setTimeout(resetSize, POWERUP_DURATION);
    } else {
      ballMaterialRef.current = type as BallMaterial;
      setBallMaterial(type as BallMaterial);
    }
  }, []);

  useEffect(() => {
    if ((gameOver || gameWon) && !nameSubmittedRef.current) {
      nameSubmittedRef.current = true;
      (async () => {
        const scores = await loadScores();
        if (isHighScore(scores, scoreRef.current)) {
          setShowNameInput(true);
        }
      })();
    }
  }, [gameOver, gameWon]);

  const handleSubmitName = async () => {
    const name = playerName.trim().slice(0, 10) || 'AAA';
    const scores = await loadScores();
    const updated = insertScore(scores, { name, score: scoreRef.current });
    await saveScores(updated);
    setShowNameInput(false);
  };

  const handleReintentar = () => {
    livesRef.current = INITIAL_LIVES;
    gameOverRef.current = false;
    levelRef.current = 1;
    scoreRef.current = 0;
    setLives(INITIAL_LIVES);
    setScore(0);
    setLevel(1);
    setGameOver(false);
    setGameWon(false);
    nameSubmittedRef.current = false;
    setShowNameInput(false);
    setPlayerName('');
    pausedRef.current = false;
    setPaused(false);
    comboRef.current = 0;
    lastCollectFrameRef.current = 0;
    setComboCount(0);
    shieldRef.current = false;
    sizeRef.current = 1;
    setShieldActive(false);
    setSizeMultiplier(1);
    if (shieldTimer.current) clearTimeout(shieldTimer.current);
    if (sizeTimer.current) clearTimeout(sizeTimer.current);
    brokenWallsRef.current = {};
    iceStateRef.current = {};
    setBrokenWalls({});
    setIceBrokenState({});
  };

  const handleVolverMenu = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Menu' }] });
  };

  const collectedCount = collected.filter(Boolean).length;
  const totalCoins = levelData.collectibles.length;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.hud}>
        <Text style={styles.hudText}>{'♥'.repeat(Math.max(0, lives))}</Text>
        <Text style={styles.hudText}>💎 {collectedCount}/{totalCoins}</Text>
        <Text style={styles.hudText}>Score: {score}</Text>
        <Text style={styles.hudText}>
          ⏱ {String(Math.floor(levelTime / 3600)).padStart(2, '0')}:{String(Math.floor(levelTime / 60) % 60).padStart(2, '0')}
        </Text>
        <Text style={styles.hudText}>Nv:{level}</Text>
      </View>

      {(powerUpProgress.shield > 0 || powerUpProgress.size > 0) && (
        <View style={styles.powerUpBarContainer}>
          {powerUpProgress.shield > 0 && (
            <View style={[styles.powerUpBar, { width: `${powerUpProgress.shield * 100}%`, backgroundColor: '#4fc3f7' }]} />
          )}
          {powerUpProgress.size > 0 && (
            <View style={[styles.powerUpBar, {
              width: `${powerUpProgress.size * 100}%`,
              backgroundColor: sizeRef.current > 1 ? '#81c784' : '#ffb74d',
              marginTop: powerUpProgress.shield > 0 ? 3 : 0,
            }]} />
          )}
        </View>
      )}

      <View style={[styles.gameWorld, { width: screenWidth, height: screenHeight, transform: [{ translateY: -camY }] }]}>
        {levelData.obstacles.map((obs, i) => {
        const key = `obs-${i}`;
        if (obs.type === 'rotting_floor') {
          return (
            <View key={key} style={{
              position: 'absolute', left: obs.x, top: obs.y,
              width: obs.width, height: obs.height,
              backgroundColor: '#5d4037',
              borderWidth: 2, borderColor: '#3e2723',
              borderRadius: 3,
              opacity: brokenWalls[i] ? 0.2 : 1,
            }} />
          );
        }
        if (obs.type === 'fragile_wall') {
          return (
            <View key={key} style={{
              position: 'absolute', left: obs.x, top: obs.y,
              width: obs.width, height: obs.height,
              backgroundColor: '#a1887f',
              borderWidth: 2, borderColor: '#795548',
              borderRadius: 4,
              opacity: brokenWalls[i] ? 0.2 : 1,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <View style={{
                width: obs.width * 0.6, height: 1,
                backgroundColor: '#5d4037',
              }} />
            </View>
          );
        }
        if (obs.type === 'thin_ice') {
          const iceBroken = iceBrokenState[i];
          if (iceBroken === 'fallen') {
            return (
              <View key={key} style={{
                position: 'absolute', left: obs.x, top: obs.y,
                width: obs.width, height: obs.height,
                backgroundColor: 'rgba(30,60,90,0.5)',
                borderWidth: 1,
                borderColor: 'rgba(30,60,90,0.8)',
                borderRadius: 4,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <View style={{
                  width: obs.width * 0.4, height: obs.height * 0.4,
                  borderRadius: 10,
                  backgroundColor: 'rgba(10,30,50,0.6)',
                }} />
              </View>
            );
          }
          return (
            <View key={key} style={{
              position: 'absolute', left: obs.x, top: obs.y,
              width: obs.width, height: obs.height,
              backgroundColor: iceBroken === 'cracking' ? 'rgba(180,220,255,0.8)' : 'rgba(200,230,255,0.5)',
              borderWidth: iceBroken === 'cracking' ? 3 : 1.5,
              borderColor: iceBroken === 'cracking' ? '#ef5350' : '#81d4fa',
              borderRadius: 4,
            }} />
          );
        }
        const halfW = obs.width / 2;
        return (
          <Fragment key={key}>
            <GameSprite sprite="obstacle_left" width={halfW} height={obs.height}
              resizeMode="stretch"
              style={{ position: 'absolute', left: obs.x, top: obs.y }} />
            <GameSprite sprite="obstacle_right" width={halfW} height={obs.height}
              resizeMode="stretch"
              style={{ position: 'absolute', left: obs.x + halfW, top: obs.y }} />
          </Fragment>
        );
      })}

      {levelData.movingObstacles.map((mo, i) => {
        const offset = mvOffsets[i] ?? 0;
        const mLeft = mo.axis === 'x' ? mo.x + offset : mo.x;
        const mTop = mo.axis === 'y' ? mo.y + offset : mo.y;
        const halfW = mo.width / 2;
        return (
          <Fragment key={`mov-${i}`}>
            <GameSprite sprite="moving_obstacle" width={halfW} height={mo.height}
              resizeMode="stretch"
              style={{ position: 'absolute', left: mLeft, top: mTop }} />
            <GameSprite sprite="moving_obstacle" width={halfW} height={mo.height}
              resizeMode="stretch"
              style={{ position: 'absolute', left: mLeft + halfW, top: mTop }} />
          </Fragment>
        );
      })}

      {levelData.traps.map((trap, i) => {
        if (trap.type === 'disappearing') {
          const phase = Math.sin(timeRef.current * 0.03 + trap.phase * Math.PI * 2);
          if (phase < 0) return null;
        }
        return (
          <GameSprite
            key={`trap-${i}`}
            sprite={trap.type === 'spike' ? 'trap_spike' : 'trap_disappearing'}
            width={trap.width} height={trap.height}
            resizeMode="stretch"
            style={{ position: 'absolute', left: trap.x, top: trap.y }}
          />
        );
      })}

      {levelData.zones.map((z, i) => (
        <GameSprite
          key={`zone-${i}`}
          sprite={`zone_${z.type}` as any}
          width={z.width} height={z.height}
          style={{ position: 'absolute', left: z.x, top: z.y, opacity: 0.5 }}
        />
      ))}

      {levelData.collectibles.map((c, i) => {
        if (collected[i]) return null;
        const cs = cellSize / 2;
        return (
          <GameSprite key={`coin-${i}`} sprite="coin" width={cs} height={cs} style={{ position: 'absolute', left: c.x - cs / 2, top: c.y - cs / 2 }} />
        );
      })}

      {levelData.powerUps.map((pu, i) => {
        if (collectedPowerUps[i]) return null;
        const puSprite: Record<string, any> = {
          shield: 'powerup_shield', big: 'powerup_big', small: 'powerup_small',
          metal: 'powerup_metal', plastic: 'powerup_plastic', feather: 'powerup_feather',
        };
        return (
          <GameSprite key={`pu-${i}`} sprite={puSprite[pu.type]} width={cellSize} height={cellSize} style={{ position: 'absolute', left: pu.x - cellSize / 2, top: pu.y - cellSize / 2 }} />
        );
      })}

      {comboCount >= 2 && timeRef.current - lastCollectFrameRef.current < 120 && (
        <View style={styles.comboCorner}>
          <Text style={styles.comboCornerText}>🔥 x{comboCount}</Text>
        </View>
      )}

      {particlesRef.current.map((p, i) => (
        <View key={`p-${i}`} style={{
          position: 'absolute',
          left: p.x - 3, top: p.y - 3,
          width: 6, height: 6,
          borderRadius: 3,
          backgroundColor: p.color,
          opacity: p.life / p.maxLife,
        }} />
      ))}

      {!hideBallRef.current && (() => {
        const blink = respawnBlinkRef.current > 0 && (Math.floor(respawnBlinkRef.current / 4) % 2 === 0);
        const dispSize = displaySizeRef.current;
        const dispRadius = dispSize / 2;
        return (
          <View style={{
            position: 'absolute', left: ballPos.x, top: ballPos.y,
            width: dispSize, height: dispSize,
            alignItems: 'center', justifyContent: 'center',
            opacity: blink ? 0.25 : 1,
          }}>
            {activeZone && (
              <View style={{
                position: 'absolute',
                width: dispSize + 20, height: dispSize + 20,
                borderRadius: (dispSize + 20) / 2,
                backgroundColor: ZONE_GLOW[activeZone] ?? 'transparent',
              }} />
            )}
            {shieldActive && (
              <View style={[styles.shield, {
                width: dispSize + 12, height: dispSize + 12,
                borderRadius: (dispSize + 12) / 2,
              }]} />
            )}
            <GameSprite
              sprite={ballMaterial === 'metal' ? 'ball_metal' : ballMaterial === 'plastic' ? 'ball_plastic' : 'ball_feather'}
              width={dispSize} height={dispSize}
            />
          </View>
        );
      })()}

      {debugHitboxes && (
        <View style={styles.debugContainer} pointerEvents="none">
          <View style={[styles.debugLabel, { top: 2, left: 8 }]}>
            <Text style={styles.debugLabelText}>HITBOXES + GRID</Text>
          </View>
          {/* Grid lines */}
          {Array.from({ length: CELL_COLS + 1 }, (_, col) => (
            <View key={`grid-v-${col}`} style={{
              position: 'absolute', left: col * (screenWidth / CELL_COLS), top: 0,
              width: 1, height: levelData.worldHeight,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }} />
          ))}
          {(() => {
            const totalRows = Math.ceil((levelData.worldHeight - TOP_OFFSET) / cellSize);
            return Array.from({ length: totalRows + 1 }, (_, row) => (
              <View key={`grid-h-${row}`} style={{
                position: 'absolute', left: 0, top: TOP_OFFSET + row * cellSize,
                width: screenWidth, height: 1,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }} />
            ));
          })()}
          {levelData.obstacles.map((o, i) => (
            <View key={`db-o-${i}`} style={[styles.debugBox, { left: o.x, top: o.y, width: o.width, height: o.height, borderColor: '#ff0' }]} />
          ))}
      {levelData.movingObstacles.map((mo, i) => {
        const offset = mvOffsets[i] ?? 0;
        const ml = mo.axis === 'x' ? mo.x + offset : mo.x;
        const mt = mo.axis === 'y' ? mo.y + offset : mo.y;
        const halfW = mo.width / 2;
        return (
          <Fragment key={`mo-${i}`}>
            <GameSprite sprite="moving_obstacle" width={halfW} height={mo.height}
              resizeMode="stretch"
              style={{ position: 'absolute', left: ml, top: mt }} />
            <GameSprite sprite="moving_obstacle" width={halfW} height={mo.height}
              resizeMode="stretch"
              style={{ position: 'absolute', left: ml + halfW, top: mt }} />
          </Fragment>
        );
      })}
          {levelData.traps.map((t, i) => (
            <View key={`db-t-${i}`} style={[styles.debugBox, { left: t.x, top: t.y, width: t.width, height: t.height, borderColor: '#f00' }]} />
          ))}
          {levelData.collectibles.map((c, i) => (
            !collected[i] && <View key={`db-c-${i}`} style={[styles.debugCircle, { left: c.x - c.radius, top: c.y - c.radius, width: c.radius * 2, height: c.radius * 2, borderRadius: c.radius, borderColor: '#ffd700' }]} />
          ))}
          {levelData.powerUps.map((pu, i) => (
            !collectedPowerUps[i] && <View key={`db-p-${i}`} style={[styles.debugCircle, { left: pu.x - pu.radius, top: pu.y - pu.radius, width: pu.radius * 2, height: pu.radius * 2, borderRadius: pu.radius, borderColor: '#0ff' }]} />
          ))}
          {levelData.zones.map((z, i) => (
            <View key={`db-z-${i}`} style={[styles.debugBox, { left: z.x, top: z.y, width: z.width, height: z.height, borderColor: '#0f0' }]} />
          ))}
          <View style={[styles.debugCircle, {
            left: ballPos.x, top: ballPos.y,
            width: currentSize, height: currentSize,
            borderRadius: currentRadius,
            borderColor: '#fff',
          }]} />
        </View>
      )}

      </View>

      {gameOver && (
        <View style={styles.overlay}>
          <View style={styles.gameOverBox}>
            <Text style={styles.gameOverTitle}>GAME OVER</Text>
            <Text style={styles.gameOverScore}>Score: {score}</Text>
            <TouchableOpacity style={styles.button} onPress={handleReintentar}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleVolverMenu}
            >
              <Text style={styles.buttonText}>Volver al Menú Principal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {gameWon && (
        <View style={styles.overlay}>
          <View style={styles.gameOverBox}>
            <Text style={styles.gameOverTitle}>¡GANASTE!</Text>
            <Text style={styles.gameOverScore}>Score Final: {score}</Text>
            <TouchableOpacity style={styles.button} onPress={handleReintentar}>
              <Text style={styles.buttonText}>Jugar de Nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleVolverMenu}
            >
              <Text style={styles.buttonText}>Volver al Menú Principal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {paused && !gameOver && !gameWon && (
        <View style={styles.overlay}>
          <View style={styles.pauseBox}>
            <Text style={styles.pauseTitle}>PAUSA</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                pausedRef.current = false;
                setPaused(false);
              }}
            >
              <Text style={styles.buttonText}>Reanudar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                setDebugHitboxes((v) => !v);
              }}
            >
              <Text style={styles.buttonText}>{debugHitboxes ? '🔲 Ocultar Hitboxes' : '⬜ Ver Hitboxes'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                pausedRef.current = false;
                setPaused(false);
                handleVolverMenu();
              }}
            >
              <Text style={styles.buttonText}>Salir al Menú</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {startCountdown > 0 && !gameOver && !gameWon && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>
            {startCountdown > 40 ? '3' : startCountdown > 20 ? '2' : '1'}
          </Text>
        </View>
      )}

      <Animated.View pointerEvents="none" style={[styles.fadeOverlay, { opacity: fadeAnim }]} />

      {!gameOver && !gameWon && (
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => {
            pausedRef.current = true;
            setPaused(true);
          }}
        >
          <Text style={styles.pauseButtonText}>⏸</Text>
        </TouchableOpacity>
      )}

      {showNameInput && (
        <View style={styles.overlay}>
          <View style={styles.nameInputBox}>
            <Text style={styles.nameInputTitle}>¡Nuevo Récord!</Text>
            <Text style={styles.nameInputScore}>Score: {score}</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Tu nombre"
              placeholderTextColor="#666"
              maxLength={10}
              value={playerName}
              onChangeText={setPlayerName}
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={handleSubmitName}>
              <Text style={styles.buttonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gameWorld: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: '#111',
    zIndex: 60,
  },
  hudText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  powerUpBarContainer: {
    height: 6,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  powerUpBar: {
    height: 3,
    borderRadius: 2,
  },
  comboCorner: {
    position: 'absolute',
    top: 100,
    left: 16,
    zIndex: 50,
  },
  comboCornerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff6f00',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  shield: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4fc3f7',
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameOverBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: '#e94560',
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 8,
  },
  gameOverScore: {
    fontSize: 22,
    color: '#ffffff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  nameInputBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  nameInputTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  nameInputScore: {
    fontSize: 20,
    color: '#ffffff',
  },
  pauseButton: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    zIndex: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pauseButtonText: {
    fontSize: 22,
    color: '#ffffff',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 100,
    pointerEvents: 'none',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.3)',
  },
  pauseBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pauseTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  debugContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  debugBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#ff0',
  },
  debugCircle: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  debugLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 99,
  },
  debugLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  nameInput: {
    backgroundColor: '#16213e',
    color: '#ffffff',
    fontSize: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f3460',
    textAlign: 'center',
    minWidth: 200,
  },
});
