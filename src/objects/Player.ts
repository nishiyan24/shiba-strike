import Phaser from 'phaser';
import {
  PLAYER_SPEED, PLAYER_SHOOT_INTERVAL,
  PLAYER_MAX_LIVES, PLAYER_MAX_BOMBS,
  PLAYER_INVINCIBLE_DURATION,
  GAME_WIDTH, GAME_HEIGHT,
} from '../config';

// Player: 宇宙服を着たスタイリッシュ柴犬
export class Player extends Phaser.GameObjects.Container {
  public lives: number = PLAYER_MAX_LIVES;
  public bombs: number = PLAYER_MAX_BOMBS;
  public score: number = 0;
  public isInvincible: boolean = false;

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

  // 宇宙服柴犬を描画
  private draw(): void {
    // ── スラスター炎（最背面）
    this.thrusterGfx = this.scene.add.graphics();
    this.add(this.thrusterGfx);

    // ── 尻尾（スーツから飛び出している）
    this.tail = this.scene.add.graphics();
    this.tail.setPosition(12, 4); // コンテナ内での尻尾の根元位置
    this.add(this.tail);
    this.redrawTail(0);

    // ── スーツ本体
    const body = this.scene.add.graphics();
    this.add(body);

    // 脚・ブーツ
    body.fillStyle(0xcccccc);
    body.fillRoundedRect(-12, 22, 10, 10, 3);
    body.fillRoundedRect(2, 22, 10, 10, 3);
    // 肉球色のブーツ先
    body.fillStyle(0xdd8844);
    body.fillEllipse(-7, 31, 11, 6);
    body.fillEllipse(7, 31, 11, 6);

    // 腕・グローブ
    body.fillStyle(0xcccccc);
    body.fillRoundedRect(-22, 2, 10, 14, 3);
    body.fillRoundedRect(12, 2, 10, 14, 3);
    // グローブ（肉球色）
    body.fillStyle(0xdd8844);
    body.fillCircle(-17, 17, 6);
    body.fillCircle(17, 17, 6);
    // 肉球の模様
    body.fillStyle(0xcc6622, 0.6);
    body.fillCircle(-17, 17, 3);
    body.fillCircle(-14, 14, 2);
    body.fillCircle(-20, 14, 2);
    body.fillCircle(17, 17, 3);
    body.fillCircle(20, 14, 2);
    body.fillCircle(14, 14, 2);

    // メインボディ（白いスーツ）
    body.fillStyle(0xe8e8e8);
    body.fillEllipse(0, 8, 28, 34);

    // スーツのアクセントライン
    body.lineStyle(1.5, 0xbbbbbb, 0.8);
    body.strokeEllipse(0, 8, 28, 34);

    // 胸のコントロールパネル
    body.fillStyle(0x3366aa);
    body.fillRoundedRect(-8, 2, 16, 12, 3);
    // パネルのライト
    body.fillStyle(0x00ff88);
    body.fillCircle(-5, 5, 2);
    body.fillStyle(0xff4400);
    body.fillCircle(0, 5, 2);
    body.fillStyle(0xffdd00);
    body.fillCircle(5, 5, 2);
    // パネルのボタン列
    body.fillStyle(0xaaaaaa);
    body.fillRect(-7, 9, 14, 3);

    // バックパック（スラスターユニット）
    body.fillStyle(0x999999);
    body.fillRoundedRect(-6, 16, 12, 10, 2);
    body.fillStyle(0x666666);
    body.fillCircle(-4, 22, 2);
    body.fillCircle(4, 22, 2);

    // ヘルメット基部（首輪部分）
    body.fillStyle(0xdddddd);
    body.fillEllipse(0, -7, 24, 10);

    // ── 耳（ヘルメットの外に出ている）
    this.earLeft = this.scene.add.graphics();
    this.earLeft.setPosition(-11, -24); // 左耳の根元
    this.add(this.earLeft);

    this.earRight = this.scene.add.graphics();
    this.earRight.setPosition(11, -24); // 右耳の根元
    this.add(this.earRight);

    this.redrawEars();

    // ── ヘルメット + 柴犬の顔
    const head = this.scene.add.graphics();
    this.add(head);

    // ヘルメット外殻（白）
    head.fillStyle(0xeeeeee);
    head.fillCircle(0, -16, 14);

    // 柴犬の顔（橙色）
    head.fillStyle(0xdd7700);
    head.fillCircle(0, -16, 11);

    // 顔の白い部分（マズル）
    head.fillStyle(0xffcc88);
    head.fillEllipse(0, -12, 14, 10);

    // 鼻
    head.fillStyle(0x111111);
    head.fillEllipse(0, -11, 7, 5);
    // 鼻の光沢
    head.fillStyle(0x555555, 0.5);
    head.fillCircle(-1, -12, 2);

    // 目（まん丸でかわいい）
    head.fillStyle(0x000000);
    head.fillCircle(-4, -18, 3.5);
    head.fillCircle(4, -18, 3.5);
    // 白目（ハイライト）
    head.fillStyle(0xffffff);
    head.fillCircle(-3, -19, 1.5);
    head.fillCircle(5, -19, 1.5);
    // 小さな瞳孔反射
    head.fillStyle(0xffffff, 0.6);
    head.fillCircle(-2, -17, 0.8);

    // 笑顔の線（口）
    head.lineStyle(1.5, 0x222222, 0.9);
    head.beginPath();
    head.arc(0, -11, 4, 0, Math.PI, false);
    head.strokePath();

    // ほっぺのぽっ（赤みがかった円）
    head.fillStyle(0xff9988, 0.35);
    head.fillCircle(-8, -14, 5);
    head.fillCircle(8, -14, 5);

    // ヘルメットバイザー（青透明）
    head.fillStyle(0x44aaff, 0.18);
    head.fillCircle(0, -16, 11);

    // ヘルメットリム（白フレーム）
    head.lineStyle(2.5, 0xffffff, 0.9);
    head.strokeCircle(0, -16, 11);

    // ヘルメット反射
    head.fillStyle(0xffffff, 0.5);
    head.fillEllipse(-4, -23, 7, 4);

    // ── キャノン（頭頂部）
    const cannon = this.scene.add.graphics();
    this.add(cannon);
    cannon.fillStyle(0x0088cc);
    cannon.fillRoundedRect(-3, -32, 6, 10, 2);
    cannon.fillStyle(0x00ccff);
    cannon.fillRoundedRect(-2, -38, 4, 10, 1);
    // 砲口の光
    cannon.fillStyle(0x88eeff);
    cannon.fillCircle(0, -38, 2.5);

    this.redrawThruster(1.0);
  }

