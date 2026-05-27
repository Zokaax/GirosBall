import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ScreenOrientation from 'expo-screen-orientation';

import MenuScreen from './src/screens/MenuScreen';
import GameScreen from './src/screens/GameScreen';
import HighScoresScreen from './src/screens/HighScoresScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Menu"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Menu" component={MenuScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="HighScores" component={HighScoresScreen} />
        <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
