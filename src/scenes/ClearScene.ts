import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { getHighScore, saveHighScore } from '../utils/Storage';

// ClearScene: ゲームクリア画面
export class ClearScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClearScene' });
  }

  init(data: { score: number }): void {
    saveHighScore(data.score);
  }

  create(data: { score: number }): void {
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, 360, GAME_WIDTH, 720, 0x000011, 0.85);

    // 星のパーティクル演出
    this.createCelebration();

    this.add.text(cx, 180, 'STAGE CLEAR!', {
      fontSize: '48px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffdd00',
      stroke: '#885500',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 260, 'お疲れ様でした！', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaffcc',
    }).setOrigin(0.5);

    this.add.text(cx, 340, `FINAL SCORE: ${data.score.toLocaleString()}`, {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const hs = getHighScore();
    const isNew = data.score >= hs;
    if (isNew) {
      this.add.text(cx, 390, '★ NEW RECORD! ★', {
        fontSize: '20px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffdd00',
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, 390, `BEST: ${hs.toLocaleString()}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffdd00',
      }).setOrigin(0.5);
    }

    const retryText = this.add.text(cx, 490, '[ SPACE でもう一度プレイ ]', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: retryText,
      alpha: 0,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(cx, 545, '[ T でタイトルへ ]', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
    this.input.keyboard!.once('keydown-T', () => {
      this.scene.start('TitleScene');
    });
  }

  private createCelebration(): void {
    const gfx = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, 480);
      const y = Phaser.Math.Between(0, 720);
      const colors = [0xffdd00, 0x00aaff, 0xff66aa, 0x00ffcc];
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];
      gfx.fillStyle(color, Phaser.Math.FloatBetween(0.4, 1.0));
      gfx.fillCircle(x, y, Phaser.Math.Between(2, 5));
    }
  }
}
