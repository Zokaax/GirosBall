import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { getUnlockedLevel } from '../data/progress';

const COLS = 4;
const TOTAL_LEVELS = 20;

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

export default function LevelSelectScreen({ navigation }: Props) {
  const [unlocked, setUnlocked] = useState(1);

  useFocusEffect(
    useCallback(() => {
      getUnlockedLevel().then(setUnlocked);
    }, []),
  );

  const levels = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);

  const rows: number[][] = [];
  for (let i = 0; i < levels.length; i += COLS) {
    rows.push(levels.slice(i, i + COLS));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seleccionar Nivel</Text>
      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.grid}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((lvl) => {
              const locked = lvl > unlocked;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.cell, locked && styles.cellLocked]}
                  onPress={() => {
                    if (!locked) navigation.navigate('Game', { startLevel: lvl });
                  }}
                  activeOpacity={locked ? 1 : 0.6}
                >
                  <Text style={[styles.cellText, locked && styles.cellTextLocked]}>
                    {locked ? '🔒' : lvl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Volver</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 16,
  },
  cell: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLocked: {
    backgroundColor: '#0d1117',
    borderColor: '#1a1a2e',
    opacity: 0.6,
  },
  cellText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cellTextLocked: {
    fontSize: 24,
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
