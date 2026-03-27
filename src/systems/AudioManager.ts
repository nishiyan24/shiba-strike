import Phaser from 'phaser';

// AudioManager: Web Audio APIを使った効果音・BGM生成
// Phase 9で本格的なサウンドを追加。現在はシンプルな生成音。
export class AudioManager {
  private scene: Phaser.Scene;
  private audioCtx: AudioContext | null = null;
  private bgmNodes: OscillatorNode[] = [];
  private bgmInterval: ReturnType<typeof setInterval> | null = null;
  private muted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    try {
      this.audioCtx = new AudioContext();
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  // 短いビープ音を生成
  private beep(freq: number, duration: number, type: OscillatorType = 'square', vol = 0.15): void {
    if (!this.audioCtx || this.muted) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + duration);
    } catch { /* ignore */ }
  }

  playShoot(): void {
    this.beep(880, 0.06, 'square', 0.08);
  }

  playExplosion(): void {
    if (!this.audioCtx || this.muted) return;
    try {
      const bufferSize = this.audioCtx.sampleRate * 0.3;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      source.start();
    } catch { /* ignore */ }
  }

  playBomb(): void {
    if (!this.audioCtx || this.muted) return;
    try {
      const bufferSize = this.audioCtx.sampleRate * 0.8;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
      }
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.7, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      source.start();
    } catch { /* ignore */ }
  }

  playDamage(): void {
    this.beep(220, 0.2, 'sawtooth', 0.2);
  }

  playBossDamage(): void {
    this.beep(440, 0.08, 'sawtooth', 0.1);
  }

  // シンプルなSF系BGM（ループ）
  startBGM(): void {
    if (!this.audioCtx || this.muted) return;
    // 後でより本格的なBGMに置き換え可能
    const notes = [220, 247, 262, 294, 330, 294, 262, 247];
    let idx = 0;
    this.bgmInterval = setInterval(() => {
      this.beep(notes[idx % notes.length], 0.35, 'triangle', 0.05);
      idx++;
    }, 350);
  }

  stopBGM(): void {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  resume(): void {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }
}
