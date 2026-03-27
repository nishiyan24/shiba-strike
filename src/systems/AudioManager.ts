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

  // 「ワフッ！」吠え声（ボム発動時）
  playBark(): void {
    if (!this.audioCtx || this.muted) return;
    try {
      // 2段階の吠え声：「ワ」→「フッ」
      const sr = this.audioCtx.sampleRate;
      for (let bark = 0; bark < 2; bark++) {
        const startTime = this.audioCtx.currentTime + bark * 0.18;
        const dur = bark === 0 ? 0.22 : 0.14;
        const bufSize = Math.floor(sr * dur);
        const buffer = this.audioCtx.createBuffer(1, bufSize, sr);
        const data = buffer.getChannelData(0);

        const baseFreq = bark === 0 ? 380 : 480;
        for (let i = 0; i < bufSize; i++) {
          const t = i / sr;
          const envelope = Math.pow(1 - t / dur, 1.5) * Math.min(1, t * 40);
          // ボーカル音（サイン波 + ノイズで「ワフ」っぽく）
          const vocal = Math.sin(2 * Math.PI * baseFreq * t * (1 - t * 1.5));
          const noise = (Math.random() * 2 - 1) * 0.15;
          data[i] = (vocal * 0.7 + noise) * envelope;
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.7, startTime);
        source.connect(gain);
        gain.connect(this.audioCtx.destination);
        source.start(startTime);
      }
    } catch { /* ignore */ }
  }

  playBossDamage(): void {
    this.beep(440, 0.08, 'sawtooth', 0.1);
  }

  // 骨アイテム取得音（上昇アルペジオ）
  playPowerup(): void {
    if (!this.audioCtx || this.muted) return;
    const notes = [523, 659, 784, 1047]; // C5→E5→G5→C6
    notes.forEach((freq, i) => {
      this.scene.time.delayedCall(i * 60, () => {
        this.beep(freq, 0.12, 'triangle', 0.18);
      });
    });
  }

  // スーパーモード突入音（派手なファンファーレ）
  playSuperMode(): void {
    if (!this.audioCtx || this.muted) return;
    // 上昇するトリル
    const fanfare = [392, 523, 659, 784, 1047, 784, 1047];
    fanfare.forEach((freq, i) => {
      this.scene.time.delayedCall(i * 80, () => {
        this.beep(freq, 0.15, 'square', 0.14);
      });
    });
  }

  // 通常BGM（シンプルなSF系ループ）
  startBGM(): void {
    if (!this.audioCtx || this.muted) return;
    const notes = [220, 247, 262, 294, 330, 294, 262, 247];
    let idx = 0;
    this.bgmInterval = setInterval(() => {
      this.beep(notes[idx % notes.length], 0.32, 'triangle', 0.05);
      idx++;
    }, 350);
  }

  // スーパーモード用アップテンポBGM
  startFastBGM(): void {
    this.stopBGM();
    if (!this.audioCtx || this.muted) return;
    // 短い音符を高速で + ベースライン
    const melody = [784, 880, 1047, 880, 784, 659, 784, 880];
    const bass   = [196, 196, 220, 220, 247, 247, 196, 196];
    let idx = 0;
    this.bgmInterval = setInterval(() => {
      const i = idx % melody.length;
      this.beep(melody[i], 0.16, 'square', 0.07);
      this.beep(bass[i],   0.28, 'triangle', 0.04);
      idx++;
    }, 170); // 通常の約2倍速
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
