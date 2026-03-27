import Phaser from 'phaser';
import { PLAYER_MAX_LIVES, PLAYER_MAX_BOMBS, GAME_WIDTH } from '../config';

// HUD: ゲーム中のスコア・ライフ・ボム表示
export class HUD {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private lifeIcons: Phaser.GameObjects.Graphics[] = [];
  private bombIcons: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createHUD();
  }

  private createHUD(): void {
    const s = this.scene;

    // ── 半透明の上部バー
    const topBar = s.add.graphics();
    topBar.fillStyle(0x000000, 0.5);
    topBar.fillRect(0, 0, GAME_WIDTH, 40);
    topBar.setDepth(90);

    // ── スコア表示
    this.scoreText = s.add.text(10, 8, 'SCORE: 0', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setDepth(91);

    // ── ライフアイコン（犬の顔♡）
    for (let i = 0; i < PLAYER_MAX_LIVES; i++) {
      const g = s.add.graphics();
      this.drawLifeIcon(g, i);
      this.lifeIcons.push(g);
    }

    // ── ボムアイコン（★）
    const bombLabel = s.add.text(GAME_WIDTH - 100, 8, 'BOMB:', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setDepth(91);
    bombLabel;

    for (let i = 0; i < PLAYER_MAX_BOMBS; i++) {
      const g = s.add.graphics();
      this.drawBombIcon(g, i);
      this.bombIcons.push(g);
    }
  }

  private drawLifeIcon(g: Phaser.GameObjects.Graphics, index: number): void {
    const x = GAME_WIDTH - 30 - index * 28;
    const y = 20;
    g.clear();
    g.fillStyle(0xffcc44);
    g.fillCircle(x, y, 8);
    g.fillStyle(0xdd8833);
    g.fillTriangle(x - 8, y - 6, x - 5, y - 6, x - 7, y - 12); // 耳
    g.fillTriangle(x + 8, y - 6, x + 5, y - 6, x + 7, y - 12);
    g.setDepth(91);
  }

  private drawBombIcon(g: Phaser.GameObjects.Graphics, index: number): void {
    const x = GAME_WIDTH - 28 + index * 16 - 40;
    const y = 20;
    g.clear();
    g.fillStyle(0x00ccff);
    g.fillCircle(x, y, 6);
    g.fillStyle(0x88eeff, 0.6);
    g.fillCircle(x, y, 3);
    g.setDepth(91);
  }

  updateScore(score: number): void {
    this.scoreText.setText(`SCORE: ${score.toLocaleString()}`);
  }

  updateLives(lives: number): void {
    this.lifeIcons.forEach((g, i) => {
      g.setAlpha(i < lives ? 1 : 0.2);
    });
  }

  updateBombs(bombs: number): void {
    this.bombIcons.forEach((g, i) => {
      g.setAlpha(i < bombs ? 1 : 0.2);
    });
  }
}
