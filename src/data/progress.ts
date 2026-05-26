import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@girosball_unlocked_level';

let cachedUnlocked: number | null = null;

export async function getUnlockedLevel(): Promise<number> {
  if (cachedUnlocked !== null) return cachedUnlocked;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      cachedUnlocked = parseInt(raw, 10);
      return cachedUnlocked;
    }
  } catch {}
  cachedUnlocked = 1;
  return cachedUnlocked;
}

export async function unlockNextLevel(completedLevel: number): Promise<number> {
  const current = await getUnlockedLevel();
  const next = Math.max(current, completedLevel + 1);
  cachedUnlocked = next;
  try {
    await AsyncStorage.setItem(KEY, String(next));
  } catch {}
  return next;
}
