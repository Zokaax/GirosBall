export type SpriteKey =
  | 'ball_metal' | 'ball_plastic' | 'ball_feather'
  | 'coin'
  | 'obstacle_left' | 'obstacle_right' | 'moving_obstacle'
  | 'trap_spike' | 'trap_disappearing'
  | 'powerup_shield' | 'powerup_big' | 'powerup_small'
  | 'powerup_metal' | 'powerup_plastic' | 'powerup_feather'
  | 'zone_wind' | 'zone_magnetic' | 'zone_ice' | 'zone_mud'
  | 'rotting_floor' | 'fragile_wall' | 'wall_brick' | 'wall_tile'
  | 'ice_whole' | 'ice_cracked' | 'ice_broken' | 'ice_floor'
  | 'particle_sparkle' | 'particle_explosion1' | 'particle_explosion2' | 'particle_smoke';

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

  obstacle_left:    { file: 'spr_4_0.png', width: 135, height: 149 },
  obstacle_right:   { file: 'spr_4_1.png', width: 135, height: 149 },
  moving_obstacle:  { file: 'spr_4_2.png', width: 150, height: 148 },

  zone_wind:        { file: 'spr_5_0.png', width: 138, height: 120 },
  zone_magnetic:    { file: 'spr_5_2.png', width: 132, height: 117 },
  zone_ice:         { file: 'spr_5_4.png', width: 115, height: 123 },
  zone_mud:         { file: 'spr_5_6.png', width: 122, height: 122 },

  rotting_floor:    { file: 'spr_6_0.png', width: 300, height: 299 },
  fragile_wall:     { file: 'spr_6_1.png', width: 300, height: 299 },
  wall_brick:       { file: 'spr_6_2.png', width: 300, height: 299 },
  wall_tile:        { file: 'spr_6_3.png', width: 300, height: 299 },
  ice_whole:        { file: 'spr_7_0.png', width: 300, height: 298 },
  ice_cracked:      { file: 'spr_7_1.png', width: 300, height: 298 },
  ice_broken:       { file: 'spr_7_2.png', width: 300, height: 298 },
  ice_floor:        { file: 'spr_7_3.png', width: 300, height: 298 },
  particle_sparkle: { file: 'spr_8_0.png', width: 300, height: 299 },
  particle_explosion1: { file: 'spr_8_1.png', width: 300, height: 299 },
  particle_explosion2: { file: 'spr_8_2.png', width: 300, height: 299 },
  particle_smoke:   { file: 'spr_8_3.png', width: 300, height: 299 },
};
