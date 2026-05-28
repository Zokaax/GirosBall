import { Image, StyleSheet, View } from 'react-native';
import { SPRITE_MAP, type SpriteKey } from './sprites';

const spriteAssets: Record<string, any> = {
  'spr_0_0.png': require('../../assets/sprites/spr_0_0.png'),
  'spr_0_1.png': require('../../assets/sprites/spr_0_1.png'),
  'spr_0_2.png': require('../../assets/sprites/spr_0_2.png'),
  'spr_0_3.png': require('../../assets/sprites/spr_0_3.png'),
  'spr_0_4.png': require('../../assets/sprites/spr_0_4.png'),
  'spr_1_0.png': require('../../assets/sprites/spr_1_0.png'),
  'spr_1_1.png': require('../../assets/sprites/spr_1_1.png'),
  'spr_1_2.png': require('../../assets/sprites/spr_1_2.png'),
  'spr_2_0.png': require('../../assets/sprites/spr_2_0.png'),
  'spr_2_1.png': require('../../assets/sprites/spr_2_1.png'),
  'spr_2_2.png': require('../../assets/sprites/spr_2_2.png'),
  'spr_3_0.png': require('../../assets/sprites/spr_3_0.png'),
  'spr_3_1.png': require('../../assets/sprites/spr_3_1.png'),
  'spr_3_2.png': require('../../assets/sprites/spr_3_2.png'),
  'spr_4_0.png': require('../../assets/sprites/spr_4_0.png'),
  'spr_4_1.png': require('../../assets/sprites/spr_4_1.png'),
  'spr_4_2.png': require('../../assets/sprites/spr_4_2.png'),
  'spr_5_0.png': require('../../assets/sprites/spr_5_0.png'),
  'spr_5_1.png': require('../../assets/sprites/spr_5_1.png'),
  'spr_5_2.png': require('../../assets/sprites/spr_5_2.png'),
  'spr_5_3.png': require('../../assets/sprites/spr_5_3.png'),
  'spr_5_4.png': require('../../assets/sprites/spr_5_4.png'),
  'spr_5_5.png': require('../../assets/sprites/spr_5_5.png'),
  'spr_5_6.png': require('../../assets/sprites/spr_5_6.png'),
  'spr_6_0.png': require('../../assets/sprites/spr_6_0.png'),
  'spr_6_1.png': require('../../assets/sprites/spr_6_1.png'),
  'spr_6_2.png': require('../../assets/sprites/spr_6_2.png'),
  'spr_6_3.png': require('../../assets/sprites/spr_6_3.png'),
  'spr_7_0.png': require('../../assets/sprites/spr_7_0.png'),
  'spr_7_1.png': require('../../assets/sprites/spr_7_1.png'),
  'spr_7_2.png': require('../../assets/sprites/spr_7_2.png'),
  'spr_7_3.png': require('../../assets/sprites/spr_7_3.png'),
  'spr_8_0.png': require('../../assets/sprites/spr_8_0.png'),
  'spr_8_1.png': require('../../assets/sprites/spr_8_1.png'),
  'spr_8_2.png': require('../../assets/sprites/spr_8_2.png'),
  'spr_8_3.png': require('../../assets/sprites/spr_8_3.png'),
};

type Props = {
  sprite: SpriteKey;
  width?: number;
  height?: number;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  style?: object;
};

export default function GameSprite({ sprite, width, height, resizeMode = 'contain', style }: Props) {
  const info = SPRITE_MAP[sprite];
  const w = width ?? info.width;
  const h = height ?? info.height;
  const source = spriteAssets[info.file];
  if (!source) return null;

  return (
    <View style={[{ width: w, height: h, overflow: 'hidden' }, style]}>
      <Image source={source} style={styles.image} resizeMode={resizeMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
