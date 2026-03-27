import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getHighScore, saveHighScore } from '../utils/Storage';

// ClearScene: ステージクリア画面
// stageNumber=1,2 → 次ステージへ（ドヤ顔柴犬 + STAGE X CLEAR）
// stageNumber=3   → EndingScene へ
export class ClearScene extends Phaser.Scene {
  private stageNumber: number = 1;
  private score: number = 0;
  private lives: number = 3;
  private bombs: number = 3;

  constructor() {
    super({ key: 'ClearScene' });
  }

  init(data: { score: number; stageNumber: number; lives: number; bombs: number }): void {
    this.stageNumber = data.stageNumber ?? 1;
    this.score = data.score ?? 0;
    this.lives = data.lives ?? 3;
    this.bombs = data.bombs ?? 3;
    if (this.stageNumber >= 3) saveHighScore(this.score);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    if (this.stageNumber >= 3) {
      // Stage 3 撃破 → EndingSceneへ即移行（フェードアウト）
      this.cameras.main.fade(800, 0, 0, 0, false, (_: unknown, progress: number) => {
        if (progress === 1) this.scene.start('EndingScene', { score: this.score });
      });
      return;
    }

    // ── ステージ1/2クリア画面 ─────────────────────────
    // 背景
    const bg = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000022);
    this.tweens.add({ targets: bg, fillColor: 0x001133, duration: 1000 });

    // 紙吹雪
    this.createConfetti();

    // ── ドヤ顔柴犬 ──
    const shibaContainer = this.add.container(cx, GAME_HEIGHT / 2 + 300);
    this.drawDoyaShibaFace(shibaContainer);

    // 登場アニメ
    this.tweens.add({
      targets: shibaContainer,
      y: GAME_HEIGHT / 2 + 10,
      duration: 850,
      ease: 'Back.Out',
      delay: 200,
      onComplete: () => {
        this.tweens.add({
          targets: shibaContainer,
          scaleX: 1.08, scaleY: 0.96,
          duration: 110, yoyo: true, repeat: 3,
          onComplete: () => this.showClearText(cx),
        });
      },
    });

