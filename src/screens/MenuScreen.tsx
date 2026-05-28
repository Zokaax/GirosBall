import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { playButtonSound } from '../audio/sounds';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

export default function MenuScreen({ navigation }: Props) {
  const nav = useCallback((route: string, params?: any) => {
    playButtonSound();
    setTimeout(() => navigation.navigate(route as any, params), 50);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Giros Ball</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => nav('Game', { startLevel: 1 })}
      >
        <Text style={styles.buttonText}>Jugar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => nav('LevelSelect')}
      >
        <Text style={styles.buttonText}>Seleccionar Nivel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => nav('HighScores')}
      >
        <Text style={styles.buttonText}>High Scores</Text>
      </TouchableOpacity>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 40,
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#16213e',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
  },
});
