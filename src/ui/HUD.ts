import Phaser from 'phaser';
import { PLAYER_MAX_LIVES, PLAYER_MAX_BOMBS, GAME_WIDTH } from '../config';

// HUD: ゲーム中のスコア・ライフ・ボム・倍率表示
export class HUD {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private multiplierBadge!: Phaser.GameObjects.Text;
  private powerBadge!: Phaser.GameObjects.Text;
  private lifeIcons: Phaser.GameObjects.Graphics[] = [];
  private bombIcons: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createHUD();
  }

  private createHUD(): void {
    const s = this.scene;

    // 半透明の上部バー
    const topBar = s.add.graphics();
    topBar.fillStyle(0x000000, 0.5);
    topBar.fillRect(0, 0, GAME_WIDTH, 40);
    topBar.setDepth(90);

    // スコア表示
    this.scoreText = s.add.text(10, 8, 'SCORE: 0', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setDepth(91);

    // スコア倍率バッジ（普段は非表示）
    this.multiplierBadge = s.add.text(175, 6, '×2', {
      fontSize: '14px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffdd00',
      stroke: '#885500',
      strokeThickness: 3,
      backgroundColor: '#884400',
      padding: { left: 4, right: 4, top: 1, bottom: 1 },
    }).setDepth(92).setVisible(false);

    // パワーアップバッジ（3WAY・SUPER表示）
    this.powerBadge = s.add.text(10, 44, '', {
      fontSize: '13px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setDepth(92).setAlpha(0);

    // ライフアイコン（柴犬の顔）
    for (let i = 0; i < PLAYER_MAX_LIVES; i++) {
      const g = s.add.graphics();
      this.drawLifeIcon(g, i);
      this.lifeIcons.push(g);
    }

    // ボムアイコン
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
    g.fillTriangle(x - 8, y - 6, x - 5, y - 6, x - 7, y - 12);
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

  // スコア倍率バッジ表示 (mult=1なら非表示)
  setScoreMultiplier(mult: number): void {
    if (mult <= 1) {
      this.multiplierBadge.setVisible(false);
      return;
    }
    this.multiplierBadge.setText(`×${mult} BONUS!`);
    const color = mult >= 3 ? '#ff8800' : '#ffdd00';
    const bg    = mult >= 3 ? '#884400' : '#664400';
    this.multiplierBadge.setStyle({ color, backgroundColor: bg });
    this.multiplierBadge.setVisible(true);

    // 倍率変更時にぽわっと点滅
    this.scene.tweens.add({
      targets: this.multiplierBadge,
      scaleX: 1.3, scaleY: 1.3,
      duration: 180,
      yoyo: true,
      ease: 'Back.Out',
    });
  }

  // パワーアップ状態バッジ
  setPowerBadge(level: number, isSuper: boolean): void {
    if (isSuper) {
      this.powerBadge.setText('⚡ SUPER SHIBA ⚡');
      this.powerBadge.setStyle({ color: '#ffd700', stroke: '#884400' });
    } else if (level >= 1) {
      this.powerBadge.setText('🦴 3-WAY SHOT');
      this.powerBadge.setStyle({ color: '#88eeff', stroke: '#004466' });
    } else {
      this.powerBadge.setAlpha(0);
      return;
    }
    this.powerBadge.setAlpha(1);
    this.scene.tweens.add({
      targets: this.powerBadge,
      alpha: 0.75,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}
