import Phaser from 'phaser';
import { BOSS_HP, ENEMY_BULLET_SPEED, GAME_WIDTH } from '../config';

// Boss: ボスキャラクター
export class Boss extends Phaser.GameObjects.Container {
  public hp: number = BOSS_HP;
  public maxHp: number = BOSS_HP;
  public bullets: Phaser.GameObjects.Group;
  public isDefeated: boolean = false;

  private phase: number = 1;          // 1 or 2（HPが半分以下でフェーズ2）
  private moveDir: number = 1;
  private moveTimer: number = 0;
  private shootTimer: number = 0;
  private shootPattern: number = 0;
  private entryComplete: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_WIDTH / 2, -120);
    scene.add.existing(this);
    this.bullets = scene.add.group();
    this.draw();
    this.startEntry();
  }

  private draw(): void {
    const gfx = this.scene.add.graphics();
    this.add(gfx);

    // ── 本体（大型六角形）
    gfx.fillStyle(0xcc0066);
    gfx.fillRect(-50, -30, 100, 60);
    gfx.fillTriangle(0, -60, -50, -30, 50, -30);
    gfx.fillTriangle(0, 60, -50, 30, 50, 30);

    // ── 主砲
    gfx.fillStyle(0xff0044);
    gfx.fillRect(-8, -70, 16, 30);
    gfx.fillRect(-30, -50, 12, 22);
    gfx.fillRect(18, -50, 12, 22);

    // ── コア（光るアイ）
    gfx.fillStyle(0xffcc00);
    gfx.fillCircle(0, 0, 18);
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(0, 0, 10);

    // ── ウイング
    gfx.fillStyle(0x880033);
    gfx.fillTriangle(-80, 10, -50, -20, -50, 40);
    gfx.fillTriangle(80, 10, 50, -20, 50, 40);

    // ── ウイングライン
    gfx.lineStyle(2, 0xff66aa, 0.9);
    gfx.strokeTriangle(-80, 10, -50, -20, -50, 40);
    gfx.strokeTriangle(80, 10, 50, -20, 50, 40);

    // ── エンジン炎
    gfx.fillStyle(0xff6600, 0.8);
    gfx.fillTriangle(-20, 56, 20, 56, 0, 80);
    gfx.fillStyle(0xffcc00, 0.5);
    gfx.fillTriangle(-10, 56, 10, 56, 0, 70);
  }

  private startEntry(): void {
    // 上から滑り込む登場演出
    this.scene.tweens.add({
      targets: this,
      y: 130,
      duration: 2000,
      ease: 'Back.Out',
      onComplete: () => {
        this.entryComplete = true;
      },
    });
  }

  update(delta: number): void {
    if (!this.entryComplete || this.isDefeated) return;

    // フェーズ判定
    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      this.phase = 2;
      this.onPhase2();
    }

    // 左右移動
    this.moveTimer += delta;
    const movePeriod = this.phase === 1 ? 2500 : 1800;
    if (this.moveTimer > movePeriod) {
      this.moveDir *= -1;
      this.moveTimer = 0;
    }
    const speed = this.phase === 1 ? 70 : 110;
    this.x += this.moveDir * speed * (delta / 1000);
    this.x = Phaser.Math.Clamp(this.x, 80, GAME_WIDTH - 80);

    // 射撃
    this.shootTimer += delta;
    const interval = this.phase === 1 ? 1200 : 700;
    if (this.shootTimer >= interval) {
      this.shootTimer = 0;
      this.shootPattern % 2 === 0 ? this.fireSpread() : this.fireAimed();
      this.shootPattern++;
    }
  }

  // 扇状射撃（フェーズ1）
  private fireSpread(): void {
    const angles = this.phase === 1
      ? [-30, 0, 30]
      : [-45, -20, 0, 20, 45];

    angles.forEach(deg => {
      const rad = Phaser.Math.DegToRad(deg + 90);
      const b = this.scene.add.graphics();
      b.fillStyle(0xff2266);
      b.fillCircle(0, 0, 5);
      b.fillStyle(0xff88aa, 0.4);
      b.fillCircle(0, 0, 9);

      (b as any).x = this.x;
      (b as any).y = this.y + 60;
      (b as any).vx = Math.cos(rad) * ENEMY_BULLET_SPEED * 1.2;
      (b as any).vy = Math.sin(rad) * ENEMY_BULLET_SPEED * 1.2;
      (b as any).active = true;

      this.bullets.add(b as any);
    });
  }

  // 狙い撃ち（フェーズ2追加）
  private fireAimed(): void {
    // GameSceneからプレイヤー位置を参照
    const gameScene = this.scene as any;
    const player = gameScene.player;
    if (!player) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const spd = ENEMY_BULLET_SPEED * 1.4;

    const b = this.scene.add.graphics();
    b.fillStyle(0xffaa00);
    b.fillCircle(0, 0, 6);
    b.fillStyle(0xffdd44, 0.5);
    b.fillCircle(0, 0, 10);

    (b as any).x = this.x;
    (b as any).y = this.y + 60;
    (b as any).vx = (dx / len) * spd;
    (b as any).vy = (dy / len) * spd;
    (b as any).active = true;

    this.bullets.add(b as any);
  }

  private onPhase2(): void {
    // フェーズ2突入演出（赤く点滅）
    this.scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 100,
      yoyo: true,
      repeat: 8,
    });
  }

  takeDamage(dmg: number = 1): void {
    if (this.isDefeated) return;
    this.hp -= dmg;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
    });
  }
}
