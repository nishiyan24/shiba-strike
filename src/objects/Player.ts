import Phaser from 'phaser';
import {
  PLAYER_SPEED, PLAYER_SHOOT_INTERVAL,
  PLAYER_MAX_LIVES, PLAYER_MAX_BOMBS,
  PLAYER_INVINCIBLE_DURATION,
  GAME_WIDTH, GAME_HEIGHT,
  BULLET_SPEED,
} from '../config';

// Player: 自機（スタイリッシュ柴犬戦闘機）
export class Player extends Phaser.GameObjects.Container {
  public lives: number = PLAYER_MAX_LIVES;
  public bombs: number = PLAYER_MAX_BOMBS;
  public score: number = 0;
  public isInvincible: boolean = false;

  private body_gfx!: Phaser.GameObjects.Graphics;
  private shootTimer: number = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  public bullets!: Phaser.GameObjects.Group;

  // イベント用コールバック
  public onShoot?: () => void;
  public onBomb?: () => void;
  public onDamage?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.drawShiba();
    this.setupInput();
    this.setupBullets();
  }

  // 柴犬戦闘機をプログラムで描画
  private drawShiba(): void {
    const gfx = this.scene.add.graphics();
    this.body_gfx = gfx;
    this.add(gfx);

    // ── エンジン炎（後部）
    gfx.fillStyle(0xff6600, 0.9);
    gfx.fillTriangle(-8, 16, 8, 16, 0, 36);
    gfx.fillStyle(0xffcc00, 0.7);
    gfx.fillTriangle(-4, 16, 4, 16, 0, 28);

    // ── 主翼（左右）
    gfx.fillStyle(0x2266cc);
    gfx.fillTriangle(-28, 8, -6, -4, -6, 16);   // 左翼
    gfx.fillTriangle(28, 8, 6, -4, 6, 16);        // 右翼

    // ── 機体本体
    gfx.fillStyle(0x3388ff);
    gfx.fillRoundedRect(-7, -20, 14, 38, 4);

    // ── コックピット（柴犬の顔）
    gfx.fillStyle(0xffcc66);  // 柴犬色
    gfx.fillCircle(0, -14, 9);

    // 耳（三角）
    gfx.fillStyle(0xdd8833);
    gfx.fillTriangle(-9, -20, -4, -20, -7, -28); // 左耳
    gfx.fillTriangle(9, -20, 4, -20, 7, -28);    // 右耳

    // 目
    gfx.fillStyle(0x000000);
    gfx.fillCircle(-3, -15, 2);
    gfx.fillCircle(3, -15, 2);

    // 鼻
    gfx.fillStyle(0x000000);
    gfx.fillEllipse(0, -10, 5, 3);

    // ── キャノン（先端）
    gfx.fillStyle(0x00ccff);
    gfx.fillRect(-2, -32, 4, 14);

    // ── ウイングライン（アクセント）
    gfx.lineStyle(1.5, 0x00eeff, 0.8);
    gfx.strokeTriangle(-28, 8, -6, -4, -6, 16);
    gfx.strokeTriangle(28, 8, 6, -4, 6, 16);
  }

  private setupInput(): void {
    const kb = this.scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shiftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  private setupBullets(): void {
    this.bullets = this.scene.add.group();
  }

  update(delta: number): void {
    if (this.lives <= 0) return;

    // 移動
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -PLAYER_SPEED;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = PLAYER_SPEED;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -PLAYER_SPEED;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = PLAYER_SPEED;

    // 斜め移動の速度を正規化
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.x = Phaser.Math.Clamp(this.x + vx * (delta / 1000), 24, GAME_WIDTH - 24);
    this.y = Phaser.Math.Clamp(this.y + vy * (delta / 1000), 40, GAME_HEIGHT - 40);

    // 傾きアニメーション
    this.setRotation(vx * 0.0004);

    // ショット
    this.shootTimer += delta;
    if (this.spaceKey.isDown && this.shootTimer >= PLAYER_SHOOT_INTERVAL) {
      this.shootTimer = 0;
      this.fireBullet();
    }

    // ボム
    if (Phaser.Input.Keyboard.JustDown(this.shiftKey)) {
      this.useBomb();
    }
  }

  private fireBullet(): void {
    const bullet = this.scene.add.graphics();
    bullet.fillStyle(0xffff44);
    bullet.fillRect(-2, -8, 4, 16);
    // 光るコア
    bullet.fillStyle(0xffffff);
    bullet.fillRect(-1, -8, 2, 6);

    (bullet as any).x = this.x;
    (bullet as any).y = this.y - 30;
    (bullet as any).vy = -BULLET_SPEED;
    (bullet as any).active = true;

    this.bullets.add(bullet as any);

    if (this.onShoot) this.onShoot();
  }

  private useBomb(): void {
    if (this.bombs <= 0) return;
    this.bombs--;
    if (this.onBomb) this.onBomb();
  }

  // ダメージを受ける
  takeDamage(): void {
    if (this.isInvincible) return;
    this.lives--;
    if (this.onDamage) this.onDamage();

    if (this.lives > 0) {
      this.startInvincibility();
    }
  }

  private startInvincibility(): void {
    this.isInvincible = true;
    // 点滅エフェクト
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: Math.floor(PLAYER_INVINCIBLE_DURATION / 300),
      onComplete: () => {
        this.alpha = 1;
        this.isInvincible = false;
      },
    });
  }
}