  // スラスター炎の描画
  private redrawThruster(intensity: number): void {
    this.thrusterGfx.clear();
    const h = 12 + intensity * 10;
    this.thrusterGfx.fillStyle(0xff6600, 0.9);
    this.thrusterGfx.fillTriangle(-7, 28, 7, 28, 0, 28 + h);
    this.thrusterGfx.fillStyle(0xffcc00, 0.7);
    this.thrusterGfx.fillTriangle(-4, 28, 4, 28, 0, 28 + h * 0.65);
    this.thrusterGfx.fillStyle(0xffffff, 0.5);
    this.thrusterGfx.fillTriangle(-2, 28, 2, 28, 0, 28 + h * 0.3);
  }

  // 尻尾の再描画（angle = 振れ角）
  private redrawTail(angle: number): void {
    this.tail.clear();
    this.tail.setRotation(angle);
    // 根元
    this.tail.fillStyle(0xcc6600);
    this.tail.fillCircle(2, 0, 5);
    // 中間
    this.tail.fillCircle(8, -4, 5);
    // 先端（くるん）
    this.tail.fillCircle(13, -8, 4.5);
    this.tail.fillCircle(16, -12, 3.5);
    // 尾先の白い部分（柴犬特有）
    this.tail.fillStyle(0xffcc88);
    this.tail.fillCircle(16, -12, 2);
  }

