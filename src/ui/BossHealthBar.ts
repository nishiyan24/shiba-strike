import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

// BossHealthBar: ボスのHPゲージ（画面下部）
export class BossHealthBar {
  private scene: Phaser.Scene;
  private bg!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container;

  private readonly BAR_WIDTH = GAME_WIDTH - 80;
  private readonly BAR_HEIGHT = 14;
  private readonly BAR_Y = 690;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const s = this.scene;

    // 背景バー
    this.bg = s.add.graphics();
    this.bg.fillStyle(0x000000, 0.6);
    this.bg.fillRect(30, this.BAR_Y - 20, GAME_WIDTH - 60, 28);
    this.bg.lineStyle(1, 0xff0044, 0.8);
    this.bg.strokeRect(30, this.BAR_Y - 20, GAME_WIDTH - 60, 28);
    this.bg.setDepth(92);

    // ラベル
    this.label = s.add.text(40, this.BAR_Y - 18, 'BOSS', {
      fontSize: '12px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff4488',
    }).setDepth(93);

    // HPバー本体
    this.bar = s.add.graphics();
    this.bar.setDepth(92);

    this.drawBar(1.0);
  }

  private drawBar(ratio: number): void {
    this.bar.clear();

    const clampedRatio = Phaser.Math.Clamp(ratio, 0, 1);

    // グラデーション風（フェーズによって色変化）
    const color = clampedRatio > 0.5 ? 0xff3366 : 0xff8800;

    this.bar.fillStyle(color);
    this.bar.fillRect(80, this.BAR_Y - 16, this.BAR_WIDTH * clampedRatio, this.BAR_HEIGHT);

    // ハイライト
    this.bar.fillStyle(0xffffff, 0.2);
    this.bar.fillRect(80, this.BAR_Y - 16, this.BAR_WIDTH * clampedRatio, 4);
  }

  update(hp: number, maxHp: number): void {
    this.drawBar(hp / maxHp);
  }

  show(): void {
    this.bg.setVisible(true);
    this.bar.setVisible(true);
    this.label.setVisible(true);
  }

  hide(): void {
    this.bg.setVisible(false);
    this.bar.setVisible(false);
    this.label.setVisible(false);
  }
}
