import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { getHighScore, saveHighScore } from '../utils/Storage';

// GameOverScene: ゲームオーバー画面
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number }): void {
    saveHighScore(data.score);
  }

  create(data: { score: number }): void {
    const cx = GAME_WIDTH / 2;

    // 暗い背景オーバーレイ
    this.add.rectangle(cx, 360, GAME_WIDTH, 720, 0x000000, 0.7);

    this.add.text(cx, 220, 'GAME OVER', {
      fontSize: '52px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff3333',
      stroke: '#660000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 320, `SCORE: ${data.score.toLocaleString()}`, {
      fontSize: '26px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    const hs = getHighScore();
    this.add.text(cx, 365, `BEST: ${hs.toLocaleString()}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffdd00',
    }).setOrigin(0.5);

    const retryText = this.add.text(cx, 460, '[ SPACE でリトライ ]', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: retryText,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(cx, 520, '[ T でタイトルへ ]', {
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
}
