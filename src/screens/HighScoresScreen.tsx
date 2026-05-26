import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { loadScores, type HighScoreEntry } from '../data/highScores';

type Props = NativeStackScreenProps<RootStackParamList, 'HighScores'>;

export default function HighScoresScreen({ navigation }: Props) {
  const [scores, setScores] = useState<HighScoreEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadScores().then(setScores);
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>High Scores</Text>
      <FlatList
        data={scores}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.score}>{item.score}</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e94560',
    width: 40,
  },
  name: {
    fontSize: 18,
    color: '#ffffff',
    flex: 1,
  },
  score: {
    fontSize: 18,
    color: '#ffd700',
    fontWeight: '600',
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
