import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getLevel, type MovingObstacle, type PowerUpType } from '../data/levels';
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

  const shieldRef = useRef(false);
  const sizeRef = useRef(1);
  const shieldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRadius = BALL_RADIUS * sizeRef.current;
  const currentSize = currentRadius * 2;

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

    if (shieldTimer.current) clearTimeout(shieldTimer.current);
    if (sizeTimer.current) clearTimeout(sizeTimer.current);
    shieldRef.current = false;
    sizeRef.current = 1;
    setShieldActive(false);
    setSizeMultiplier(1);

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

      timeRef.current += 1;
      const rad = BALL_RADIUS * sizeRef.current;
      const sz = rad * 2;

      vel.current.x -= ax * SPEED_X * 0.016;
      vel.current.y += ay * SPEED_Y * 0.016;

      vel.current.x *= FRICTION;
      vel.current.y *= FRICTION;

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

      const lvl = getLevel(levelRef.current, screenWidth, screenHeight);

      let hitObstacle = false;
      for (const obs of lvl.obstacles) {
        if (circleRectCollision(bx, by, rad, obs.x, obs.y, obs.width, obs.height)) {
          hitObstacle = true;
          break;
        }
      }

      if (!hitObstacle) {
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

      if (hitObstacle) {
        pos.current = { x: newX, y: newY };
        setBallPos({ x: newX, y: newY });
        if (shieldRef.current) {
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
          newScore += 100;
        }
      }

      for (let i = 0; i < lvl.powerUps.length; i++) {
        if (puCollectedCopy[i]) continue;
        const pu = lvl.powerUps[i];
        if (circleCircleCollision(bx, by, rad, pu.x, pu.y, pu.radius)) {
          puCollectedCopy[i] = true;
          applyPowerUp(pu.type);
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
    } else {
      const mult = type === 'big' ? 1.5 : 0.5;
      if (sizeTimer.current) clearTimeout(sizeTimer.current);
      sizeRef.current = mult;
      setSizeMultiplier(mult);
      sizeTimer.current = setTimeout(() => {
        sizeRef.current = 1;
        setSizeMultiplier(1);
      }, POWERUP_DURATION);
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
          {shieldActive ? '🛡 ' : ''}{sizeMultiplier !== 1 ? (sizeMultiplier > 1 ? '⬆' : '⬇') : ''}{' Nivel: '}{level}/{TOTAL_LEVELS}
        </Text>
      </View>

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
        const color = pu.type === 'shield' ? '#4fc3f7' : pu.type === 'big' ? '#81c784' : '#ffb74d';
        return (
          <View
            key={`pu-${i}`}
            style={[styles.powerUp, {
              left: pu.x - pu.radius,
              top: pu.y - pu.radius,
              width: pu.radius * 2,
              height: pu.radius * 2,
              borderRadius: pu.radius,
              backgroundColor: color,
            }]}
          />
        );
      })}

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
    fontSize: 16,
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
