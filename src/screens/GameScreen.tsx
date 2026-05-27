import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getLevel, type BallMaterial, type MovingObstacle, type PowerUpType, type Trap, type Zone } from '../data/levels';
import { circleCircleCollision, circleRectCollision } from '../utils/collision';
import { loadScores, isHighScore, insertScore, saveScores } from '../data/highScores';
import { unlockNextLevel } from '../data/progress';

const BALL_RADIUS = 20;
const BALL_SIZE = BALL_RADIUS * 2;
const SPEED_X = 1400;
const SPEED_Y = 1200;
const FRICTION = 0.97;
const HUD_HEIGHT = 90;
const INITIAL_LIVES = 5;
const TOTAL_LEVELS = 20;
const POWERUP_DURATION = 6000;

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ navigation, route }: Props) {
  const startLevel = route.params?.startLevel ?? 1;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const centerX = screenWidth / 2 - BALL_SIZE / 2;
  const centerY = screenHeight / 2 - BALL_SIZE / 2;

  const [ballPos, setBallPos] = useState({ x: centerX, y: centerY });
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
  const [comboCount, setComboCount] = useState(0);
  const [powerUpProgress, setPowerUpProgress] = useState({ shield: 0, size: 0 });

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

  const ZONE_COLORS: Record<string, string> = {
    wind: 'rgba(100,180,255,0.35)',
    magnetic: 'rgba(200,100,255,0.35)',
    ice: 'rgba(180,230,255,0.35)',
    mud: 'rgba(140,100,60,0.35)',
  };

  const BALL_COLORS: Record<BallMaterial, string> = {
    metal: '#b0bec5',
    plastic: '#4dd0e1',
    feather: '#fff176',
  };

  const ZONE_GLOW: Record<string, string> = {
    wind: 'rgba(100,180,255,0.4)',
    magnetic: 'rgba(200,100,255,0.4)',
    ice: 'rgba(180,230,255,0.4)',
    mud: 'rgba(140,100,60,0.4)',
  };

  const ZONE_BORDERS: Record<string, string> = {
    wind: 'rgba(100,180,255,0.7)',
    magnetic: 'rgba(200,100,255,0.7)',
    ice: 'rgba(180,230,255,0.7)',
    mud: 'rgba(140,100,60,0.7)',
  };

  const ballMaterialRef = useRef<BallMaterial>('plastic');
  const activeZoneRef = useRef<string | null>(null);
  const shieldRef = useRef(false);
  const sizeRef = useRef(1);
  const shieldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRadius = BALL_RADIUS * sizeRef.current;
  const currentSize = currentRadius * 2;

  const pausedRef = useRef(false);
  const levelTimeRef = useRef(0);
  const startDelayRef = useRef(0);
  const comboRef = useRef(0);
  const lastCollectFrameRef = useRef(0);
  const shieldStartRef = useRef(0);
  const sizeStartRef = useRef(0);

  const pos = useRef({ x: centerX, y: centerY });
  const vel = useRef({ x: 0, y: 0 });
  const livesRef = useRef(INITIAL_LIVES);
  const gameOverRef = useRef(false);
  const levelRef = useRef(startLevel);
  const scoreRef = useRef(0);
  const timeRef = useRef(0);

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

    pos.current = { x: centerX, y: centerY };
    vel.current = { x: 0, y: 0 };
    setBallPos({ x: centerX, y: centerY });
    timeRef.current = 0;
  }, [centerX, centerY, screenWidth, screenHeight]);

  useEffect(() => {
    initLevel();
  }, [level, initLevel]);

  const resetBall = useCallback(() => {
    pos.current = { x: centerX, y: centerY };
    vel.current = { x: 0, y: 0 };
    setBallPos({ x: centerX, y: centerY });
  }, [centerX, centerY]);

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

      timeRef.current += 1;
      const rad = BALL_RADIUS * sizeRef.current;
      const sz = rad * 2;

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
      } else if (newY > screenHeight - sz) {
        newY = screenHeight - sz;
        vel.current.y *= -0.5;
      }

      const bx = newX + rad;
      const by = newY + rad;

      const mult = MATERIAL_MULT[mat];
      const lvl = getLevel(levelRef.current, screenWidth, screenHeight);
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

      let hitObstacle = false;
      for (const obs of lvl.obstacles) {
        if (circleRectCollision(bx, by, rad, obs.x, obs.y, obs.width, obs.height)) {
          hitObstacle = true;
          break;
        }
      }

      let hitTrap = false;
      if (!hitObstacle) {
        for (const trap of lvl.traps) {
          if (trap.type === 'disappearing') {
            const phase = Math.sin(timeRef.current * 0.03 + trap.phase * Math.PI * 2);
            if (phase < 0) continue;
          }
          if (circleRectCollision(bx, by, rad, trap.x, trap.y, trap.width, trap.height)) {
            hitTrap = true;
            break;
          }
        }
      }

      if (!hitObstacle && !hitTrap) {
        for (let i = 0; i < lvl.movingObstacles.length; i++) {
          const mo = lvl.movingObstacles[i];
          const offset = mvOffsetsRef.current[i] ?? 0;
          let mx = mo.x;
          let my = mo.y;
          if (mo.axis === 'x') mx += offset;
          else my += offset;

          if (circleRectCollision(bx, by, rad, mx, my, mo.width, mo.height)) {
            hitObstacle = true;
            break;
          }
        }
      }

      if (hitObstacle || hitTrap) {
        pos.current = { x: newX, y: newY };
        setBallPos({ x: newX, y: newY });
        if (shieldRef.current && !hitTrap) {
          vel.current.x *= -0.5;
          vel.current.y *= -0.5;
          const pushX = pos.current.x + vel.current.x * 0.04;
          const pushY = pos.current.y + vel.current.y * 0.04;
          pos.current.x = Math.max(0, Math.min(screenWidth - rad * 2, pushX));
          pos.current.y = Math.max(HUD_HEIGHT, Math.min(screenHeight - rad * 2, pushY));
          setBallPos({ x: pos.current.x, y: pos.current.y });
        }
        die();
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
          nextLevel();
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
      const oldR = BALL_RADIUS * sizeRef.current;
      const newR = BALL_RADIUS * mult;
      pos.current.x += oldR - newR;
      pos.current.y += oldR - newR;
      sizeRef.current = mult;
      setSizeMultiplier(mult);
      setBallPos({ x: pos.current.x, y: pos.current.y });
      const resetSize = () => {
        const oldR2 = BALL_RADIUS * sizeRef.current;
        pos.current.x += oldR2 - BALL_RADIUS;
        pos.current.y += oldR2 - BALL_RADIUS;
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
  };

  const handleVolverMenu = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Menu' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <Text style={styles.hudText}>
          {'♥'.repeat(Math.max(0, lives))}
        </Text>
        <Text style={styles.hudText}>Score: {score}</Text>
        <Text style={styles.hudText}>
          ⏱ {String(Math.floor(levelTime / 3600)).padStart(2, '0')}:{String(Math.floor(levelTime / 60) % 60).padStart(2, '0')}
        </Text>
        <Text style={styles.hudText}>
          {ballMaterial === 'metal' ? '🔩' : ballMaterial === 'feather' ? '🪶' : '🧊'}{' '}
          {shieldActive ? '🛡 ' : ''}{sizeMultiplier !== 1 ? (sizeMultiplier > 1 ? '⬆' : '⬇') : ''}{' '}
          {activeZone ? (activeZone === 'wind' ? '💨' : activeZone === 'magnetic' ? '🧲' : activeZone === 'ice' ? '❄️' : '💩') : ''}{' '}
          Nv:{level}
        </Text>
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

      {levelData.obstacles.map((obs, i) => (
        <View
          key={`obs-${i}`}
          style={[styles.obstacle, { left: obs.x, top: obs.y, width: obs.width, height: obs.height }]}
        />
      ))}

      {levelData.movingObstacles.map((mo, i) => {
        const offset = mvOffsets[i] ?? 0;
        const mLeft = mo.axis === 'x' ? mo.x + offset : mo.x;
        const mTop = mo.axis === 'y' ? mo.y + offset : mo.y;
        return (
          <View
            key={`mov-${i}`}
            style={[styles.movingObstacle, { left: mLeft, top: mTop, width: mo.width, height: mo.height }]}
          />
        );
      })}

      {levelData.traps.map((trap, i) => {
        if (trap.type === 'disappearing') {
          const phase = Math.sin(timeRef.current * 0.03 + trap.phase * Math.PI * 2);
          if (phase < 0) return null;
        }
        return (
          <View
            key={`trap-${i}`}
            style={[styles.trap, trap.type === 'spike' ? styles.trapSpike : styles.trapDisappearing, {
              left: trap.x, top: trap.y,
              width: trap.width, height: trap.height,
            }]}
          />
        );
      })}

      {levelData.zones.map((z, i) => (
        <View
          key={`zone-${i}`}
          style={[styles.zone, {
            left: z.x, top: z.y,
            width: z.width, height: z.height,
            backgroundColor: ZONE_COLORS[z.type],
            borderColor: ZONE_BORDERS[z.type],
          }]}
        />
      ))}

      {levelData.collectibles.map((c, i) => {
        if (collected[i]) return null;
        return (
          <View
            key={`coin-${i}`}
            style={[styles.collectible, { left: c.x - c.radius, top: c.y - c.radius, width: c.radius * 2, height: c.radius * 2, borderRadius: c.radius }]}
          />
        );
      })}

      {levelData.powerUps.map((pu, i) => {
        if (collectedPowerUps[i]) return null;
        const r = pu.radius;
        const isShield = pu.type === 'shield';
        const isMetal = pu.type === 'metal';
        const isPlastic = pu.type === 'plastic';
        const isFeather = pu.type === 'feather';
        const isBig = pu.type === 'big';
        const isSmall = pu.type === 'small';
        const color = isShield ? '#4fc3f7' : isBig ? '#81c784' : isSmall ? '#ffb74d' :
          isMetal ? '#9e9e9e' : isPlastic ? '#80cbc4' : '#ffcc02';
        const shape = isShield ? 'shield' : isBig ? 'big' : isSmall ? 'small' :
          isMetal ? 'square' : isPlastic ? 'diamond' : 'triangle';

        if (shape === 'diamond') {
          return (
            <View key={`pu-${i}`} style={{
              position: 'absolute',
              left: pu.x - r, top: pu.y - r,
              width: r * 2, height: r * 2,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                width: r * 1.4, height: r * 1.4,
                backgroundColor: color,
                transform: [{ rotate: '45deg' }],
                borderRadius: 3,
                borderWidth: 2, borderColor: '#ffffff',
              }} />
            </View>
          );
        }

        if (shape === 'triangle') {
          return (
            <View key={`pu-${i}`} style={{
              position: 'absolute',
              left: pu.x - r, top: pu.y - r,
              width: r * 2, height: r * 2,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                width: 0, height: 0,
                borderLeftWidth: r * 0.8,
                borderRightWidth: r * 0.8,
                borderBottomWidth: r * 1.6,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: color,
              }} />
            </View>
          );
        }

        if (shape === 'square') {
          return (
            <View key={`pu-${i}`} style={{
              position: 'absolute',
              left: pu.x - r, top: pu.y - r,
              width: r * 2, height: r * 2,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                width: r * 1.6, height: r * 1.6,
                backgroundColor: color,
                borderRadius: 3,
                borderWidth: 2, borderColor: '#ffffff',
              }} />
            </View>
          );
        }

        const innerR = shape === 'big' ? r * 0.6 : shape === 'small' ? r * 0.3 : r * 0.55;
        return (
          <View key={`pu-${i}`} style={{
            position: 'absolute',
            left: pu.x - r, top: pu.y - r,
            width: r * 2, height: r * 2,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              width: r * 2, height: r * 2,
              borderRadius: r,
              backgroundColor: color,
              borderWidth: shape === 'shield' ? 3 : 0,
              borderColor: '#ffffff',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                width: innerR * 2, height: innerR * 2,
                borderRadius: innerR,
                backgroundColor: 'rgba(255,255,255,0.5)',
              }} />
            </View>
          </View>
        );
      })}

      {comboCount >= 2 && timeRef.current - lastCollectFrameRef.current < 120 && (
        <View style={styles.comboCorner}>
          <Text style={styles.comboCornerText}>🔥 x{comboCount}</Text>
        </View>
      )}

      {activeZone && (
        <View style={{
          position: 'absolute',
          left: ballPos.x - 10,
          top: ballPos.y - 10,
          width: currentSize + 20,
          height: currentSize + 20,
          borderRadius: (currentSize + 20) / 2,
          backgroundColor: ZONE_GLOW[activeZone] ?? 'transparent',
        }} />
      )}

      {shieldActive && (
        <View style={[styles.shield, {
          left: ballPos.x - 6,
          top: ballPos.y - 6,
          width: currentSize + 12,
          height: currentSize + 12,
          borderRadius: (currentSize + 12) / 2,
        }]} />
      )}

      <View style={[styles.ball, {
        left: ballPos.x,
        top: ballPos.y,
        width: currentSize,
        height: currentSize,
        borderRadius: currentRadius,
        backgroundColor: BALL_COLORS[ballMaterial],
      }]} />

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
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  hudText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_RADIUS,
    backgroundColor: '#e94560',
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: '#533483',
    borderRadius: 4,
  },
  movingObstacle: {
    position: 'absolute',
    backgroundColor: '#e07c24',
    borderRadius: 4,
  },
  trap: {
    position: 'absolute',
    borderRadius: 4,
  },
  trapSpike: {
    backgroundColor: '#e53935',
    borderWidth: 2,
    borderColor: '#ff1744',
    transform: [{ rotate: '45deg' }],
  },
  trapDisappearing: {
    backgroundColor: 'rgba(100,200,255,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(100,200,255,0.8)',
    borderStyle: 'dashed',
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
    top: 56,
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
  zone: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  collectible: {
    position: 'absolute',
    backgroundColor: '#ffd700',
  },
  powerUp: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffffff',
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
