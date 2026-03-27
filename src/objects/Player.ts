import Phaser from 'phaser';
import {
  PLAYER_SPEED, PLAYER_SHOOT_INTERVAL,
  PLAYER_MAX_LIVES, PLAYER_MAX_BOMBS,
  PLAYER_INVINCIBLE_DURATION,
  GAME_WIDTH, GAME_HEIGHT,
  POWERUP_SHOOT_INTERVAL, SUPER_MODE_SHOOT_INTERVAL,
  SUPER_MODE_SPEED_MULT,
} from '../config';

// ショットパワーレベル
// 0: 通常（骨1発）  1: パワーアップ（3方向骨）  (スーパーモードは別フラグ)
export type PowerLevel = 0 | 1;

// Player: 宇宙服を着た柴犬
export class Player extends Phaser.GameObjects.Container {
  public lives: number = PLAYER_MAX_LIVES;
  public bombs: number = PLAYER_MAX_BOMBS;
  public score: number = 0;
  public isInvincible: boolean = false;

  // パワーアップ状態
  public powerLevel: PowerLevel = 0;
  public isSuperMode: boolean = false;

  private shootTimer: number = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;

  // 個別アニメーション用パーツ
  private earLeft!: Phaser.GameObjects.Graphics;
  private earRight!: Phaser.GameObjects.Graphics;
  private tail!: Phaser.GameObjects.Graphics;
  private thrusterGfx!: Phaser.GameObjects.Graphics;
  private auraGfx!: Phaser.GameObjects.Graphics;  // スーパーモード時のオーラ

  public bullets!: Phaser.GameObjects.Group;

