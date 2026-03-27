import Phaser from 'phaser';
import { ENEMY_BULLET_SPEED, GAME_WIDTH } from '../config';

export type EnemyType = 'straight' | 'zigzag' | 'formation';

// Enemy: 通常敵キャラクター（3種類）
export class Enemy extends Phaser.GameObjects.Container {
  public hp: number;
  public score: number;
  public enemyType: EnemyType;
  public bullets: Phaser.GameObjects.Group;

  private gfx!: Phaser.GameObjects.Graphics;
  private moveTimer: number = 0;
  private zigzagDir: number = 1;
  private shootTimer: number = 0;
  private shootInterval: number;
  private speed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    super(scene, x, y);
    scene.add.existing(this);

    this.enemyType = type;
    this.bullets = scene.add.group();

    switch (type) {
      case 'straight':
        this.hp = 1; this.score = 100; this.speed = 140; this.shootInterval = 2500;
        break;
      case 'zigzag':
        this.hp = 2; this.score = 250; this.speed = 110; this.shootInterval = 2000;
        break;
      case 'formation':
        this.hp = 1; this.score = 150; this.speed = 160; this.shootInterval = 3000;
        break;
    }

    this.draw(type);
  }

  private draw(type: EnemyType): void {
    const gfx = this.scene.add.graphics();
    this.gfx = gfx;
    this.add(gfx);

    switch (type) {
      case 'straight':
        // 六角形の赤い敵
        gfx.fillStyle(0xff4444);
        gfx.fillRect(-14, -6, 28, 12);
        gfx.fillTriangle(0, -18, -14, -6, 14, -6);
        gfx.fillTriangle(0, 18, -14, 6, 14, 6);
        gfx.fillStyle(0xff8888);
        gfx.fillCircle(0, 0, 6);
        gfx.fillStyle(0xffcccc, 0.5);
        gfx.fillCircle(0, 0, 3);
        // エンジン噴射
        gfx.fillStyle(0xff6600, 0.8);
        gfx.fillTriangle(-5, 14, 5, 14, 0, 24);
        break;

      case 'zigzag':
        // ダイヤ形の橙色の敵（やや強い）
        gfx.fillStyle(0xff8800);
        gfx.fillTriangle(0, -22, -16, 0, 0, 8);
        gfx.fillTriangle(0, -22, 16, 0, 0, 8);
        gfx.fillTriangle(-16, 0, 16, 0, 0, 22);
        gfx.fillStyle(0xffcc44);
        gfx.fillCircle(0, 0, 5);
        gfx.lineStyle(1.5, 0xffdd88, 0.7);
        gfx.strokeCircle(0, 0, 10);
        break;

      case 'formation':
        // 薄い緑の三角形（高速・編隊）
        gfx.fillStyle(0x44ff88);
        gfx.fillTriangle(0, -16, -12, 12, 12, 12);
        gfx.fillStyle(0x00cc44);
        gfx.fillCircle(0, 2, 5);
        gfx.lineStyle(1, 0x88ffaa, 0.8);
        gfx.strokeTriangle(0, -16, -12, 12, 12, 12);
        break;
    }
  }

  update(delta: number): void {
    // 移動
    switch (this.enemyType) {
      case 'straight':
        this.y += this.speed * (delta / 1000);
        break;

      case 'zigzag':
        this.moveTimer += delta;
        if (this.moveTimer > 1200) {
          this.zigzagDir *= -1;
          this.moveTimer = 0;
        }
        this.y += this.speed * (delta / 1000);
        this.x += this.zigzagDir * 90 * (delta / 1000);
        this.x = Phaser.Math.Clamp(this.x, 20, GAME_WIDTH - 20);
        break;

      case 'formation':
        this.y += this.speed * (delta / 1000);
        // 緩やかにプレイヤーの方向へ
        break;
    }

    // ショット
    this.shootTimer += delta;
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      this.fireBullet();
    }
  }

  private fireBullet(): void {
    if (this.y < 0 || this.y > 800) return;

    const b = this.scene.add.graphics();
    b.fillStyle(0xff4466);
    b.fillCircle(0, 0, 4);
    b.fillStyle(0xffaaaa, 0.5);
    b.fillCircle(0, 0, 7);

    (b as any).x = this.x;
    (b as any).y = this.y + 16;
    (b as any).vy = ENEMY_BULLET_SPEED;
    (b as any).active = true;

    this.bullets.add(b as any);
  }

  takeDamage(dmg: number = 1): boolean {
    this.hp -= dmg;
    // 被弾フラッシュ
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
    });
    return this.hp <= 0;
  }
}
