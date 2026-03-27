import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

// BossHealthBar: 高精細ボスHPゲージ（装飾フレーム＋グラデーション＋HP%）
export class BossHealthBar {
  private scene: Phaser.Scene;
  private bg!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private frame!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private hpPct!: Phaser.GameObjects.Text;
  private dangerPulse: boolean = false;
  private currentRatio: number = 1;

  private readonly BAR_W = GAME_WIDTH - 110;
  private readonly BAR_H = 18;
  private readonly BAR_X = 55;
  private readonly BAR_Y = 683;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const s  = this.scene;
    const bx = this.BAR_X;
    const by = this.BAR_Y;
    const bw = this.BAR_W;
    const bh = this.BAR_H;

    // ── 背景パネル（ガラス風）─────────────────
    this.bg = s.add.graphics();

    // 外ぼかしシャドウ
    this.bg.fillStyle(0xff0044, 0.08);
    this.bg.fillRoundedRect(bx - 14, by - 32, bw + 28, bh + 50, 10);

    // 暗いパネル本体
    this.bg.fillStyle(0x050008, 0.88);
    this.bg.fillRoundedRect(bx - 10, by - 28, bw + 20, bh + 44, 7);

    // パネル上部ハイライト（ガラス反射）
    this.bg.fillStyle(0xffffff, 0.06);
    this.bg.fillRoundedRect(bx - 8, by - 26, bw + 16, (bh + 40) / 2, 5);

    // 内側インセットライン
    this.bg.lineStyle(1, 0x330022, 0.7);
    this.bg.strokeRoundedRect(bx - 10, by - 28, bw + 20, bh + 44, 7);
    this.bg.setDepth(91);

    // ── HP バー本体 ─────────────────────────
    this.bar = s.add.graphics();
    this.bar.setDepth(92);
    this.drawBar(1.0);

    // ── 装飾フレーム ────────────────────────
    this.frame = s.add.graphics();
    this.frame.setDepth(93);
    this.drawFrame(1.0);

    // ── BOSS ラベル ──────────────────────────
    this.label = s.add.text(bx, by - 24, '▸ BOSS', {
      fontSize: '13px',
      fontFamily: '"Arial Black", Impact, sans-serif',
      color: '#ff3377',
      stroke: '#220011',
      strokeThickness: 4,
    }).setDepth(94);