  public onShoot?: () => void;
  public onBomb?: () => void;
  public onDamage?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.draw();
    this.setupInput();
    this.setupBullets();
  }

  // ── 描画 ────────────────────────────────────────────

  private draw(): void {
    // オーラ（スーパーモード時・最背面）
    this.auraGfx = this.scene.add.graphics();
    this.auraGfx.setAlpha(0);
    this.add(this.auraGfx);
    this.drawAura();

    // スラスター炎
    this.thrusterGfx = this.scene.add.graphics();
    this.add(this.thrusterGfx);

    // 尻尾（根元を基準にアニメ）
    this.tail = this.scene.add.graphics();
    this.tail.setPosition(12, 4);
    this.add(this.tail);
    this.redrawTail(0);

    // スーツ本体
    const body = this.scene.add.graphics();
    this.add(body);

    body.fillStyle(0xcccccc);
    body.fillRoundedRect(-12, 22, 10, 10, 3);
    body.fillRoundedRect(2, 22, 10, 10, 3);
    body.fillStyle(0xdd8844);
    body.fillEllipse(-7, 31, 11, 6);
    body.fillEllipse(7, 31, 11, 6);

    body.fillStyle(0xcccccc);
    body.fillRoundedRect(-22, 2, 10, 14, 3);
    body.fillRoundedRect(12, 2, 10, 14, 3);
    body.fillStyle(0xdd8844);
    body.fillCircle(-17, 17, 6);
    body.fillCircle(17, 17, 6);
    body.fillStyle(0xcc6622, 0.6);
    body.fillCircle(-17, 17, 3);
    body.fillCircle(-14, 14, 2);
    body.fillCircle(-20, 14, 2);
    body.fillCircle(17, 17, 3);
    body.fillCircle(20, 14, 2);
    body.fillCircle(14, 14, 2);

    body.fillStyle(0xe8e8e8);
    body.fillEllipse(0, 8, 28, 34);
    body.lineStyle(1.5, 0xbbbbbb, 0.8);
    body.strokeEllipse(0, 8, 28, 34);

    body.fillStyle(0x3366aa);
    body.fillRoundedRect(-8, 2, 16, 12, 3);
    body.fillStyle(0x00ff88);
    body.fillCircle(-5, 5, 2);
    body.fillStyle(0xff4400);
    body.fillCircle(0, 5, 2);
    body.fillStyle(0xffdd00);
    body.fillCircle(5, 5, 2);
    body.fillStyle(0xaaaaaa);
    body.fillRect(-7, 9, 14, 3);

    body.fillStyle(0x999999);
    body.fillRoundedRect(-6, 16, 12, 10, 2);
    body.fillStyle(0x666666);
    body.fillCircle(-4, 22, 2);
    body.fillCircle(4, 22, 2);

    body.fillStyle(0xdddddd);
    body.fillEllipse(0, -7, 24, 10);

    // 耳（ヘルメット外）
    this.earLeft = this.scene.add.graphics();
    this.earLeft.setPosition(-11, -24);
    this.add(this.earLeft);

    this.earRight = this.scene.add.graphics();
    this.earRight.setPosition(11, -24);
    this.add(this.earRight);

    this.redrawEars();

    // ヘルメット + 顔
    const head = this.scene.add.graphics();
    this.add(head);

    head.fillStyle(0xeeeeee);
    head.fillCircle(0, -16, 14);
    head.fillStyle(0xdd7700);
    head.fillCircle(0, -16, 11);
    head.fillStyle(0xffcc88);
    head.fillEllipse(0, -12, 14, 10);
    head.fillStyle(0x111111);
    head.fillEllipse(0, -11, 7, 5);
    head.fillStyle(0x555555, 0.5);
    head.fillCircle(-1, -12, 2);

    head.fillStyle(0x000000);
    head.fillCircle(-4, -18, 3.5);
    head.fillCircle(4, -18, 3.5);
    head.fillStyle(0xffffff);
    head.fillCircle(-3, -19, 1.5);
    head.fillCircle(5, -19, 1.5);

    head.lineStyle(1.5, 0x222222, 0.9);
    head.beginPath();
    head.arc(0, -11, 4, 0, Math.PI, false);
    head.strokePath();

    head.fillStyle(0xff9988, 0.35);
    head.fillCircle(-8, -14, 5);
    head.fillCircle(8, -14, 5);

    head.fillStyle(0x44aaff, 0.18);
    head.fillCircle(0, -16, 11);
    head.lineStyle(2.5, 0xffffff, 0.9);
    head.strokeCircle(0, -16, 11);
    head.fillStyle(0xffffff, 0.5);
    head.fillEllipse(-4, -23, 7, 4);

    // キャノン
    const cannon = this.scene.add.graphics();
    this.add(cannon);
    cannon.fillStyle(0x0088cc);
    cannon.fillRoundedRect(-3, -32, 6, 10, 2);
    cannon.fillStyle(0x00ccff);
    cannon.fillRoundedRect(-2, -38, 4, 10, 1);
    cannon.fillStyle(0x88eeff);
    cannon.fillCircle(0, -38, 2.5);

    this.redrawThruster(1.0);
  }

  private drawAura(): void {
    this.auraGfx.clear();
    // 黄金のオーラリング（スーパーモード用）
    this.auraGfx.lineStyle(4, 0xffd700, 0.85);
    this.auraGfx.strokeCircle(0, 0, 38);
    this.auraGfx.lineStyle(8, 0xffee44, 0.25);
    this.auraGfx.strokeCircle(0, 0, 44);
    // 8方向スパーク
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const x1 = Math.cos(angle) * 38;
      const y1 = Math.sin(angle) * 38;
      const x2 = Math.cos(angle) * 50;
      const y2 = Math.sin(angle) * 50;
      this.auraGfx.lineStyle(2, 0xffd700, 0.6);
      this.auraGfx.lineBetween(x1, y1, x2, y2);
    }
  }

  private redrawThruster(intensity: number): void {
    this.thrusterGfx.clear();
    const h = 12 + intensity * 10;
    // スーパーモード時は黄金炎
    const color1 = this.isSuperMode ? 0xffcc00 : 0xff6600;
    const color2 = this.isSuperMode ? 0xffffff : 0xffcc00;
    this.thrusterGfx.fillStyle(color1, 0.9);
    this.thrusterGfx.fillTriangle(-7, 28, 7, 28, 0, 28 + h);
    this.thrusterGfx.fillStyle(color2, 0.7);
    this.thrusterGfx.fillTriangle(-4, 28, 4, 28, 0, 28 + h * 0.65);
    this.thrusterGfx.fillStyle(0xffffff, 0.5);
    this.thrusterGfx.fillTriangle(-2, 28, 2, 28, 0, 28 + h * 0.3);
  }

  private redrawTail(angle: number): void {
    this.tail.clear();
    this.tail.setRotation(angle);
    this.tail.fillStyle(0xcc6600);
    this.tail.fillCircle(2, 0, 5);
    this.tail.fillCircle(8, -4, 5);
    this.tail.fillCircle(13, -8, 4.5);
    this.tail.fillCircle(16, -12, 3.5);
    this.tail.fillStyle(0xffcc88);
    this.tail.fillCircle(16, -12, 2);
  }

  private redrawEars(): void {
    this.earLeft.clear();
    this.earLeft.fillStyle(0xcc6600);
    this.earLeft.fillTriangle(-6, 2, 6, 2, 0, -14);
    this.earLeft.fillStyle(0xff9999, 0.75);
    this.earLeft.fillTriangle(-4, 1, 4, 1, 0, -10);

    this.earRight.clear();
    this.earRight.fillStyle(0xcc6600);
    this.earRight.fillTriangle(-6, 2, 6, 2, 0, -14);
    this.earRight.fillStyle(0xff9999, 0.75);
    this.earRight.fillTriangle(-4, 1, 4, 1, 0, -10);
  }

  // ── セットアップ ─────────────────────────────────────

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

  // ── 更新 ────────────────────────────────────────────

  update(delta: number): void {
    if (this.lives <= 0) return;

    // スーパーモード時は速度1.5倍
    const speed = PLAYER_SPEED * (this.isSuperMode ? SUPER_MODE_SPEED_MULT : 1.0);

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    this.x = Phaser.Math.Clamp(this.x + vx * (delta / 1000), 24, GAME_WIDTH - 24);
    this.y = Phaser.Math.Clamp(this.y + vy * (delta / 1000), 40, GAME_HEIGHT - 40);

    this.setRotation(vx * 0.00028);

    // 耳アニメ
    const now = Date.now();
    const earTarget = vx * 0.002 + Math.sin(now * 0.002) * 0.06;
    this.earLeft.rotation = Phaser.Math.Linear(this.earLeft.rotation, earTarget, 0.12);
    this.earRight.rotation = Phaser.Math.Linear(this.earRight.rotation, earTarget, 0.12);

    // 尻尾アニメ
    const tailTarget = -vx * 0.0015 + Math.sin(now * 0.004) * 0.25 + (vy < 0 ? -0.3 : 0);
    this.tail.rotation = Phaser.Math.Linear(this.tail.rotation, tailTarget, 0.1);
    this.redrawTail(this.tail.rotation);

    // スラスター
    this.redrawThruster(vy < 0 ? 1.6 : 1.0);

    // 連射間隔（パワーレベルに応じて変化）
    const interval = this.isSuperMode
      ? SUPER_MODE_SHOOT_INTERVAL
      : this.powerLevel >= 1 ? POWERUP_SHOOT_INTERVAL : PLAYER_SHOOT_INTERVAL;

    this.shootTimer += delta;
    if (this.spaceKey.isDown && this.shootTimer >= interval) {
      this.shootTimer = 0;
      this.fireBone();
    }

    if (Phaser.Input.Keyboard.JustDown(this.shiftKey)) {
      this.useBomb();
    }
  }

  // ── 弾発射（パワーレベル対応）───────────────────────

  private fireBone(): void {
    // 発射角度（度）
    // Normal: 正面1発  PowerUp: 3方向  SuperMode: 3方向（豪華版）
    const angles: number[] =
      this.powerLevel >= 1 || this.isSuperMode
        ? [-20, 0, 20]
        : [0];

    const isSuper = this.isSuperMode;
    const boneColor  = isSuper ? 0xffd700 : 0xffffff;
    const glowColor  = isSuper ? 0xffee88 : 0xeeeeff;
    const boneScale  = isSuper ? 1.45 : 1.0;

    angles.forEach(deg => {
      const rad = Phaser.Math.DegToRad(-90 + deg); // -90 = 真上
      const speed = 640;
      const vx = Math.cos(rad) * speed;
      const vy = Math.sin(rad) * speed;

      const bone = this.scene.add.graphics();
      const s = boneScale;

      // 骨の形
      bone.fillStyle(boneColor);
      bone.fillRect(-2 * s, -8 * s, 4 * s, 16 * s);   // シャフト
      bone.fillCircle(-4 * s, -6 * s, 4 * s);           // 上ノブ左
      bone.fillCircle(4 * s, -6 * s, 4 * s);            // 上ノブ右
      bone.fillCircle(-4 * s, 6 * s, 4 * s);            // 下ノブ左
      bone.fillCircle(4 * s, 6 * s, 4 * s);             // 下ノブ右

      // 光沢
      bone.fillStyle(glowColor, 0.6);
      bone.fillRect(-1, -8 * s, 2, 16 * s);

      // スーパーモードは輪光追加
      if (isSuper) {
        bone.lineStyle(1.8, 0xffd700, 0.5);
        bone.strokeCircle(0, 0, 10 * s);
        bone.fillStyle(0xffffff, 0.2);
        bone.fillCircle(0, -6 * s, 3 * s);
      }

      // 3方向弾は発射角に合わせて回転
      if (deg !== 0) {
        bone.setRotation(Phaser.Math.DegToRad(deg));
      }

      (bone as any).x = this.x;
      (bone as any).y = this.y - 32;
      (bone as any).vx = vx;
      (bone as any).vy = vy;
      (bone as any).active = true;

      this.bullets.add(bone as any);
    });

    if (this.onShoot) this.onShoot();
  }

  private useBomb(): void {
    if (this.bombs <= 0) return;
    this.bombs--;
    if (this.onBomb) this.onBomb();
  }

  // ── パワーアップ API ─────────────────────────────────

  // 骨アイテム取得時に呼ばれる
  activatePowerup(): 'new' | 'bonus' {
    if (this.powerLevel < 1) {
      this.powerLevel = 1;
      return 'new';       // 初めてパワーアップ
    }
    return 'bonus';       // 既にパワーアップ済み → ボーナス扱い
  }

  // ステージ2到達時に呼ばれる
  activateSuperMode(): void {
    if (this.isSuperMode) return;
    this.isSuperMode = true;

    // オーラ表示（脈動）
    this.auraGfx.setAlpha(1);
    this.scene.tweens.add({
      targets: this.auraGfx,
      alpha: 0.45,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  // ── ダメージ ─────────────────────────────────────────

  takeDamage(): void {
    if (this.isInvincible) return;
    this.lives--;
    if (this.onDamage) this.onDamage();
    if (this.lives > 0) this.startInvincibility();
  }

  private startInvincibility(): void {
    this.isInvincible = true;
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
