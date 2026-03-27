import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getHighScore, saveHighScore } from '../utils/Storage';

// GameOverScene: ゲームオーバー画面 — しょんぼり柴犬 + 次はがんばるWAN…
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number }): void {
    saveHighScore(data.score);
  }

  create(data: { score: number }): void {
    const cx = GAME_WIDTH / 2;

    // 暗い背景
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.88);

    // 雨粒エフェクト（悲しい雰囲気）
    this.createRain();

    // ── しょんぼり柴犬 ──
    const shibaContainer = this.add.container(cx, GAME_HEIGHT / 2 - 30);
    this.drawShonboroShiba(shibaContainer);

    // GAME OVER テキスト（上から落ちてくる）
    const goText = this.add.text(cx, -60, 'GAME OVER', {
      fontSize: '52px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff3333',
      stroke: '#660000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: goText,
      y: 80,
      duration: 800,
      ease: 'Bounce.Out',
      onComplete: () => {
        // 小さく揺れる
        this.tweens.add({
          targets: goText,
          angle: -1.5,
          duration: 220,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.InOut',
        });
        // しょんぼりセリフ表示
        this.time.delayedCall(600, () => this.showSadText(cx, data.score));
      },
    });

    // 効果音（しょんぼりビープ）
    this.time.delayedCall(200, () => this.playSadSound());
  }

  // ── しょんぼり柴犬を描く ──────────────────────────
  private drawShonboroShiba(c: Phaser.GameObjects.Container): void {
    const g = this.scene.scene.sys.add.graphics();
    c.add(g);

    // 体
    g.fillStyle(0xcc8833);
    g.fillEllipse(0, 58, 100, 72);

    // 首元白
    g.fillStyle(0xffeedd);
    g.fillEllipse(0, 44, 62, 46);

    // 頭
    g.fillStyle(0xcc8833);
    g.fillCircle(0, 0, 62);

    // 頭頂（少し濃い）
    g.fillStyle(0xbb7722);
    g.fillEllipse(0, -38, 84, 52);

    // 耳（下を向いてしょんぼり）
    // 左耳（垂れ下がり）
    g.fillStyle(0xbb7722);
    g.fillTriangle(-42, -26, -72, -42, -58, 6);
    g.fillStyle(0xffbbaa);
    g.fillTriangle(-44, -24, -68, -38, -56, 4);
    // 右耳（垂れ下がり）
    g.fillStyle(0xbb7722);
    g.fillTriangle(42, -26, 72, -42, 58, 6);
    g.fillStyle(0xffbbaa);
    g.fillTriangle(44, -24, 68, -38, 56, 4);

    // 鼻筋（白）
    g.fillStyle(0xfff0e0);
    g.fillEllipse(0, 10, 34, 56);

    // 目（しょんぼり半目、眉毛がハの字）
    g.lineStyle(4, 0x441100, 1);
    // 左目（細い悲し目）
    g.beginPath();
    g.arc(-22, -10, 12, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150), false);
    g.strokePath();
    // 右目
    g.beginPath();
    g.arc(22, -10, 12, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150), false);
    g.strokePath();

    // 眉毛（ハの字で困り顔）
    g.lineStyle(4, 0x441100, 0.9);
    g.lineBetween(-34, -28, -12, -22);   // 左眉（内側が下がる）
    g.lineBetween(12, -22, 34, -28);     // 右眉

    // 涙（目の下）
    g.fillStyle(0x88ccff, 0.85);
    g.fillEllipse(-18, 8, 7, 10);
    g.fillEllipse(18, 8, 7, 10);
    // 涙の雫
    g.fillTriangle(-18, 14, -22, 22, -14, 22);
    g.fillTriangle(18, 14, 14, 22, 22, 22);

    // 鼻
    g.fillStyle(0x221100);
    g.fillEllipse(0, 18, 22, 14);
    g.fillStyle(0x664433, 0.6);
    g.fillEllipse(-3, 16, 7, 5);

    // 口（への字）
    g.lineStyle(4, 0x441100, 1);
    g.beginPath();
    g.arc(-7, 34, 7, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), true);
    g.strokePath();
    g.beginPath();
    g.arc(7, 34, 7, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), true);
    g.strokePath();

    // ほっぺ（涙で赤くなってる）
    g.fillStyle(0xff8877, 0.28);
    g.fillEllipse(-34, 16, 26, 16);
    g.fillEllipse(34, 16, 26, 16);

    // しっぽ（だらーんと下向き）
    g.lineStyle(12, 0xcc8833, 0.9);
    g.beginPath();
    g.arc(-64, 70, 28, Phaser.Math.DegToRad(290), Phaser.Math.DegToRad(90), false);
    g.strokePath();
    g.lineStyle(7, 0xffeecc, 0.55);
    g.beginPath();
    g.arc(-64, 70, 28, Phaser.Math.DegToRad(290), Phaser.Math.DegToRad(90), false);
    g.strokePath();

    // 前足（項垂れ）
    g.fillStyle(0xcc8833);
    g.fillRoundedRect(-62, 36, 26, 48, 9);
    g.fillRoundedRect(36, 36, 26, 48, 9);
    g.fillStyle(0xffbbaa);
    g.fillEllipse(-49, 82, 20, 12);
    g.fillEllipse(49, 82, 20, 12);

    // ゆらゆらアニメ（しょんぼりユラユラ）
    this.tweens.add({
      targets: c,
      y: c.y + 6,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  // ── 悲しいテキスト類を表示 ────────────────────────
  private showSadText(cx: number, score: number): void {
    // 「次はがんばるWAN…」
    const ganbare = this.add.text(cx, 530, '次はがんばるWAN…', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#aaddff',
      stroke: '#002244',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.tweens.add({
      targets: ganbare,
      alpha: 1,
      y: 520,
      duration: 700,
      ease: 'Quad.Out',
    });

    // スコア
    this.time.delayedCall(400, () => {
      this.add.text(cx, 580, `SCORE: ${score.toLocaleString()}`, {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20);

      const hs = getHighScore();
      this.add.text(cx, 612, `BEST: ${hs.toLocaleString()}`, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffdd88',
      }).setOrigin(0.5).setDepth(20);

      // 操作案内
      this.time.delayedCall(500, () => {
        const retry = this.add.text(cx, 658, '[ SPACE でリトライ ]', {
          fontSize: '20px',
          fontFamily: 'Arial, sans-serif',
          color: '#aaaaaa',
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
          targets: retry,
          alpha: 0,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });

        this.add.text(cx, 690, '[ T でタイトルへ ]', {
          fontSize: '15px',
          fontFamily: 'Arial, sans-serif',
          color: '#666666',
        }).setOrigin(0.5).setDepth(20);

        this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('GameScene'));
        this.input.keyboard!.once('keydown-T', () => this.scene.start('TitleScene'));
      });
    });
  }

  // ── 雨粒エフェクト ────────────────────────────────
  private createRain(): void {
    for (let i = 0; i < 40; i++) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x88bbff, Phaser.Math.FloatBetween(0.15, 0.45));
      gfx.fillRect(-1, -8, 2, 16);
      gfx.x = Phaser.Math.Between(0, GAME_WIDTH);
      gfx.y = Phaser.Math.Between(-50, GAME_HEIGHT);
      gfx.setDepth(3);

      this.tweens.add({
        targets: gfx,
        y: GAME_HEIGHT + 20,
        x: gfx.x + Phaser.Math.Between(-10, 10),
        duration: Phaser.Math.Between(900, 2000),
        delay: Phaser.Math.Between(0, 1500),
        repeat: -1,
        onRepeat: () => {
          gfx.x = Phaser.Math.Between(0, GAME_WIDTH);
          gfx.y = -20;
        },
      });
    }
  }

  // ── しょんぼりサウンド ────────────────────────────
  private playSadSound(): void {
    try {
      const ctx = new AudioContext();
      // 下降する音列
      const notes = [440, 392, 349, 294];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.25);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.28);
      });
    } catch { /* ignore */ }
  }
}
