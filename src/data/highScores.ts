import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@girosball_highscores';
const MAX_SCORES = 10;

export type HighScoreEntry = {
  name: string;
  score: number;
};

const DEFAULT_SCORES: HighScoreEntry[] = [
  { name: 'Juan', score: 5000 },
  { name: 'Pedro', score: 4500 },
  { name: 'María', score: 4000 },
  { name: 'Ana', score: 3500 },
  { name: 'Luis', score: 3000 },
  { name: 'Sofía', score: 2500 },
  { name: 'Carlos', score: 2000 },
  { name: 'Elena', score: 1500 },
  { name: 'Diego', score: 1000 },
  { name: 'Laura', score: 500 },
];

let cachedScores: HighScoreEntry[] | null = null;

export async function loadScores(): Promise<HighScoreEntry[]> {
  if (cachedScores) return cachedScores;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedScores = JSON.parse(raw) as HighScoreEntry[];
      return cachedScores;
    }
  } catch {}
  cachedScores = [...DEFAULT_SCORES];
  return cachedScores;
}

export async function saveScores(scores: HighScoreEntry[]): Promise<void> {
  cachedScores = scores;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {}
}

export function isHighScore(scores: HighScoreEntry[], score: number): boolean {
  if (scores.length < MAX_SCORES) return true;
  return score > scores[scores.length - 1].score;
}

export function insertScore(scores: HighScoreEntry[], entry: HighScoreEntry): HighScoreEntry[] {
  const updated = [...scores, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);
  return updated;
}
