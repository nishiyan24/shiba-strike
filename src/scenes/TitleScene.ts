import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getHighScore } from '../utils/Storage';

// TitleScene: タイトル画面
export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    // 背景（星）
    this.createStarfield();

    // タイトルロゴ
    this.add.text(cx, 180, 'SHIBA STRIKE', {
      fontSize: '48px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#00aaff',
      stroke: '#003366',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 240, '〜スタイリッシュ柴犬シューター〜', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaddff',
    }).setOrigin(0.5);

    // ハイスコア表示
    const hs = getHighScore();
    this.add.text(cx, 300, `BEST: ${hs.toLocaleString()}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffdd00',
    }).setOrigin(0.5);

    // スタートボタン（点滅）
    const startText = this.add.text(cx, 420, '[ PRESS SPACE TO START ]', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // 操作説明
    this.add.text(cx, 540, '移動: 矢印 / WASD   射撃: SPACE   ボム: SHIFT', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    // スペースキーでゲーム開始
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }

  private createStarfield(): void {
    const gfx = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1.0);
      gfx.fillStyle(0xffffff, alpha);
      gfx.fillCircle(x, y, size);
    }
  }
}