    // ── HP% テキスト ─────────────────────────
    this.hpPct = s.add.text(bx + bw, by - 24, '100%', {
      fontSize: '13px',
      fontFamily: '"Arial Black", Impact, sans-serif',
      color: '#ffaabb',
      stroke: '#220011',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(94);
  }

  private drawBar(ratio: number): void {
    this.bar.clear();
    const bx = this.BAR_X;
    const by = this.BAR_Y;
    const bw = this.BAR_W;
    const bh = this.BAR_H;
    const fw = Math.max(0, bw * ratio);

    // バー溝（暗い凹み）
    this.bar.fillStyle(0x110008, 1);
    this.bar.fillRoundedRect(bx, by, bw, bh, 4);
    this.bar.lineStyle(1, 0x440022, 0.5);
    this.bar.strokeRoundedRect(bx, by, bw, bh, 4);

    if (fw > 2) {
      // ── 色フェーズ ──────────────────────
      // HP >50% : ピンク〜赤  <=50% : 赤橙  <=25% : 橙(点滅)
      const colA = ratio > 0.5 ? 0xcc0044 : ratio > 0.25 ? 0xff4400 : 0xff6600;
      const colB = ratio > 0.5 ? 0xff2266 : ratio > 0.25 ? 0xff7700 : 0xffaa00;
      const colC = ratio > 0.5 ? 0xff88aa : ratio > 0.25 ? 0xffcc44 : 0xffee88;

      // ベース塗り
      this.bar.fillStyle(colA, 1.0);
      this.bar.fillRoundedRect(bx, by, fw, bh, 4);

      // 中間輝き帯
      this.bar.fillStyle(colB, 0.55);
      this.bar.fillRoundedRect(bx, by + 3, fw, Math.floor(bh * 0.5), 2);

      // 上端ハイライト白線
      this.bar.fillStyle(0xffffff, 0.28);
      this.bar.fillRoundedRect(bx + 1, by + 1, fw - 2, 4, 1);

      // 先端グロウ
      if (fw > 20) {
        this.bar.fillStyle(colC, 0.4);
        this.bar.fillRoundedRect(bx + fw - 14, by, 14, bh, 4);
        this.bar.fillStyle(0xffffff, 0.2);
        this.bar.fillRoundedRect(bx + fw - 6, by + 1, 6, bh - 2, 3);
      }

      // 4分割目盛り線
      this.bar.lineStyle(1, 0x000000, 0.28);
      for (let seg = 1; seg <= 3; seg++) {
        const sx = bx + bw * seg / 4;
        if (sx < bx + fw - 3) {
          this.bar.lineBetween(sx, by + 2, sx, by + bh - 2);
        }
      }
    }
  }

  private drawFrame(ratio: number): void {
    this.frame.clear();
    const bx = this.BAR_X;
    const by = this.BAR_Y;
    const bw = this.BAR_W;
    const bh = this.BAR_H;

    const edgeCol = ratio <= 0.25 ? 0xff5500 : 0xff0055;

    // 外枠 2重ライン
    this.frame.lineStyle(2.5, edgeCol, 0.9);
    this.frame.strokeRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 5);
    this.frame.lineStyle(1, 0xffffff, 0.1);
    this.frame.strokeRoundedRect(bx, by, bw, bh, 4);

    // コーナーダイアモンド装飾
    const pts = [
      [bx - 1,      by - 1     ],
      [bx + bw + 1, by - 1     ],
      [bx - 1,      by + bh + 1],
      [bx + bw + 1, by + bh + 1],
    ] as [number, number][];

    pts.forEach(([cx, cy]) => {
      this.frame.fillStyle(edgeCol, 0.9);
      // 横ライン
      this.frame.fillRect(cx - 5, cy - 1, 11, 2);
      // 縦ライン
      this.frame.fillRect(cx - 1, cy - 5, 2, 11);
      // センタードット
      this.frame.fillStyle(0xffffff, 0.5);
      this.frame.fillRect(cx - 1, cy - 1, 2, 2);
    });

    // 左右端サイドスリット装飾（細線3本）
    for (let i = 0; i < 3; i++) {
      const oy = by + 4 + i * 4;
      this.frame.lineStyle(1, edgeCol, 0.4 - i * 0.1);
      this.frame.lineBetween(bx - 8, oy, bx - 2, oy);
      this.frame.lineBetween(bx + bw + 2, oy, bx + bw + 8, oy);
    }
  }

  update(hp: number, maxHp: number): void {
    this.currentRatio = hp / maxHp;
    this.drawBar(this.currentRatio);
    this.drawFrame(this.currentRatio);

    const pct = Math.round(this.currentRatio * 100);
    this.hpPct.setText(`${pct}%`);

    // HP による色変化
    if (this.currentRatio > 0.5) {
      this.hpPct.setStyle({ color: '#ffaabb' });
    } else if (this.currentRatio > 0.25) {
      this.hpPct.setStyle({ color: '#ffaa44' });
    } else {
      this.hpPct.setStyle({ color: '#ff5500' });
      // 危険域パルス（一度だけ登録）
      if (!this.dangerPulse) {
        this.dangerPulse = true;
        this.scene.tweens.add({
          targets: this.hpPct,
          alpha: 0.3,
          duration: 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
      }
    }
  }

  /** ボスごとに名前を変える */
  setName(name: string): void {
    this.label.setText(`▸ ${name}`);
  }

  show(): void {
    [this.bg, this.bar, this.frame].forEach(g => g.setVisible(true));
    [this.label, this.hpPct].forEach(t => t.setVisible(true));
    this.dangerPulse = false;
    this.hpPct.setAlpha(1);
    this.scene.tweens.killTweensOf(this.hpPct);
  }

  hide(): void {
    [this.bg, this.bar, this.frame].forEach(g => g.setVisible(false));
    [this.label, this.hpPct].forEach(t => t.setVisible(false));
  }
}
