import Phaser from 'phaser';
import { BOSS_HP, ENEMY_BULLET_SPEED, GAME_WIDTH } from '../config';

// Boss: 全自動シャンプーマシン
// 犬にとっての恐怖の象徴。シャワーヘッドから水・シャンプー泡を噴射する
export class Boss extends Phaser.GameObjects.Container {
  public hp: number = BOSS_HP;
  public maxHp: number = BOSS_HP;
  public bullets: Phaser.GameObjects.Group;
  public isDefeated: boolean = false;

  private phase: number = 1;
  private moveDir: number = 1;
  private moveTimer: number = 0;
  private shootTimer: number = 0;
  private shootPattern: number = 0;
  private entryComplete: boolean = false;

  // フォーム（泡）が溢れてくる演出用
  private foamGfx!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH / 2, -160);
    scene.add.existing(this);
    this.bullets = scene.add.group();
    this.draw();
    this.startEntry();
  }

  private draw(): void {
    const g = this.scene.add.graphics();
    this.add(g);

    // ── 土台・足
    g.fillStyle(0x555566);
    g.fillRoundedRect(-55, 58, 16, 16, 3);
    g.fillRoundedRect(39, 58, 16, 16, 3);
    g.fillStyle(0x333344);
    g.fillRoundedRect(-50, 68, 100, 8, 3);

    // ── メインボディ（業務用洗濯機風）
    g.fillStyle(0x4477bb);
    g.fillRoundedRect(-58, -58, 116, 120, 10);

    // ボディのハイライト
    g.fillStyle(0x5588dd, 0.5);
    g.fillRoundedRect(-50, -52, 40, 30, 6);

    // ボディのライン（金属質感）
    g.lineStyle(2, 0x2255aa, 0.8);
    g.strokeRoundedRect(-58, -58, 116, 120, 10);

    // ── コントロールパネル（中央）
    g.fillStyle(0x222244);
    g.fillRoundedRect(-35, -40, 70, 55, 6);

    // パネルのディスプレイ画面
    g.fillStyle(0x00ffdd, 0.85);
    g.fillRoundedRect(-28, -36, 56, 28, 4);
    // ディスプレイの文字を模したライン
    g.fillStyle(0x004433);
    g.fillRect(-24, -30, 40, 3);
    g.fillRect(-24, -24, 30, 3);
    g.fillRect(-24, -18, 20, 3);
    // "WASH MODE" 風の表示
    g.fillStyle(0x00ff88, 0.9);
    g.fillRect(-24, -32, 8, 8);
    g.fillRect(-13, -32, 8, 8);
    g.fillRect(-2, -32, 8, 8);
    g.fillRect(9, -32, 8, 8);

    // 各種ボタン
    g.fillStyle(0xff4400);
    g.fillCircle(-26, -4, 6); // 赤ボタン（電源？）
    g.fillStyle(0xffdd00);
    g.fillCircle(-12, -4, 5); // 黄ボタン
    g.fillStyle(0x00cc44);
    g.fillCircle(0, -4, 5);   // 緑ボタン
    g.fillStyle(0x0088ff);
    g.fillCircle(12, -4, 5);  // 青ボタン

    // ダイヤル
    g.fillStyle(0x888899);
    g.fillCircle(26, -4, 8);
    g.lineStyle(2, 0xaabbcc);
    g.strokeCircle(26, -4, 8);
    g.lineStyle(2, 0xffffff, 0.9);
    g.lineBetween(26, -4, 26, -11); // ダイヤルの指針

    // 警告ステッカー（右上）
    g.fillStyle(0xffdd00);
    g.fillRect(22, 12, 28, 10);
    g.fillStyle(0x000000);
    g.fillTriangle(22, 22, 30, 12, 38, 22);  // 警告マーク△

    // ── シャワーアーム（左右）
    g.fillStyle(0x333355);
    // 左アーム
    g.fillRoundedRect(-80, -30, 26, 10, 4);
    g.fillRoundedRect(-90, -24, 14, 30, 4);
    // 右アーム
    g.fillRoundedRect(54, -30, 26, 10, 4);
    g.fillRoundedRect(76, -24, 14, 30, 4);

    // ── シャワーヘッド（ノズル）
    // 左ヘッド
    g.fillStyle(0x222244);
    g.fillEllipse(-83, 10, 18, 12);
    g.fillStyle(0x0055cc);
    g.fillCircle(-83, 14, 6);
    // 水玉模様（ノズル穴）
    g.fillStyle(0x0088ff);
    g.fillCircle(-86, 12, 2); g.fillCircle(-83, 10, 2); g.fillCircle(-80, 12, 2);
    g.fillCircle(-85, 16, 2); g.fillCircle(-83, 17, 2); g.fillCircle(-81, 16, 2);

    // 右ヘッド
    g.fillStyle(0x222244);
    g.fillEllipse(83, 10, 18, 12);
    g.fillStyle(0x0055cc);
    g.fillCircle(83, 14, 6);
    g.fillStyle(0x0088ff);
    g.fillCircle(86, 12, 2); g.fillCircle(83, 10, 2); g.fillCircle(80, 12, 2);
    g.fillCircle(85, 16, 2); g.fillCircle(83, 17, 2); g.fillCircle(81, 16, 2);

    // 中央下ノズル（メイン砲）
    g.fillStyle(0x333355);
    g.fillRoundedRect(-12, 56, 24, 16, 4);
    g.fillStyle(0x0055cc);
    g.fillEllipse(0, 72, 22, 12);
    // ノズル穴
    g.fillStyle(0x0099ff);
    g.fillCircle(-6, 70, 3); g.fillCircle(0, 68, 3); g.fillCircle(6, 70, 3);

    // ── ゴムアヒル（マスコット）on top
    const duck = this.scene.add.graphics();
    this.add(duck);
    // アヒル体
    duck.fillStyle(0xffee00);
    duck.fillEllipse(40, -68, 22, 16);
    // 頭
    duck.fillStyle(0xffee00);
    duck.fillCircle(48, -76, 8);
    // くちばし
    duck.fillStyle(0xff8800);
    duck.fillEllipse(55, -76, 10, 4);
    // 目
    duck.fillStyle(0x000000);
    duck.fillCircle(50, -78, 2);
    // ハイライト
    duck.fillStyle(0xffffff);
    duck.fillCircle(51, -79, 1);

    // ── 警告ライト
    const lights = this.scene.add.graphics();
    this.add(lights);
    lights.fillStyle(0xff3300);
    lights.fillCircle(-52, -52, 7);
    lights.fillCircle(52, -52, 7);
    // ライトの点滅はTweenで

    // ── 泡演出用（Phase 2で溢れてくる）
    this.foamGfx = this.scene.add.graphics();
    this.foamGfx.setAlpha(0);
    this.add(this.foamGfx);
    this.drawFoam(0.3);
  }

  private drawFoam(density: number): void {
    this.foamGfx.clear();
    const positions = [
      [-40, -55], [-20, -58], [0, -62], [20, -58], [40, -55],
      [-55, -40], [55, -40], [-55, -20], [55, -20],
      [-30, -50], [30, -50], [-10, -60], [10, -60],
    ];
    positions.forEach(([x, y]) => {
      const size = Phaser.Math.Between(6, 14);
      this.foamGfx.fillStyle(0xeeffff, 0.6 * density);
      this.foamGfx.fillCircle(x, y, size);
      this.foamGfx.fillStyle(0xffffff, 0.3 * density);
      this.foamGfx.fillCircle(x - 2, y - 2, size * 0.5);
    });
  }

  private startEntry(): void {
    this.scene.tweens.add({
      targets: this,
      y: 140,
      duration: 2200,
      ease: 'Back.Out',
      onComplete: () => { this.entryComplete = true; },
    });
  }

  update(delta: number): void {
    if (!this.entryComplete || this.isDefeated) return;

    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      this.phase = 2;
      this.onPhase2();
    }

    // 左右移動
    this.moveTimer += delta;
    const period = this.phase === 1 ? 2600 : 1700;
    if (this.moveTimer > period) { this.moveDir *= -1; this.moveTimer = 0; }
    const spd = this.phase === 1 ? 60 : 100;
    this.x += this.moveDir * spd * (delta / 1000);
    this.x = Phaser.Math.Clamp(this.x, 100, GAME_WIDTH - 100);

    // 射撃
    this.shootTimer += delta;
    const interval = this.phase === 1 ? 1400 : 900;
    if (this.shootTimer >= interval) {
      this.shootTimer = 0;
      if (this.phase === 1) {
        this.shootPattern % 2 === 0 ? this.fireWaterSpray() : this.fireWaterSpray();
      } else {
        this.shootPattern % 3 === 0 ? this.fireWaterSpray() : this.shootPattern % 3 === 1 ? this.fireAimedJet() : this.fireBubbleSalvo();
      }
      this.shootPattern++;
    }
  }

  // フェーズ1: 扇状水スプレー（左右ノズルから）
  private fireWaterSpray(): void {
    const angles = this.phase === 1
      ? [-35, -15, 0, 15, 35]
      : [-50, -30, -15, 0, 15, 30, 50];

    angles.forEach(deg => {
      const rad = Phaser.Math.DegToRad(deg + 90);
      const spd = ENEMY_BULLET_SPEED * 1.1;
      const b = this.scene.add.graphics();
      // 水滴の形（縦長の楕円）
      b.fillStyle(0x44aaff, 0.9);
      b.fillEllipse(0, 2, 6, 10);
      b.fillStyle(0xaaddff, 0.6);
      b.fillEllipse(-1, 0, 3, 5);

      (b as any).x = this.x;
      (b as any).y = this.y + 75;
      (b as any).vx = Math.cos(rad) * spd;
      (b as any).vy = Math.sin(rad) * spd;
      (b as any).active = true;
      this.bullets.add(b as any);
    });
  }

  // フェーズ2: 狙い撃ちジェット
  private fireAimedJet(): void {
    const gameScene = this.scene as any;
    const player = gameScene.player;
    if (!player) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const spd = ENEMY_BULLET_SPEED * 1.6;

    const b = this.scene.add.graphics();
    // 高圧水流（細長い）
    b.fillStyle(0x0088ff, 0.95);
    b.fillEllipse(0, 0, 5, 14);
    b.fillStyle(0x88ddff, 0.7);
    b.fillEllipse(0, -2, 2, 7);

    (b as any).x = this.x;
    (b as any).y = this.y + 75;
    (b as any).vx = (dx / len) * spd;
    (b as any).vy = (dy / len) * spd;
    (b as any).active = true;
    this.bullets.add(b as any);
  }

  // フェーズ2: シャンプー泡の連発
  private fireBubbleSalvo(): void {
    for (let i = 0; i < 4; i++) {
      const xOffset = (i - 1.5) * 30;
      const b = this.scene.add.graphics();
      const r = Phaser.Math.Between(7, 12);
      // 泡（虹色っぽく）
      b.fillStyle(0xaaeeff, 0.55);
      b.fillCircle(0, 0, r);
      b.lineStyle(1.5, 0xffffff, 0.8);
      b.strokeCircle(0, 0, r);
      b.fillStyle(0xffffff, 0.4);
      b.fillCircle(-r * 0.3, -r * 0.3, r * 0.3);

      (b as any).x = this.x + xOffset;
      (b as any).y = this.y + 75;
      (b as any).vx = (Math.random() - 0.5) * 80;
      (b as any).vy = ENEMY_BULLET_SPEED * 0.8;
      (b as any).active = true;
      this.bullets.add(b as any);
    }
  }

  private onPhase2(): void {
    // 泡が溢れてくる演出
    this.foamGfx.setAlpha(1);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 80,
      yoyo: true,
      repeat: 10,
    });
    // 机体が揺れる
    this.scene.cameras.main.shake(400, 0.012);
  }

  takeDamage(dmg: number = 1): void {
    if (this.isDefeated) return;
    this.hp -= dmg;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 45,
      yoyo: true,
    });
  }
}
