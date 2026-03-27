import Phaser from 'phaser';
import { ENEMY_BULLET_SPEED, GAME_WIDTH } from '../config';

export type EnemyType = 'straight' | 'zigzag' | 'formation';

// Enemy: 犬の天敵たち
// straight  → 意地悪な黒猫
// zigzag    → ロボット掃除機（ルンバ型）
// formation → かみなり雲
export class Enemy extends Phaser.GameObjects.Container {
  public hp: number;
  public score: number;
  public enemyType: EnemyType;
  public bullets: Phaser.GameObjects.Group;

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
      case 'straight':   // 黒猫
        this.hp = 1; this.score = 100; this.speed = 130; this.shootInterval = 2800;
        this.drawCat();
        break;
      case 'zigzag':     // ロボット掃除機
        this.hp = 2; this.score = 250; this.speed = 100; this.shootInterval = 2200;
        this.drawVacuum();
        break;
      case 'formation':  // かみなり雲
        this.hp = 1; this.score = 150; this.speed = 150; this.shootInterval = 3200;
        this.drawThunderCloud();
        break;
    }
  }

  // ── 意地悪な黒猫
  private drawCat(): void {
    const g = this.scene.add.graphics();
    this.add(g);

    // 胴体（アーチ状に背を丸めている）
    g.fillStyle(0x111111);
    g.fillEllipse(0, 6, 26, 18);

    // 尻尾（くるん）
    g.fillStyle(0x111111);
    g.fillEllipse(16, 2, 10, 7);
    g.fillEllipse(20, -3, 8, 7);
    g.fillEllipse(19, -8, 5, 6);
    g.fillStyle(0x444444); // 尾先
    g.fillCircle(19, -10, 3);

    // 頭
    g.fillStyle(0x111111);
    g.fillCircle(0, -8, 13);

    // とがった耳（意地悪そう）
    g.fillStyle(0x111111);
    g.fillTriangle(-13, -13, -6, -12, -11, -26); // 左耳
    g.fillTriangle(13, -13, 6, -12, 11, -26);    // 右耳
    // 耳の内側（ピンク）
    g.fillStyle(0xff5588, 0.8);
    g.fillTriangle(-11, -14, -8, -13, -10, -22);
    g.fillTriangle(11, -14, 8, -13, 10, -22);

    // 邪悪な黄色い目
    g.fillStyle(0xffee00);
    g.fillEllipse(-5, -9, 8, 6);
    g.fillEllipse(5, -9, 8, 6);
    // 縦に細い瞳孔（猫らしく）
    g.fillStyle(0x000000);
    g.fillRect(-5, -12, 2, 7);
    g.fillRect(5, -12, 2, 7);
    // 目のきらり
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(-4, -10, 1);
    g.fillCircle(6, -10, 1);

    // 不敵な笑み（の字口）
    g.lineStyle(1.5, 0xdd4444, 0.9);
    g.beginPath();
    g.moveTo(-5, -2);
    g.lineTo(-2, 0);
    g.lineTo(2, 0);
    g.lineTo(5, -2);
    g.strokePath();

    // ヒゲ（whiskers）
    g.lineStyle(1, 0xaaaaaa, 0.8);
    g.lineBetween(-13, -5, -22, -3);
    g.lineBetween(-13, -4, -22, -7);
    g.lineBetween(13, -5, 22, -3);
    g.lineBetween(13, -4, 22, -7);
  }

  // ── ロボット掃除機（ルンバ型）
  private drawVacuum(): void {
    const g = this.scene.add.graphics();
    this.add(g);

    // ホイール
    g.fillStyle(0x333333);
    g.fillCircle(-16, 8, 6);
    g.fillCircle(16, 8, 6);
    g.fillStyle(0x555555);
    g.fillCircle(-16, 8, 3);
    g.fillCircle(16, 8, 3);

    // 本体（円形・ルンバっぽい）
    g.fillStyle(0x888888);
    g.fillCircle(0, 0, 20);
    // 本体の金属光沢
    g.fillStyle(0xaaaaaa);
    g.fillEllipse(-6, -8, 14, 8);
    // ボディライン
    g.lineStyle(1.5, 0x666666, 0.9);
    g.strokeCircle(0, 0, 20);

    // 吸引口（下部）
    g.fillStyle(0x111111);
    g.fillEllipse(0, 18, 18, 8);
    // 吸引のブラシ（オレンジ）
    g.fillStyle(0xff6600, 0.9);
    g.fillRect(-8, 16, 16, 3);

    // 怒ったセンサー目（赤いLED）
    g.fillStyle(0xff0000);
    g.fillEllipse(-6, -2, 10, 6);
    g.fillEllipse(6, -2, 10, 6);
    // 怒り眉（V字）
    g.lineStyle(2, 0xff4400, 1);
    g.lineBetween(-11, -7, -3, -5);
    g.lineBetween(11, -7, 3, -5);
    // 瞳（暗）
    g.fillStyle(0x660000);
    g.fillEllipse(-6, -2, 5, 4);
    g.fillEllipse(6, -2, 5, 4);

    // メーカーロゴっぽいマーク（"WOOF BUSTER"）
    g.fillStyle(0xff4400, 0.8);
    g.fillRect(-10, 6, 20, 5);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(-9, 7, 18, 3);
    // 吸入警告灯
    g.fillStyle(0xffcc00);
    g.fillCircle(-18, -5, 3);
    g.fillCircle(18, -5, 3);
  }

  // ── かみなり雲
  private drawThunderCloud(): void {
    const g = this.scene.add.graphics();
    this.add(g);

    // 雲の影
    g.fillStyle(0x334455, 0.5);
    g.fillEllipse(3, 4, 44, 26);

    // 雲の本体（複数の円を重ねた雲形）
    g.fillStyle(0x5566aa);
    g.fillCircle(-14, 2, 13);
    g.fillCircle(0, -4, 16);
    g.fillCircle(14, 2, 13);
    g.fillRect(-24, 2, 48, 14);

    // 雲の明るい部分（上面ハイライト）
    g.fillStyle(0x7788cc);
    g.fillCircle(-12, -1, 11);
    g.fillCircle(0, -6, 13);
    g.fillCircle(12, -1, 11);

    // 怒った眉毛
    g.fillStyle(0x000022);
    g.fillTriangle(-14, -2, -5, -4, -10, 3);    // 左眉（傾き）
    g.fillTriangle(14, -2, 5, -4, 10, 3);        // 右眉

    // 目（雷のように鋭い）
    g.fillStyle(0xffee00);
    g.fillEllipse(-9, 4, 9, 6);
    g.fillEllipse(9, 4, 9, 6);
    g.fillStyle(0x000000);
    g.fillEllipse(-9, 4, 5, 5);
    g.fillEllipse(9, 4, 5, 5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(-7, 3, 1.5);
    g.fillCircle(11, 3, 1.5);

    // 雷マーク（メイン）
    g.fillStyle(0xffee00);
    g.fillTriangle(3, 14, -4, 24, 1, 24);
    g.fillTriangle(1, 24, -6, 34, 4, 28);
    g.fillTriangle(4, 28, -2, 34, 2, 34);
    // 雷の光
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(2, 15, -2, 23, 0, 23);
  }

  update(delta: number): void {
    switch (this.enemyType) {
      case 'straight':
        this.y += this.speed * (delta / 1000);
        // 猫は少し左右に揺れながら降りてくる
        this.x += Math.sin(this.y * 0.03) * 0.5;
        break;

      case 'zigzag':
        this.moveTimer += delta;
        if (this.moveTimer > 1000) { this.zigzagDir *= -1; this.moveTimer = 0; }
        this.y += this.speed * (delta / 1000);
        this.x += this.zigzagDir * 100 * (delta / 1000);
        this.x = Phaser.Math.Clamp(this.x, 22, GAME_WIDTH - 22);
        break;

      case 'formation':
        this.y += this.speed * (delta / 1000);
        break;
    }

    // 射撃タイマー
    this.shootTimer += delta;
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      this.fireBullet();
    }
  }

  private fireBullet(): void {
    if (this.y < -10 || this.y > 800) return;

    const b = this.scene.add.graphics();

    switch (this.enemyType) {
      case 'straight': // 猫→毛玉
        b.fillStyle(0x335522);
        b.fillCircle(0, 0, 5);
        b.fillStyle(0x448833, 0.6);
        b.fillCircle(-2, -2, 2);
        b.fillCircle(2, 1, 2);
        b.lineStyle(1, 0x77aa44, 0.5);
        b.strokeCircle(0, 0, 6);
        break;

      case 'zigzag': // 掃除機→ゴミ粒子
        b.fillStyle(0x8B4513);
        b.fillCircle(0, 0, 4);
        b.fillStyle(0xaa6622, 0.4);
        b.fillCircle(-2, -1, 2);
        b.fillCircle(2, 2, 2);
        break;

      case 'formation': // 雷雲→ミニ稲妻
        b.fillStyle(0xffee00);
        b.fillTriangle(2, -6, -2, 0, 1, 0);
        b.fillTriangle(1, 0, -2, 6, 2, 2);
        b.fillStyle(0xffffff, 0.5);
        b.fillTriangle(1, -5, -1, 0, 0.5, 0);
        break;
    }

    (b as any).x = this.x;
    (b as any).y = this.y + 20;
    (b as any).vy = ENEMY_BULLET_SPEED;
    (b as any).active = true;
    this.bullets.add(b as any);
  }

  takeDamage(dmg: number = 1): boolean {
    this.hp -= dmg;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
    });
    return this.hp <= 0;
  }
}
