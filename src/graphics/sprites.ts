export type SpriteKey =
  | 'ball_metal' | 'ball_plastic' | 'ball_feather'
  | 'coin'
  | 'obstacle' | 'moving_obstacle'
  | 'trap_spike' | 'trap_disappearing'
  | 'powerup_shield' | 'powerup_big' | 'powerup_small'
  | 'powerup_metal' | 'powerup_plastic' | 'powerup_feather'
  | 'zone_wind' | 'zone_magnetic' | 'zone_ice' | 'zone_mud';

export type SpriteInfo = {
  file: string;
  width: number;
  height: number;
};

export const SPRITE_MAP: Record<SpriteKey, SpriteInfo> = {
  ball_metal:       { file: 'spr_0_0.png', width: 127, height: 127 },
  ball_plastic:     { file: 'spr_0_1.png', width: 131, height: 128 },
  ball_feather:     { file: 'spr_0_2.png', width: 128, height: 128 },

  powerup_shield:   { file: 'spr_1_0.png', width: 128, height: 128 },
  powerup_big:      { file: 'spr_1_1.png', width: 131, height: 128 },
  powerup_small:    { file: 'spr_1_2.png', width: 128, height: 129 },

  powerup_metal:    { file: 'spr_2_0.png', width: 128, height: 130 },
  powerup_plastic:  { file: 'spr_2_1.png', width: 120, height: 100 },
  powerup_feather:  { file: 'spr_2_2.png', width: 118, height: 120 },

  coin:             { file: 'spr_3_0.png', width: 122, height: 130 },
  trap_spike:       { file: 'spr_3_1.png', width: 136, height: 116 },
  trap_disappearing:{ file: 'spr_3_2.png', width: 150, height: 91 },

  obstacle:         { file: 'spr_4_0.png', width: 135, height: 149 },
  moving_obstacle:  { file: 'spr_4_2.png', width: 150, height: 148 },

  zone_wind:        { file: 'spr_5_0.png', width: 138, height: 120 },
  zone_magnetic:    { file: 'spr_5_2.png', width: 132, height: 117 },
  zone_ice:         { file: 'spr_5_4.png', width: 115, height: 123 },
  zone_mud:         { file: 'spr_5_6.png', width: 122, height: 122 },
};