  // 耳の再描画
  private redrawEars(): void {
    this.earLeft.clear();
    this.earLeft.fillStyle(0xcc6600);
    this.earLeft.fillTriangle(-6, 2, 6, 2, 0, -14); // 耳の外形
    this.earLeft.fillStyle(0xff9999, 0.75);
    this.earLeft.fillTriangle(-4, 1, 4, 1, 0, -10); // 内耳ピンク

    this.earRight.clear();
    this.earRight.fillStyle(0xcc6600);
    this.earRight.fillTriangle(-6, 2, 6, 2, 0, -14);
    this.earRight.fillStyle(0xff9999, 0.75);
    this.earRight.fillTriangle(-4, 1, 4, 1, 0, -10);
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

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -PLAYER_SPEED;
    if (this.cursors.right.isDown || this.wasd.right.isDown) vx = PLAYER_SPEED;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -PLAYER_SPEED;
    if (this.cursors.down.isDown || this.wasd.down.isDown) vy = PLAYER_SPEED;

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    this.x = Phaser.Math.Clamp(this.x + vx * (delta / 1000), 24, GAME_WIDTH - 24);
    this.y = Phaser.Math.Clamp(this.y + vy * (delta / 1000), 40, GAME_HEIGHT - 40);

    // ── ボディの傾き
    this.setRotation(vx * 0.00028);

    // ── 耳のアニメーション（動きに合わせてなびく）
    const now = Date.now();
    const earTargetAngle = vx * 0.002 + Math.sin(now * 0.002) * 0.06;
    this.earLeft.rotation = Phaser.Math.Linear(this.earLeft.rotation, earTargetAngle, 0.12);
    this.earRight.rotation = Phaser.Math.Linear(this.earRight.rotation, earTargetAngle, 0.12);

    // ── 尻尾のアニメーション（ふりふり）
    const tailBase = Math.sin(now * 0.004) * 0.25;
    const tailTarget = -vx * 0.0015 + tailBase + (vy < 0 ? -0.3 : 0);
    this.tail.rotation = Phaser.Math.Linear(this.tail.rotation, tailTarget, 0.1);
    this.redrawTail(this.tail.rotation);

    // ── スラスター強度（上昇中は強く）
    const thrustIntensity = vy < 0 ? 1.6 : 1.0;
    this.redrawThruster(thrustIntensity);

    // ── ショット
    this.shootTimer += delta;
    if (this.spaceKey.isDown && this.shootTimer >= PLAYER_SHOOT_INTERVAL) {
      this.shootTimer = 0;
      this.fireBone();
    }

    // ── ボム
    if (Phaser.Input.Keyboard.JustDown(this.shiftKey)) {
      this.useBomb();
    }
  }

  // 骨を発射
  private fireBone(): void {
    const bone = this.scene.add.graphics();

    // 骨の形：上下にノブ、中央にシャフト
    bone.fillStyle(0xffffff);
    // シャフト（縦棒）
    bone.fillRect(-2, -9, 4, 18);
    // 上のノブ（左右）
    bone.fillCircle(-4, -7, 4);
    bone.fillCircle(4, -7, 4);
    // 下のノブ（左右）
    bone.fillCircle(-4, 7, 4);
    bone.fillCircle(4, 7, 4);
    // 骨の光沢
    bone.fillStyle(0xeeeeff, 0.6);
    bone.fillRect(-1, -9, 2, 18);

    (bone as any).x = this.x;
    (bone as any).y = this.y - 32;
    (bone as any).vy = -620;
    (bone as any).active = true;

    this.bullets.add(bone as any);
    if (this.onShoot) this.onShoot();
  }

  private useBomb(): void {
    if (this.bombs <= 0) return;
    this.bombs--;
    if (this.onBomb) this.onBomb();
  }

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
