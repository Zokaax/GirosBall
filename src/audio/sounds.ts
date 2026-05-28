import { Audio } from 'expo-av';

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    initialized = true;
  } catch {}
}

function generateWavUri(freq: number, durationMs: number, volume: number = 0.3): string {
  const sr = 22050;
  const ns = Math.floor((sr * durationMs) / 1000);
  const bps = 8;
  const ch = 1;
  const br = sr * ch * (bps / 8);
  const ba = ch * (bps / 8);
  const ds = ns * ba;
  const hs = 44;
  const buf = new ArrayBuffer(hs + ds);
  const dv = new DataView(buf);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, hs + ds - 8, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, ch, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, br, true); dv.setUint16(32, ba, true);
  dv.setUint16(34, bps, true); w(36, 'data');
  dv.setUint32(40, ds, true);
  const el = Math.min(Math.floor(sr * 0.005), Math.floor(ns / 4));
  for (let i = 0; i < ns; i++) {
    const t = i / sr;
    let env = 1;
    if (i < el) env = i / el;
    if (i > ns - el) env = (ns - i) / el;
    const s = Math.sin(2 * Math.PI * freq * t) * volume * env;
    dv.setUint8(hs + i, Math.max(0, Math.min(255, Math.floor((s * 0.5 + 0.5) * 255))));
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

function generateMultiToneUri(tones: { freq: number; durationMs: number }[], volume: number = 0.3): string {
  const sr = 22050;
  const totalNs = tones.reduce((s, t) => s + Math.floor((sr * t.durationMs) / 1000), 0);
  const bps = 8, ch = 1;
  const br = sr * ch * (bps / 8), ba = ch * (bps / 8), ds = totalNs * ba, hs = 44;
  const buf = new ArrayBuffer(hs + ds);
  const dv = new DataView(buf);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, hs + ds - 8, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, ch, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, br, true); dv.setUint16(32, ba, true);
  dv.setUint16(34, bps, true); w(36, 'data');
  dv.setUint32(40, ds, true);
  let idx = 0;
  const el = Math.floor(sr * 0.003);
  for (const tone of tones) {
    const ns = Math.floor((sr * tone.durationMs) / 1000);
    for (let i = 0; i < ns; i++) {
      const t = i / sr;
      let env = 1;
      if (i < el) env = i / el;
      if (i > ns - el) env = (ns - i) / el;
      const s = Math.sin(2 * Math.PI * tone.freq * t) * volume * env;
      dv.setUint8(hs + idx, Math.max(0, Math.min(255, Math.floor((s * 0.5 + 0.5) * 255))));
      idx++;
    }
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

async function playUri(uri: string, volume: number = 1) {
  await ensureInit();
  try {
    const { sound } = await Audio.Sound.createAsync({ uri }, { volume });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
    await sound.playAsync();
  } catch {}
}

let coinUris: string[] | null = null;
let deathUri: string | null = null;
let powerUpUri: string | null = null;
let levelCompleteUri: string | null = null;
let bounceUri: string | null = null;
let buttonUri: string | null = null;

export async function playCoinSound() {
  if (!coinUris) coinUris = [
    generateMultiToneUri([{ freq: 1200, durationMs: 60 }, { freq: 1600, durationMs: 70 }], 0.2),
    generateMultiToneUri([{ freq: 1400, durationMs: 55 }, { freq: 1800, durationMs: 65 }], 0.18),
    generateMultiToneUri([{ freq: 1000, durationMs: 50 }, { freq: 1300, durationMs: 50 }, { freq: 1600, durationMs: 60 }], 0.2),
  ];
  await playUri(coinUris[Math.floor(Math.random() * coinUris.length)], 0.4);
}

export async function playDeathSound() {
  if (!deathUri) deathUri = generateMultiToneUri([
    { freq: 440, durationMs: 150 },
    { freq: 220, durationMs: 200 },
  ], 0.3);
  await playUri(deathUri, 0.6);
}

export async function playPowerUpSound() {
  if (!powerUpUri) powerUpUri = generateMultiToneUri([
    { freq: 440, durationMs: 80 },
    { freq: 660, durationMs: 80 },
    { freq: 880, durationMs: 80 },
  ], 0.25);
  await playUri(powerUpUri, 0.5);
}

export async function playLevelCompleteSound() {
  if (!levelCompleteUri) levelCompleteUri = generateMultiToneUri([
    { freq: 523, durationMs: 120 },
    { freq: 659, durationMs: 120 },
    { freq: 784, durationMs: 120 },
    { freq: 1047, durationMs: 250 },
  ], 0.3);
  await playUri(levelCompleteUri, 0.6);
}

export async function playBounceSound() {
  if (!bounceUri) bounceUri = generateWavUri(200, 50, 0.2);
  await playUri(bounceUri, 0.3);
}

export async function playButtonSound() {
  if (!buttonUri) buttonUri = generateWavUri(1000, 30, 0.15);
  await playUri(buttonUri, 0.4);
}

// Background music
let musicSound: Audio.Sound | null = null;
let musicVolume = 0.5;
let musicMuted = false;

function generateMusicBpm(level: number): number {
  return 90 + level * 3;
}

function generateMusicUri(level: number): string {
  const bpm = generateMusicBpm(level);
  const beatMs = 60000 / bpm;
  const bars = 2;
  const tones: { freq: number; durationMs: number }[] = [];

  const bassNotes = [110, 110, 147, 110];
  const arpNotes = [
    440, 523, 659, 784, 659, 523, 440, 392,
    440, 523, 659, 784, 659, 523, 440, 392,
  ];

  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const bassFreq = bassNotes[(bar * 4 + beat) % bassNotes.length];
      const isStrongBeat = beat === 0 || beat === 2;

      if (isStrongBeat) {
        tones.push({ freq: bassFreq, durationMs: beatMs * 0.25 });
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2) % arpNotes.length], durationMs: beatMs * 0.25 });
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2 + 1) % arpNotes.length], durationMs: beatMs * 0.25 });
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2 + 2) % arpNotes.length], durationMs: beatMs * 0.25 });
      } else {
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2) % arpNotes.length], durationMs: beatMs * 0.25 });
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2 + 1) % arpNotes.length], durationMs: beatMs * 0.25 });
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2 + 2) % arpNotes.length], durationMs: beatMs * 0.25 });
        tones.push({ freq: arpNotes[(bar * 8 + beat * 2 + 3) % arpNotes.length], durationMs: beatMs * 0.25 });
      }
    }
  }

  return generateMultiToneUri(tones, 0.35);
}

export function updateMusic(level: number) {
  const uri = generateMusicUri(level);
  (async () => {
    try {
      if (musicSound) {
        await musicSound.unloadAsync();
        musicSound = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { volume: musicMuted ? 0 : musicVolume, isLooping: true },
      );
      musicSound = sound;
      await musicSound.playAsync();
    } catch {}
  })();
}

export async function stopMusic() {
  if (musicSound) {
    try {
      await musicSound.stopAsync();
      await musicSound.unloadAsync();
    } catch {}
    musicSound = null;
  }
}

export async function pauseMusic() {
  if (musicSound) {
    try {
      await musicSound.pauseAsync();
    } catch {}
  }
}

export async function resumeMusic() {
  if (musicSound && !musicMuted) {
    try {
      await musicSound.playAsync();
    } catch {}
  }
}

export function toggleMusicMute(): boolean {
  musicMuted = !musicMuted;
  const vol = musicMuted ? 0 : musicVolume;
  if (musicSound) musicSound.setVolumeAsync(vol);
  return musicMuted;
}

export function setMusicVolume(v: number) {
  musicVolume = v;
  if (musicSound && !musicMuted) musicSound.setVolumeAsync(v);
}