    this.time.delayedCall(300, () => this.playVictorySound());
  }

  // ── ドヤ顔柴犬 ───────────────────────────────────
  private drawDoyaShibaFace(c: Phaser.GameObjects.Container): void {
    const g = this.add.graphics();
    c.add(g);

    // 後光
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      g.fillStyle(0xffdd00, 0.15);
      g.fillCircle(Math.cos(angle) * 80, Math.sin(angle) * 80, 24);
    }
    g.fillStyle(0xffee88, 0.1);
    g.fillCircle(0, 0, 90);

    // 体
    g.fillStyle(0xdd9944);
    g.fillEllipse(0, 52, 100, 70);
    g.fillStyle(0xffeedd);
    g.fillEllipse(0, 42, 62, 46);

    // 頭
    g.fillStyle(0xdd9944);
    g.fillCircle(0, 0, 62);
    g.fillStyle(0xcc8833);
    g.fillEllipse(0, -38, 84, 50);

    // 立ち耳
    g.fillStyle(0xcc8833);
    g.fillTriangle(-48, -28, -68, -68, -24, -52);
    g.fillStyle(0xffbbaa);
    g.fillTriangle(-46, -30, -62, -60, -28, -50);
    g.fillStyle(0xcc8833);
    g.fillTriangle(48, -28, 68, -68, 24, -52);
    g.fillStyle(0xffbbaa);
    g.fillTriangle(46, -30, 62, -60, 28, -50);

    // 鼻筋
    g.fillStyle(0xfff0e0);
    g.fillEllipse(0, 8, 36, 56);

    // 目（U字笑い目）
    g.lineStyle(5, 0x441100, 1);
    g.beginPath(); g.arc(-22, -10, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false); g.strokePath();
    g.beginPath(); g.arc(22, -10, 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false); g.strokePath();

    // 眉（ドヤ感）
    g.lineStyle(4, 0x441100, 0.9);
    g.lineBetween(-32, -30, -12, -26);
    g.lineBetween(12, -26, 32, -30);

    // 鼻
    g.fillStyle(0x221100);
    g.fillEllipse(0, 16, 22, 14);
    g.fillStyle(0x664433, 0.5);
    g.fillEllipse(-3, 14, 7, 5);

    // 口（Ω）
    g.lineStyle(4, 0x441100, 1);
    g.beginPath(); g.arc(-8, 28, 8, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false); g.strokePath();
    g.beginPath(); g.arc(8, 28, 8, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false); g.strokePath();

    // ほっぺ
    g.fillStyle(0xff8877, 0.3);
    g.fillEllipse(-34, 14, 24, 16);
    g.fillEllipse(34, 14, 24, 16);

    // しっぽ（クルン）
    g.lineStyle(13, 0xdd9944, 0.9);
    g.beginPath(); g.arc(65, 48, 30, Phaser.Math.DegToRad(220), Phaser.Math.DegToRad(20), false); g.strokePath();

    // 前足
    g.fillStyle(0xdd9944);
    g.fillRoundedRect(-62, 32, 26, 44, 9);
    g.fillRoundedRect(36, 32, 26, 44, 9);
    g.fillStyle(0xffbbaa);
    g.fillEllipse(-49, 74, 20, 12);
    g.fillEllipse(49, 74, 20, 12);

    // ゆらゆら
    this.tweens.add({ targets: c, rotation: 0.04, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  // ── クリアテキスト表示 ────────────────────────────
  private showClearText(cx: number): void {
    const nextStage = this.stageNumber + 1;

    // STAGE X CLEAR!
    const clearTxt = this.add.text(cx, 80,
      `STAGE ${this.stageNumber} CLEAR!`, {
        fontSize: '46px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffdd00',
        stroke: '#884400',
        strokeThickness: 8,
      }).setOrigin(0.5).setScale(0).setAlpha(0).setDepth(20);

    this.tweens.add({
      targets: clearTxt,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 550, ease: 'Back.Out',
    });

    // 「やったWAN！」
    this.time.delayedCall(400, () => {
      const wan = this.add.text(cx, 148, 'やったWAN！', {
        fontSize: '32px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffffff',
        stroke: '#224400',
        strokeThickness: 5,
      }).setOrigin(0.5).setAlpha(0).setDepth(20);
      this.tweens.add({ targets: wan, alpha: 1, y: 142, duration: 400, ease: 'Quad.Out' });
    });

    // スコア
    this.time.delayedCall(900, () => {
      this.add.text(cx, 562, `SCORE: ${this.score.toLocaleString()}`, {
        fontSize: '22px', fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);

      const hs = getHighScore();
      if (this.score >= hs) {
        this.add.text(cx, 596, '★ BEST SCORE UPDATE! ★', {
          fontSize: '16px', fontFamily: 'Arial Black, sans-serif', color: '#ffd700',
        }).setOrigin(0.5).setDepth(20);
      }

      // 次ステージ案内
      this.time.delayedCall(400, () => {
        const stageColors = ['', '#00ccff', '#ffaa00'];
        const bossNames = ['', '高性能掃除機マシーン', '超雷神（ラスボス）'];
        const preview = this.add.text(cx, 636,
          `NEXT → STAGE ${nextStage}:${bossNames[nextStage] ?? ''}`, {
            fontSize: '14px',
            fontFamily: 'Arial Black, sans-serif',
            color: stageColors[nextStage] ?? '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
          }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: preview, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

        const cont = this.add.text(cx, 668, '[ SPACE で続ける ]', {
          fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({ targets: cont, alpha: 0, duration: 700, yoyo: true, repeat: -1 });

        this.input.keyboard!.once('keydown-SPACE', () => {
          this.cameras.main.fade(500, 0, 0, 0, false, (_: unknown, progress: number) => {
            if (progress === 1) {
              this.scene.start('GameScene', {
                stageNumber: nextStage,
                score: this.score,
                lives: this.lives,
                bombs: this.bombs,
              });
            }
          });
        });
        this.input.keyboard!.once('keydown-T', () => this.scene.start('TitleScene'));
      });
    });
  }

  // ── 紙吹雪 ───────────────────────────────────────
  private createConfetti(): void {
    const colors = [0xffdd00, 0x00aaff, 0xff66aa, 0x00ffcc, 0xff8800, 0xaaffaa];
    for (let i = 0; i < 70; i++) {
      const gfx = this.add.graphics();
      gfx.fillStyle(colors[Phaser.Math.Between(0, colors.length - 1)], Phaser.Math.FloatBetween(0.5, 1.0));
      const t = Phaser.Math.Between(0, 2);
      if (t === 0) gfx.fillRect(-4, -6, 8, 12);
      else if (t === 1) gfx.fillCircle(0, 0, 5);
      else gfx.fillTriangle(-5, 5, 5, 5, 0, -6);
      gfx.x = Phaser.Math.Between(-20, GAME_WIDTH + 20);
      gfx.y = Phaser.Math.Between(-50, -10);
      gfx.setDepth(4);
      this.tweens.add({
        targets: gfx,
        y: GAME_HEIGHT + 30,
        x: gfx.x + Phaser.Math.Between(-80, 80),
        rotation: Phaser.Math.FloatBetween(-Math.PI * 4, Math.PI * 4),
        duration: Phaser.Math.Between(2200, 4800),
        delay: Phaser.Math.Between(0, 1800),
        repeat: -1,
        onRepeat: () => { gfx.x = Phaser.Math.Between(-20, GAME_WIDTH + 20); gfx.y = -20; },
      });
    }
  }

  private playVictorySound(): void {
    try {
      const ctx = new AudioContext();
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.18);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.2);
      });
    } catch { /* ignore */ }
  }
}
