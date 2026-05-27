export type SpriteKey =
  | 'ball_metal' | 'ball_plastic' | 'ball_feather'
  | 'coin'
  | 'obstacle' | 'moving_obstacle'
  | 'trap_spike' | 'trap_disappearing'
  | 'powerup_shield' | 'powerup_big' | 'powerup_small'
  | 'powerup_metal' | 'powerup_plastic' | 'powerup_feather'
  | 'zone_wind' | 'zone_magnetic' | 'zone_ice' | 'zone_mud'
  | 'bar_shield' | 'bar_size';

export type SpriteInfo = {
  file: string;
  width: number;
  height: number;
};

export const SPRITE_MAP: Record<SpriteKey, SpriteInfo> = {
  ball_metal:       { file: 'spr_0_0.png', width: 109, height: 118 },
  ball_plastic:     { file: 'spr_0_1.png', width: 120, height: 119 },
  ball_feather:     { file: 'spr_0_4.png', width: 107, height: 118 },
  coin:             { file: 'spr_0_3.png', width: 120, height: 119 },

  obstacle:         { file: 'spr_2_0.png', width: 109, height: 128 },
  moving_obstacle:  { file: 'spr_3_0.png', width: 108, height: 128 },

  trap_spike:       { file: 'spr_5_0.png', width: 105, height: 128 },
  trap_disappearing:{ file: 'spr_6_3.png', width: 120, height: 115 },

  powerup_shield:   { file: 'spr_0_5.png', width: 104, height: 118 },
  powerup_big:      { file: 'spr_1_1.png', width: 120, height: 128 },
  powerup_small:    { file: 'spr_1_3.png', width: 118, height: 128 },
  powerup_metal:    { file: 'spr_1_0.png', width: 109, height: 128 },
  powerup_plastic:  { file: 'spr_1_2.png', width: 120, height: 128 },
  powerup_feather:  { file: 'spr_0_2.png', width: 120, height: 119 },

  zone_wind:        { file: 'spr_6_0.png', width: 112, height: 113 },
  zone_magnetic:    { file: 'spr_6_1.png', width: 120, height: 117 },
  zone_ice:         { file: 'spr_6_2.png', width: 120, height: 111 },
  zone_mud:         { file: 'spr_6_4.png', width: 110, height: 116 },

  bar_shield:       { file: 'spr_1_4.png', width: 94, height: 16 },
  bar_size:         { file: 'spr_1_5.png', width: 95, height: 16 },
};
