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

  // 吸引ギミック用：カーソル状態を外部から読み取れるように公開
  getCursors(): Phaser.Types.Input.Keyboard.CursorKeys | null {
    return this.cursors ?? null;
  }

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

    // スーツ本体（高精細版）
    const body = this.scene.add.graphics();
    this.add(body);

    // ── 脚部ブースターノズル（足の後ろ）──────────
    body.fillStyle(0x888888);
    body.fillRoundedRect(-13, 22, 10, 12, 3);
    body.fillRoundedRect(3, 22, 10, 12, 3);
    // ノズルリム
    body.lineStyle(1, 0xaaaaaa, 0.6);
    body.strokeRoundedRect(-13, 22, 10, 12, 3);
    body.strokeRoundedRect(3, 22, 10, 12, 3);
    // 排熱フィン
    body.fillStyle(0xdd8844);
    body.fillEllipse(-8, 34, 12, 7);
    body.fillEllipse(8, 34, 12, 7);
    // フィン内輝き
    body.fillStyle(0xff9955, 0.5);
    body.fillEllipse(-8, 34, 7, 4);
    body.fillEllipse(8, 34, 7, 4);

    // ── 肩パッド（アーム接続部）─────────────────
    body.fillStyle(0xbbbbcc);
    body.fillRoundedRect(-24, 0, 12, 16, 4);
    body.fillRoundedRect(12, 0, 12, 16, 4);
    // 肩パッドハイライト
    body.fillStyle(0xddddef, 0.5);
    body.fillRoundedRect(-23, 1, 10, 6, 3);
    body.fillRoundedRect(13, 1, 10, 6, 3);
    // 肘関節（球）
    body.fillStyle(0xdd8844);
    body.fillCircle(-18, 17, 7);
    body.fillCircle(18, 17, 7);
    // 関節ハイライト
    body.fillStyle(0xffbb77, 0.6);
    body.fillCircle(-16, 15, 3.5);
    body.fillCircle(20, 15, 3.5);
    // 関節リベット
    body.fillStyle(0xaa5500, 0.7);
    body.fillCircle(-18, 17, 2);
    body.fillCircle(-14, 14, 1.5);
    body.fillCircle(-22, 14, 1.5);
    body.fillCircle(18, 17, 2);
    body.fillCircle(22, 14, 1.5);
    body.fillCircle(14, 14, 1.5);

    // ── メインスーツボディ（白銀）─────────────────
    // ベース
    body.fillStyle(0xd8d8e8);
    body.fillEllipse(0, 8, 30, 36);
    // 下部シャドウ（服の立体感）
    body.fillStyle(0x8899bb, 0.3);
    body.fillEllipse(0, 16, 28, 22);
    // 上部ハイライト
    body.fillStyle(0xffffff, 0.35);
    body.fillEllipse(-3, -2, 18, 14);
    // アウトライン
    body.lineStyle(1.8, 0x99aacc, 0.7);
    body.strokeEllipse(0, 8, 30, 36);

    // ── 胸コントロールパネル ─────────────────────
    // パネルベース
    body.fillStyle(0x224488);
    body.fillRoundedRect(-9, 1, 18, 14, 4);
    // パネルのガラス面
    body.fillStyle(0x3355aa, 0.6);
    body.fillRoundedRect(-8, 2, 16, 7, 3);
    // インジケーターLED
    body.fillStyle(0x00ff88);
    body.fillCircle(-5, 5, 2.2);
    body.fillStyle(0xff3300);
    body.fillCircle(0, 5, 2.2);
    body.fillStyle(0xffdd00);
    body.fillCircle(5, 5, 2.2);
    // LED グロウ
    body.fillStyle(0x00ff88, 0.25);
    body.fillCircle(-5, 5, 4);
    body.fillStyle(0xff3300, 0.25);
    body.fillCircle(0, 5, 4);
    // 区切り線
    body.lineStyle(1, 0x8899cc, 0.5);
    body.lineBetween(-8, 9, 8, 9);
    // ボタン類（下段）
    body.fillStyle(0x888899);
    body.fillRoundedRect(-7, 11, 14, 3, 1);
    // セントラルバックル
    body.fillStyle(0x8899aa);
    body.fillRoundedRect(-7, 15, 14, 11, 2);
    body.fillStyle(0x556677, 0.6);
    body.fillCircle(-4, 21, 2);
    body.fillCircle(4, 21, 2);
    // バックルのシルバーシャイン
    body.fillStyle(0xaabbcc, 0.4);
    body.fillRoundedRect(-6, 16, 12, 4, 1);

    // ── ネック部（スーツと頭の接続）─────────────
    body.fillStyle(0xccccdd);
    body.fillEllipse(0, -8, 24, 11);
    // ネックリング
    body.lineStyle(2, 0xaabbcc, 0.6);
    body.strokeEllipse(0, -8, 24, 11);

    // 耳（ヘルメット外）
    this.earLeft = this.scene.add.graphics();
    this.earLeft.setPosition(-11, -24);
    this.add(this.earLeft);

    this.earRight = this.scene.add.graphics();
    this.earRight.setPosition(11, -24);
    this.add(this.earRight);

    this.redrawEars();

    // ヘルメット + 顔（高精細版）
    const head = this.scene.add.graphics();
    this.add(head);

    // ヘルメット外縁リム（厚めのリング）
    head.fillStyle(0xddddee);
    head.fillCircle(0, -16, 15);
    head.fillStyle(0xaabbcc, 0.5);
    head.fillCircle(0, -16, 15);
    head.lineStyle(2, 0xbbccdd, 0.8);
    head.strokeCircle(0, -16, 15);

    // 柴犬の顔ベース
    head.fillStyle(0xdd7700);
    head.fillCircle(0, -16, 12);
    // 顔の下半分（マズル領域）を明るめに
    head.fillStyle(0xee8811, 0.4);
    head.fillEllipse(0, -10, 18, 12);

    // マズル（白みがかった楕円）
    head.fillStyle(0xffcc88);
    head.fillEllipse(0, -11, 15, 10);
    // マズルのシャドウ
    head.fillStyle(0xcc8844, 0.25);
    head.fillEllipse(0, -9, 12, 6);

    // 鼻（黒い楕円）
    head.fillStyle(0x221100);
    head.fillEllipse(0, -10, 6, 4);
    // 鼻のハイライト
    head.fillStyle(0x554422, 0.6);
    head.fillCircle(-1, -11, 1.2);

    // 目（黒）
    head.fillStyle(0x000000);
    head.fillCircle(-4.5, -18, 3.8);
    head.fillCircle(4.5, -18, 3.8);
    // 虹彩（濃い茶）
    head.fillStyle(0x441100);
    head.fillCircle(-4.5, -18, 2.5);
    head.fillCircle(4.5, -18, 2.5);
    // ハイライト（大）
    head.fillStyle(0xffffff, 0.9);
    head.fillCircle(-3.2, -19.5, 1.5);
    head.fillCircle(5.8, -19.5, 1.5);
    // ハイライト（小）
    head.fillStyle(0xffffff, 0.5);
    head.fillCircle(-4.8, -17.5, 0.7);

    // 口（弧線）
    head.lineStyle(1.2, 0x553300, 0.8);
    head.beginPath();
    head.arc(0, -10, 3.5, 0.3, Math.PI - 0.3, false);
    head.strokePath();

    // ほほ赤み
    head.fillStyle(0xff9988, 0.28);
    head.fillCircle(-9, -14, 5.5);
    head.fillCircle(9, -14, 5.5);

    // ヘルメットバイザー（ブルー半透明）
    head.fillStyle(0x3399ff, 0.15);
    head.fillCircle(0, -16, 12);
    // バイザーの主反射（左上の大きい白斑）
    head.fillStyle(0xffffff, 0.55);
    head.fillEllipse(-4, -24, 9, 5);
    // バイザーの副反射（右下の小さい点）
    head.fillStyle(0xffffff, 0.3);
    head.fillEllipse(6, -18, 4, 2.5);
    // バイザーの縁取り
    head.lineStyle(2.5, 0xffffff, 0.85);
    head.strokeCircle(0, -16, 12);
    // バイザー下リム
    head.lineStyle(1, 0x88aadd, 0.5);
    head.strokeCircle(0, -16, 11.5);

    // キャノン（高精細版）
    const cannon = this.scene.add.graphics();
    this.add(cannon);

    // キャノンバレル（胴体部）
    cannon.fillStyle(0x006699);
    cannon.fillRoundedRect(-4, -32, 8, 12, 2);
    // バレルのハイライト
    cannon.fillStyle(0x0099cc, 0.6);
    cannon.fillRoundedRect(-3, -32, 5, 6, 2);
    // バレルのリム線
    cannon.lineStyle(1, 0x0055aa, 0.7);
    cannon.strokeRoundedRect(-4, -32, 8, 12, 2);

    // マズル（先端部）
    cannon.fillStyle(0x0077bb);
    cannon.fillRoundedRect(-3, -42, 6, 12, 1);
    // マズルハイライト
    cannon.fillStyle(0x00aaee, 0.7);
    cannon.fillRoundedRect(-2, -42, 3, 8, 1);

    // マズルフラッシュ（グロウチップ）
    cannon.fillStyle(0x0055aa, 0.3);
    cannon.fillCircle(0, -42, 6);
    cannon.fillStyle(0x00ccff, 0.7);
    cannon.fillCircle(0, -42, 4);
    cannon.fillStyle(0x88eeff, 0.9);
    cannon.fillCircle(0, -42, 2.5);
    cannon.fillStyle(0xffffff, 0.7);
    cannon.fillCircle(0, -42, 1.2);

    this.redrawThruster(1.0);
  }

  private drawAura(): void {
    this.auraGfx.clear();
    // 黄金のオーラ — 多重リング＋スパーク（高精細版）
    // 最外ぼかし
    this.auraGfx.fillStyle(0xffdd00, 0.06);
    this.auraGfx.fillCircle(0, 0, 52);
    this.auraGfx.fillStyle(0xffee44, 0.1);
    this.auraGfx.fillCircle(0, 0, 46);

    // リング3重
    this.auraGfx.lineStyle(8, 0xffee44, 0.18);
    this.auraGfx.strokeCircle(0, 0, 46);
    this.auraGfx.lineStyle(4, 0xffd700, 0.7);
    this.auraGfx.strokeCircle(0, 0, 40);
    this.auraGfx.lineStyle(2, 0xffffff, 0.4);
    this.auraGfx.strokeCircle(0, 0, 36);

    // 12方向スパーク（長短交互）
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const isLong = i % 2 === 0;
      const r1 = 40;
      const r2 = isLong ? 56 : 50;
      const x1 = Math.cos(angle) * r1;
      const y1 = Math.sin(angle) * r1;
      const x2 = Math.cos(angle) * r2;
      const y2 = Math.sin(angle) * r2;
      this.auraGfx.lineStyle(isLong ? 2 : 1, 0xffd700, isLong ? 0.7 : 0.4);
      this.auraGfx.lineBetween(x1, y1, x2, y2);
      // スパーク先端ドット
      if (isLong) {
        this.auraGfx.fillStyle(0xffffff, 0.6);
        this.auraGfx.fillCircle(x2, y2, 1.5);
      }
    }

    // 内側コアグロウ
    this.auraGfx.fillStyle(0xffdd88, 0.12);
    this.auraGfx.fillCircle(0, 0, 28);
  }

  private redrawThruster(intensity: number): void {
    this.thrusterGfx.clear();
    const h = 14 + intensity * 12;

    if (this.isSuperMode) {
      // ── スーパーモード：黄金ドラゴン炎 ─────────
      // 外ヘイズ
      this.thrusterGfx.fillStyle(0xffdd00, 0.15);
      this.thrusterGfx.fillTriangle(-12, 28, 12, 28, 0, 28 + h + 14);
      // 外炎
      this.thrusterGfx.fillStyle(0xffaa00, 0.8);
      this.thrusterGfx.fillTriangle(-9, 28, 9, 28, 0, 28 + h + 6);
      // 中炎
      this.thrusterGfx.fillStyle(0xffdd00, 0.9);
      this.thrusterGfx.fillTriangle(-6, 28, 6, 28, 0, 28 + h * 0.75);
      // コア
      this.thrusterGfx.fillStyle(0xffffff, 0.85);
      this.thrusterGfx.fillTriangle(-3, 28, 3, 28, 0, 28 + h * 0.45);
      // プラズマコア
      this.thrusterGfx.fillStyle(0xffffcc, 1.0);
      this.thrusterGfx.fillTriangle(-1.5, 28, 1.5, 28, 0, 28 + h * 0.25);
    } else {
      // ── 通常：青白ジェット炎 ──────────────────
      // 外ヘイズ
      this.thrusterGfx.fillStyle(0xff4400, 0.12);
      this.thrusterGfx.fillTriangle(-11, 28, 11, 28, 0, 28 + h + 10);
      // 外炎
      this.thrusterGfx.fillStyle(0xff6600, 0.85);
      this.thrusterGfx.fillTriangle(-8, 28, 8, 28, 0, 28 + h);
      // 中炎
      this.thrusterGfx.fillStyle(0xffaa00, 0.8);
      this.thrusterGfx.fillTriangle(-5, 28, 5, 28, 0, 28 + h * 0.68);
      // コア白炎
      this.thrusterGfx.fillStyle(0xffffff, 0.7);
      this.thrusterGfx.fillTriangle(-2.5, 28, 2.5, 28, 0, 28 + h * 0.38);
      // ノズルリム
      this.thrusterGfx.lineStyle(1.5, 0x888899, 0.7);
      this.thrusterGfx.lineBetween(-8, 28, 8, 28);
    }
  }

  private redrawTail(angle: number): void {
    this.tail.clear();
    this.tail.setRotation(angle);

    // 尻尾：連続するふわふわ球（シャドウ＋ハイライト付き）
    const segments = [
      { x: 2,  y: 0,   r: 5.5, base: 0xcc6600 },
      { x: 8,  y: -4,  r: 5.5, base: 0xcc6600 },
      { x: 13, y: -8,  r: 5.0, base: 0xbb5500 },
      { x: 16, y: -13, r: 4.0, base: 0xaa4400 },
    ];
    segments.forEach(seg => {
      // ベース色
      this.tail.fillStyle(seg.base);
      this.tail.fillCircle(seg.x, seg.y, seg.r);
      // 上部ハイライト
      this.tail.fillStyle(0xee8833, 0.5);
      this.tail.fillCircle(seg.x - 1, seg.y - 1.5, seg.r * 0.55);
      // 下部シャドウ
      this.tail.fillStyle(0x884400, 0.3);
      this.tail.fillCircle(seg.x + 1, seg.y + 1.5, seg.r * 0.5);
    });
    // 先端白っぽい毛先
    this.tail.fillStyle(0xffddaa, 0.9);
    this.tail.fillCircle(16, -13, 2.5);
    this.tail.fillStyle(0xffffff, 0.4);
    this.tail.fillCircle(15, -14, 1.2);
  }

  private redrawEars(): void {
    // 左耳
    this.earLeft.clear();
    // ベース（濃いオレンジ）
    this.earLeft.fillStyle(0xcc6600);
    this.earLeft.fillTriangle(-6, 2, 7, 2, 0, -15);
    // エッジシャドウ（左辺）
    this.earLeft.fillStyle(0x994400, 0.4);
    this.earLeft.fillTriangle(-6, 2, -1, 2, -4, -11);
    // 内側ピンク
    this.earLeft.fillStyle(0xff9999, 0.8);
    this.earLeft.fillTriangle(-3.5, 1, 4.5, 1, 0, -10);
    // ピンクのハイライト
    this.earLeft.fillStyle(0xffcccc, 0.5);
    this.earLeft.fillTriangle(-1.5, 0, 2.5, 0, 0, -6);

    // 右耳
    this.earRight.clear();
    this.earRight.fillStyle(0xcc6600);
    this.earRight.fillTriangle(-7, 2, 6, 2, 0, -15);
    this.earRight.fillStyle(0x994400, 0.4);
    this.earRight.fillTriangle(1, 2, 6, 2, 4, -11);
    this.earRight.fillStyle(0xff9999, 0.8);
    this.earRight.fillTriangle(-4.5, 1, 3.5, 1, 0, -10);
    this.earRight.fillStyle(0xffcccc, 0.5);
    this.earRight.fillTriangle(-2.5, 0, 1.5, 0, 0, -6);
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

      // ── 外側グロウハロー（ブルーム効果）──────────
      if (isSuper) {
        // スーパーモード：黄金ビッググロウ
        bone.fillStyle(0xffdd00, 0.06);
        bone.fillCircle(0, 0, 22 * s);
        bone.fillStyle(0xffd700, 0.12);
        bone.fillCircle(0, 0, 16 * s);
        bone.fillStyle(0xffee44, 0.2);
        bone.fillCircle(0, 0, 12 * s);
      } else {
        // 通常：シアン/ホワイトグロウ
        bone.fillStyle(0x88ddff, 0.07);
        bone.fillCircle(0, 0, 18);
        bone.fillStyle(0xaaeeff, 0.14);
        bone.fillCircle(0, 0, 12);
        bone.fillStyle(0xccf4ff, 0.2);
        bone.fillCircle(0, 0, 8);
      }

      // ── 骨の形（本体）──────────────────────────
      bone.fillStyle(boneColor);
      bone.fillRect(-2 * s, -8 * s, 4 * s, 16 * s);   // シャフト
      bone.fillCircle(-4 * s, -6 * s, 4.2 * s);         // 上ノブ左
      bone.fillCircle(4 * s, -6 * s, 4.2 * s);          // 上ノブ右
      bone.fillCircle(-4 * s, 6 * s, 4.2 * s);          // 下ノブ左
      bone.fillCircle(4 * s, 6 * s, 4.2 * s);           // 下ノブ右

      // ── 光沢ライン（シャフト中央の白線）─────────
      bone.fillStyle(glowColor, 0.7);
      bone.fillRect(-0.8, -8 * s, 1.8, 16 * s);

      // ノブのハイライト（左上に小白点）
      bone.fillStyle(0xffffff, 0.55);
      bone.fillCircle(-5.5 * s, -7.5 * s, 1.8 * s);
      bone.fillCircle(3 * s, -7.5 * s, 1.8 * s);

      // ── スーパーモード追加エフェクト ─────────────
      if (isSuper) {
        // 2重リング
        bone.lineStyle(2, 0xffd700, 0.55);
        bone.strokeCircle(0, 0, 10.5 * s);
        bone.lineStyle(1, 0xffffff, 0.25);
        bone.strokeCircle(0, 0, 12 * s);
        // コアグロウ
        bone.fillStyle(0xffffff, 0.25);
        bone.fillCircle(0, -6 * s, 3.5 * s);
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

  /** 1UPアイテム取得時にライフを1回復（最大値を超えない） */
  addLife(): void {
    if (this.lives < PLAYER_MAX_LIVES) {
      this.lives++;
    }
    // 上限を超えている場合も上限でクランプ
    this.lives = Math.min(this.lives, PLAYER_MAX_LIVES);
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
