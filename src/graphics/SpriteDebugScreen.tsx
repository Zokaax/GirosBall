import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SPRITE_MAP, type SpriteKey } from './sprites';
import GameSprite from './Sprite';

const spriteKeys = Object.keys(SPRITE_MAP) as SpriteKey[];

export default function SpriteDebugScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.grid}>
      {spriteKeys.map((key) => (
        <View key={key} style={styles.cell}>
          <GameSprite sprite={key} width={60} height={60} />
          <Text style={styles.label}>{key}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  cell: { width: '25%', alignItems: 'center', marginVertical: 10 },
  label: { color: '#fff', fontSize: 10, marginTop: 4, textAlign: 'center' },
});
