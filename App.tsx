import { StatusBar } from 'expo-status-bar';
import SpriteDebugScreen from './src/graphics/SpriteDebugScreen';

export default function App() {
  return (
    <>
      <SpriteDebugScreen />
      <StatusBar style="light" />
    </>
  );
}
