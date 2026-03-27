import Phaser from 'phaser';
import { PLAYER_MAX_LIVES, PLAYER_MAX_BOMBS, GAME_WIDTH } from '../config';

// HUD: 高精細版 — ネオンスコア・詳細ライフアイコン・グロウボムアイコン
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
    const W = GAME_WIDTH;

    // ── トップバー（ガラスパネル）────────────────────
    const topBar = s.add.graphics();

    // 暗いベース
    topBar.fillStyle(0x000011, 0.78);
    topBar.fillRect(0, 0, W, 44);

    // 上端スリム輝きライン（ネオン青）
    topBar.fillStyle(0x0066ff, 0.7);
    topBar.fillRect(0, 0, W, 2);

    // 下端ボーダー（グラデーション風 3層）
    topBar.lineStyle(2, 0x003399, 0.9);
    topBar.lineBetween(0, 43, W, 43);
    topBar.lineStyle(1, 0x0055ff, 0.5);
    topBar.lineBetween(0, 44, W, 44);

    // 上部ハイライト（ガラス反射）
    topBar.fillStyle(0xffffff, 0.04);
    topBar.fillRect(0, 2, W, 16);

    // 左右端の縦ライン
    topBar.lineStyle(1.5, 0x0055ff, 0.4);
    topBar.lineBetween(0, 0, 0, 44);
    topBar.lineBetween(W - 1, 0, W - 1, 44);

    topBar.setDepth(90);

    // ── スコア（ネオンシアン）───────────────────────
    this.scoreText = s.add.text(12, 8, 'SCORE: 0', {
      fontSize: '19px',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#00eeff',
      stroke: '#001a33',
      strokeThickness: 4,
    }).setDepth(91);

    // ── スコア倍率バッジ ────────────────────────────
    this.multiplierBadge = s.add.text(190, 5, '×2', {
      fontSize: '14px',
      fontFamily: '"Arial Black", Impact, sans-serif',
      color: '#ffdd00',
      stroke: '#885500',
      strokeThickness: 3,
      backgroundColor: '#663300',
      padding: { left: 6, right: 6, top: 2, bottom: 2 },
    }).setDepth(92).setVisible(false);

    // ── パワーバッジ ────────────────────────────────
    this.powerBadge = s.add.text(12, 48, '', {
      fontSize: '13px',
      fontFamily: '"Arial Black", Impact, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { left: 5, right: 5, top: 2, bottom: 2 },
    }).setDepth(92).setAlpha(0);

    // ── BOMB ラベル ─────────────────────────────────
    s.add.text(W - 130, 10, 'BOMB', {
      fontSize: '10px',
      fontFamily: '"Arial Black", sans-serif',
      color: '#4488ff',
      stroke: '#001133',
      strokeThickness: 2,
    }).setDepth(91);

    // ── ライフアイコン（右端から並ぶ柴犬顔）─────────
    for (let i = 0; i < PLAYER_MAX_LIVES; i++) {
      const g = s.add.graphics();
      this.drawLifeIcon(g, i);
      this.lifeIcons.push(g);
    }

    // ── ボムアイコン（チャージ球）──────────────────
    for (let i = 0; i < PLAYER_MAX_BOMBS; i++) {
      const g = s.add.graphics();
      this.drawBombIcon(g, i);
      this.bombIcons.push(g);
    }
  }

  // ── 柴犬ライフアイコン（詳細版）───────────────────
  private drawLifeIcon(g: Phaser.GameObjects.Graphics, index: number): void {
    // 右端から左へ並べる
    const cx = GAME_WIDTH - 24 - index * 28;
    const cy = 22;
    g.clear();

    // ソフトグロウ背景
    g.fillStyle(0xff8800, 0.12);
    g.fillCircle(cx, cy, 16);

    // 頭（柴犬オレンジ）
    g.fillStyle(0xdd7700);
    g.fillCircle(cx, cy, 11);

    // マズル（白みがかった楕円）
    g.fillStyle(0xffcc88);
    g.fillEllipse(cx, cy + 4, 13, 9);

    // 目（黒）
    g.fillStyle(0x111111);
    g.fillCircle(cx - 3.5, cy - 1.5, 2.8);
    g.fillCircle(cx + 3.5, cy - 1.5, 2.8);
    // 目の白ハイライト
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(cx - 2.5, cy - 2.5, 1.2);
    g.fillCircle(cx + 4.5, cy - 2.5, 1.2);

    // 鼻（楕円）
    g.fillStyle(0x221100);
    g.fillEllipse(cx, cy + 2, 4.5, 3);
    // 鼻の微ハイライト
    g.fillStyle(0x664400, 0.5);
    g.fillCircle(cx - 0.5, cy + 1.5, 1);

    // 口（弧）
    g.lineStyle(1, 0x553300, 0.7);
    g.beginPath();
    g.arc(cx, cy + 4, 3, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // 耳（三角ポインティ）
    g.fillStyle(0xcc6600);
    g.fillTriangle(cx - 13, cy - 8, cx - 7, cy - 9, cx - 11, cy - 18);
    g.fillTriangle(cx + 13, cy - 8, cx + 7, cy - 9, cx + 11, cy - 18);
    // 耳内ピンク
    g.fillStyle(0xff9999, 0.65);
    g.fillTriangle(cx - 12, cy - 8, cx - 8, cy - 8, cx - 11, cy - 15);
    g.fillTriangle(cx + 12, cy - 8, cx + 8, cy - 8, cx + 11, cy - 15);

    // ヘルメット風リム（宇宙服らしく）
    g.lineStyle(1.5, 0xeeeeff, 0.35);
    g.strokeCircle(cx, cy, 11);

    g.setDepth(91);
  }

  // ── ボムアイコン（エネルギー球）──────────────────
  private drawBombIcon(g: Phaser.GameObjects.Graphics, index: number): void {
    const cx = GAME_WIDTH - 130 + 24 + index * 22;
    const cy = 22;
    g.clear();

    // 外ヘイズ（ソフトグロウ）
    g.fillStyle(0x0033ff, 0.13);
    g.fillCircle(cx, cy, 12);
    g.fillStyle(0x0066ff, 0.1);
    g.fillCircle(cx, cy, 10);

    // メイン球体（濃い青）
    g.fillStyle(0x003aaa);
    g.fillCircle(cx, cy, 8);

    // 中間レイヤー（シアン）
    g.fillStyle(0x0077dd, 0.85);
    g.fillCircle(cx, cy, 6);

    // 内側ハイライト
    g.fillStyle(0x00aaff, 0.9);
    g.fillCircle(cx, cy, 4);

    // 白いスペキュラハイライト
    g.fillStyle(0xaaddff, 0.95);
    g.fillCircle(cx - 2, cy - 2, 2.5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(cx - 2.5, cy - 2.5, 1.3);

    // 輝きスパーク（短い十字線）
    g.lineStyle(1.2, 0x55aaff, 0.6);
    g.lineBetween(cx, cy - 12, cx, cy - 9);
    g.lineBetween(cx - 12, cy, cx - 9, cy);
    g.lineBetween(cx + 12, cy, cx + 9, cy);
    // 斜め
    g.lineStyle(0.8, 0x55aaff, 0.35);
    g.lineBetween(cx - 9, cy - 9, cx - 7, cy - 7);
    g.lineBetween(cx + 9, cy - 9, cx + 7, cy - 7);

    g.setDepth(91);
  }

  // ── 公開API ─────────────────────────────────────────

  updateScore(score: number): void {
    this.scoreText.setText(`SCORE: ${score.toLocaleString()}`);
  }

  updateLives(lives: number): void {
    this.lifeIcons.forEach((g, i) => {
      g.setAlpha(i < lives ? 1 : 0.14);
    });
  }

  updateBombs(bombs: number): void {
    this.bombIcons.forEach((g, i) => {
      g.setAlpha(i < bombs ? 1 : 0.14);
    });
  }

  setScoreMultiplier(mult: number): void {
    if (mult <= 1) {
      this.multiplierBadge.setVisible(false);
      return;
    }
    this.multiplierBadge.setText(`×${mult} BONUS!`);
    const color = mult >= 3 ? '#ff8800' : '#ffdd00';
    const bg    = mult >= 3 ? '#884400' : '#663300';
    this.multiplierBadge.setStyle({ color, backgroundColor: bg });
    this.multiplierBadge.setVisible(true);

    this.scene.tweens.add({
      targets: this.multiplierBadge,
      scaleX: 1.35, scaleY: 1.35,
      duration: 200,
      yoyo: true,
      ease: 'Back.Out',
    });
  }

  setPowerBadge(level: number, isSuper: boolean): void {
    if (isSuper) {
      this.powerBadge.setText('⚡ SUPER SHIBA ⚡');
      this.powerBadge.setStyle({ color: '#ffd700', stroke: '#884400', strokeThickness: 3 });
    } else if (level >= 1) {
      this.powerBadge.setText('🦴 3-WAY SHOT');
      this.powerBadge.setStyle({ color: '#88eeff', stroke: '#004466', strokeThickness: 3 });
    } else {
      this.scene.tweens.killTweensOf(this.powerBadge);
      this.powerBadge.setAlpha(0);
      return;
    }
    this.powerBadge.setAlpha(1);
    this.scene.tweens.killTweensOf(this.powerBadge);
    this.scene.tweens.add({
      targets: this.powerBadge,
      alpha: 0.72,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}
