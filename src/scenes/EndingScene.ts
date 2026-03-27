import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { getHighScore, saveHighScore } from '../utils/Storage';

// EndingScene: ラスボス撃破 → チワワ姫救出 → CONGRATULATIONS!
export class EndingScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data: { score: number }): void {
    this.finalScore = data.score ?? 0;
    saveHighScore(this.finalScore);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const score = this.finalScore;

    // ── 1. 暗転から始まる ──────────────────────────────
    const blackout = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setDepth(200).setAlpha(1);

    // ── 2. 夕焼け〜夜明け背景 ─────────────────────────
    this.createBackground();

    // ── 3. フェードイン ────────────────────────────────
    this.time.delayedCall(400, () => {
      this.tweens.add({
        targets: blackout,
        alpha: 0,
        duration: 2200,
        ease: 'Quad.InOut',
        onComplete: () => blackout.destroy(),
      });
    });

    // ── 4. キャラクター登場 ───────────────────────────
    // チワワ姫（左から）
    const chihuahua = this.add.container(-90, GAME_HEIGHT - 145).setDepth(10);
    this.drawChihuahuaPrincess(chihuahua);

    // 柴犬ヒーロー（右から）
    const shiba = this.add.container(GAME_WIDTH + 90, GAME_HEIGHT - 145).setDepth(10);
    this.drawShibaHero(shiba);

    // 2秒後にキャラが中央へ
    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: chihuahua,
        x: cx - 80,
        duration: 1400,
        ease: 'Back.Out',
      });
      this.tweens.add({
        targets: shiba,
        x: cx + 80,
        duration: 1400,
        ease: 'Back.Out',
        onComplete: () => {
          // 寄り添ってジャンプ
          this.tweens.add({
            targets: [chihuahua, shiba],
            y: GAME_HEIGHT - 175,
            duration: 350,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.InOut',
            onComplete: () => {
              // キャラの揺れアニメを重ねる
              this.tweens.add({
                targets: chihuahua,
                angle: -6,
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
              });
              this.tweens.add({
                targets: shiba,
                angle: 6,
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
              });
            },
          });
          // ハート噴出
          this.time.delayedCall(200, () => this.startHearts(cx));
          // CONGRATULATIONS! テキスト
          this.time.delayedCall(700, () => this.showCongratulations(cx, score));
        },
      });
    });

    // ── 5. BGM ───────────────────────────────────────
    this.time.delayedCall(800, () => this.playEndingBGM());
  }

  // ── 背景 ──────────────────────────────────────────
  private createBackground(): void {
    const bg = this.add.graphics().setDepth(0);

    // 空（夕焼けグラデーション風）
    bg.fillGradientStyle(0x0a0025, 0x0a0025, 0xff5500, 0xff9900, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 地平線グロウ
    bg.fillStyle(0xff8800, 0.18);
    bg.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT - 70, 560, 220);
    bg.fillStyle(0xffcc66, 0.1);
    bg.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT - 80, 380, 140);

    // 星（上部）
    for (let i = 0; i < 35; i++) {
      const sx = Phaser.Math.Between(0, GAME_WIDTH);
      const sy = Phaser.Math.Between(0, GAME_HEIGHT * 0.42);
      const sr = Phaser.Math.FloatBetween(0.5, 2.0);
      const sa = Phaser.Math.FloatBetween(0.4, 1.0);
      bg.fillStyle(0xffffff, sa);
      bg.fillCircle(sx, sy, sr);
    }

    // 草原
    const ground = this.add.graphics().setDepth(1);
    ground.fillStyle(0x1a5c1a);
    ground.fillRect(0, GAME_HEIGHT - 105, GAME_WIDTH, 105);
    // 草の丘
    ground.fillStyle(0x237a23, 0.7);
    for (let i = 0; i < 18; i++) {
      const gx = Phaser.Math.Between(0, GAME_WIDTH);
      const gy = GAME_HEIGHT - 105 + Phaser.Math.Between(0, 30);
      ground.fillEllipse(gx, gy, Phaser.Math.Between(30, 70), 16);
    }
    // 地平線ライン
    ground.lineStyle(2, 0x44dd44, 0.35);
    ground.lineBetween(0, GAME_HEIGHT - 105, GAME_WIDTH, GAME_HEIGHT - 105);

    // 花畑（小さい点）
    for (let i = 0; i < 25; i++) {
      const fx = Phaser.Math.Between(10, GAME_WIDTH - 10);
      const fy = GAME_HEIGHT - 105 + Phaser.Math.Between(5, 60);
      const fc = [0xff4466, 0xffcc00, 0xff88cc, 0x66ffaa][Phaser.Math.Between(0, 3)];
      ground.fillStyle(fc, 0.8);
      ground.fillCircle(fx, fy, Phaser.Math.Between(2, 5));
    }
  }

  // ── チワワ姫 ──────────────────────────────────────
  private drawChihuahuaPrincess(c: Phaser.GameObjects.Container): void {
    const g = this.add.graphics();
    c.add(g);

    // ── ドレス（ピンクのティアードスカート）──────────
    // スカート最下層
    g.fillStyle(0xff66bb);
    g.fillTriangle(-36, 95, 36, 95, 0, 12);
    g.fillStyle(0xff88cc);
    g.fillEllipse(0, 95, 76, 28);
    // ミドルフリル
    g.fillStyle(0xffaadd, 0.85);
    g.fillEllipse(0, 78, 58, 18);
    g.fillEllipse(-12, 84, 34, 14);
    g.fillEllipse(12, 84, 34, 14);
    // 上フリル
    g.fillStyle(0xffccee, 0.7);
    g.fillEllipse(0, 62, 44, 14);

    // ── 胴体 ──────────────────────────────────────
    g.fillStyle(0xf5c88a);
    g.fillEllipse(0, 18, 34, 38);
    // ドレスのコルセット
    g.fillStyle(0xff66bb, 0.9);
    g.fillRoundedRect(-12, 4, 24, 22, 5);
    // コルセットのリボン
    g.fillStyle(0xff2288);
    g.fillCircle(0, 8, 5);
    g.fillTriangle(-12, 5, -12, 15, -4, 10);
    g.fillTriangle(12, 5, 12, 15, 4, 10);

    // ── 腕 ──────────────────────────────────────
    g.fillStyle(0xf5c88a);
    // 左腕（手を差し出す）
    g.fillRoundedRect(-34, 6, 24, 12, 5);
    g.fillCircle(-38, 12, 8);
    // 右腕
    g.fillRoundedRect(10, 6, 24, 12, 5);
    g.fillCircle(38, 12, 8);

    // ── 足 & シューズ ───────────────────────────
    g.fillStyle(0xf5c88a);
    g.fillRoundedRect(-18, 90, 14, 20, 5);
    g.fillRoundedRect(4, 90, 14, 20, 5);
    g.fillStyle(0xff66bb);
    g.fillEllipse(-11, 108, 18, 10);
    g.fillEllipse(11, 108, 18, 10);
    // ヒール
    g.fillStyle(0xff2288, 0.8);
    g.fillRect(-14, 106, 4, 6);
    g.fillRect(10, 106, 4, 6);

    // ── 頭（チワワ — 大きな頭の特徴）────────────
    // 首
    g.fillStyle(0xf5c88a);
    g.fillEllipse(0, -4, 20, 14);

    // 頭ベース（丸くて大きい）
    g.fillStyle(0xf5c88a);
    g.fillCircle(0, -26, 38);
    // 頭頂部（やや濃い）
    g.fillStyle(0xe8a860);
    g.fillEllipse(0, -50, 52, 34);

    // チワワの特大耳（バット耳）
    g.fillStyle(0xe8a860);
    g.fillTriangle(-32, -24, -62, -72, -8, -55);
    g.fillStyle(0xffccee, 0.85);
    g.fillTriangle(-30, -26, -56, -65, -12, -52);
    g.fillStyle(0xe8a860);
    g.fillTriangle(32, -24, 62, -72, 8, -55);
    g.fillStyle(0xffccee, 0.85);
    g.fillTriangle(30, -26, 56, -65, 12, -52);

    // ── 王冠（黄金）──────────────────────────
    g.fillStyle(0xffd700);
    g.fillRect(-20, -70, 40, 16);
    // 王冠3突起
    g.fillTriangle(-18, -70, -14, -90, -10, -70);
    g.fillTriangle(-2, -70, 2, -90, 6, -70);
    g.fillTriangle(12, -70, 16, -90, 20, -70);
    // 王冠のリム
    g.lineStyle(1.5, 0xffaa00, 0.7);
    g.strokeRect(-20, -70, 40, 16);
    // 宝石（中央ルビー）
    g.fillStyle(0xff0033);
    g.fillCircle(2, -78, 6);
    g.fillStyle(0xff6688, 0.7);
    g.fillCircle(0, -80, 3);
    // サイドジュエル
    g.fillStyle(0x0044ff);
    g.fillCircle(-13, -74, 4);
    g.fillStyle(0x00aaff, 0.6);
    g.fillCircle(-13, -75, 2);
    g.fillStyle(0x44ff00);
    g.fillCircle(15, -74, 4);
    g.fillStyle(0xaaffaa, 0.6);
    g.fillCircle(15, -75, 2);

    // ── 顔 ──────────────────────────────────────
    // マズル
    g.fillStyle(0xffddb0);
    g.fillEllipse(0, -16, 28, 20);
    // 鼻
    g.fillStyle(0xdd7799);
    g.fillEllipse(0, -10, 14, 9);
    g.fillStyle(0xffaacc, 0.6);
    g.fillEllipse(-2, -11, 5, 4);
    // 目（大きくてつぶらな黒目）
    g.fillStyle(0x110800);
    g.fillCircle(-14, -28, 10);
    g.fillCircle(14, -28, 10);
    g.fillStyle(0x331100);
    g.fillCircle(-14, -28, 7);
    g.fillCircle(14, -28, 7);
    // 目のハイライト
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(-11, -31, 3.5);
    g.fillCircle(17, -31, 3.5);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(-15, -27, 1.5);
    // まつ毛
    g.lineStyle(2, 0x441100, 0.85);
    g.lineBetween(-21, -34, -25, -38);
    g.lineBetween(-14, -37, -15, -42);
    g.lineBetween(-7, -35, -8, -39);
    g.lineBetween(7, -35, 8, -39);
    g.lineBetween(14, -37, 15, -42);
    g.lineBetween(21, -34, 25, -38);
    // 口（笑顔）
    g.lineStyle(2.5, 0x441100, 1);
    g.beginPath();
    g.arc(-6, -6, 6, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false);
    g.strokePath();
    g.beginPath();
    g.arc(6, -6, 6, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false);
    g.strokePath();
    // ほっぺ
    g.fillStyle(0xff9988, 0.45);
    g.fillEllipse(-24, -14, 20, 14);
    g.fillEllipse(24, -14, 20, 14);
  }

  // ── 柴犬ヒーロー ──────────────────────────────────
  private drawShibaHero(c: Phaser.GameObjects.Container): void {
    const g = this.add.graphics();
    c.add(g);

    // ── 足・ブーツ ──────────────────────────────────
    g.fillStyle(0x1a3a6a);
    g.fillRoundedRect(-22, 64, 18, 34, 6);
    g.fillRoundedRect(4, 64, 18, 34, 6);
    g.fillStyle(0x2244aa, 0.4);
    g.fillRoundedRect(-21, 64, 10, 16, 4);
    g.fillRoundedRect(5, 64, 10, 16, 4);
    // ブーツ
    g.fillStyle(0x223355);
    g.fillRoundedRect(-24, 90, 20, 16, 5);
    g.fillRoundedRect(4, 90, 20, 16, 5);
    g.fillStyle(0x335588, 0.4);
    g.fillRect(-24, 90, 20, 6);
    g.fillRect(4, 90, 20, 6);

    // ── 尻尾（ふっさり、巻いて嬉しそう）────────────
    g.lineStyle(14, 0xdd8833, 0.95);
    g.beginPath();
    g.arc(-48, 30, 22, Phaser.Math.DegToRad(230), Phaser.Math.DegToRad(30), false);
    g.strokePath();
    // 尻尾先端ふわ
    g.fillStyle(0xffddaa, 0.9);
    g.fillCircle(-42, 14, 8);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(-43, 12, 4);

    // ── 宇宙スーツ本体 ──────────────────────────────
    // メインボディ
    g.fillStyle(0x2255cc);
    g.fillEllipse(0, 32, 54, 72);
    // スーツハイライト
    g.fillStyle(0x4488ff, 0.35);
    g.fillEllipse(-8, 16, 22, 38);
    // スーツ下部シャドウ
    g.fillStyle(0x112266, 0.4);
    g.fillEllipse(2, 48, 46, 36);
    // スーツ外枠
    g.lineStyle(1.5, 0x3366dd, 0.6);
    g.strokeEllipse(0, 32, 54, 72);
    // 胸パネル
    g.fillStyle(0x1144aa);
    g.fillRoundedRect(-10, 2, 20, 14, 4);
    g.fillStyle(0x2266cc, 0.5);
    g.fillRoundedRect(-9, 3, 18, 7, 3);
    // LED 3色
    g.fillStyle(0x00ff88);
    g.fillCircle(-6, 6, 2.5);
    g.fillStyle(0x00ff88, 0.25);
    g.fillCircle(-6, 6, 5);
    g.fillStyle(0xff3300);
    g.fillCircle(0, 6, 2.5);
    g.fillStyle(0xffdd00);
    g.fillCircle(6, 6, 2.5);
    // バックル
    g.fillStyle(0x8899aa);
    g.fillRoundedRect(-7, 17, 14, 10, 2);
    g.fillStyle(0xaabbcc, 0.4);
    g.fillRect(-7, 17, 14, 4);

    // ── 腕 ──────────────────────────────────────
    // 左腕
    g.fillStyle(0x2255cc);
    g.fillRoundedRect(-40, 4, 20, 40, 7);
    g.fillStyle(0x4488ff, 0.3);
    g.fillRoundedRect(-39, 5, 12, 18, 5);
    // 右腕
    g.fillStyle(0x2255cc);
    g.fillRoundedRect(20, 4, 20, 40, 7);
    g.fillStyle(0x4488ff, 0.3);
    g.fillRoundedRect(21, 5, 12, 18, 5);
    // グローブ
    g.fillStyle(0xffeedd);
    g.fillCircle(-30, 46, 10);
    g.fillCircle(30, 46, 10);
    g.lineStyle(1, 0xddccbb, 0.5);
    g.strokeCircle(-30, 46, 10);
    g.strokeCircle(30, 46, 10);

    // ── ヘルメット ──────────────────────────────────
    // リム
    g.fillStyle(0xdde4f0);
    g.fillCircle(0, -26, 34);
    g.lineStyle(2, 0xbbc8e0, 0.7);
    g.strokeCircle(0, -26, 34);

    // 耳（ヘルメット外）
    g.fillStyle(0xcc7722);
    g.fillTriangle(-28, -42, -48, -68, -14, -56);
    g.fillTriangle(28, -42, 48, -68, 14, -56);
    g.fillStyle(0xffbbaa, 0.8);
    g.fillTriangle(-26, -43, -44, -63, -17, -54);
    g.fillTriangle(26, -43, 44, -63, 17, -54);

    // 柴犬の顔
    g.fillStyle(0xdd8833);
    g.fillCircle(0, -26, 28);
    g.fillStyle(0xffcc88);
    g.fillEllipse(0, -18, 24, 18);
    // 鼻
    g.fillStyle(0x221100);
    g.fillEllipse(0, -14, 14, 10);
    g.fillStyle(0x554433, 0.5);
    g.fillEllipse(-1, -15, 5, 4);
    // ドヤ目（細め弧）
    g.lineStyle(4.5, 0x441100, 1.0);
    g.beginPath();
    g.arc(-12, -28, 10, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    g.beginPath();
    g.arc(12, -28, 10, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    g.strokePath();
    // 口（Ω笑顔）
    g.lineStyle(3, 0x441100, 1);
    g.beginPath();
    g.arc(-7, -5, 7, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false);
    g.strokePath();
    g.beginPath();
    g.arc(7, -5, 7, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(180), false);
    g.strokePath();
    // ほっぺ
    g.fillStyle(0xff8877, 0.32);
    g.fillEllipse(-22, -8, 20, 14);
    g.fillEllipse(22, -8, 20, 14);
    // バイザー（ブルー半透明）
    g.fillStyle(0x3388ff, 0.16);
    g.fillCircle(0, -26, 28);
    // バイザー反射
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(-6, -46, 12, 6);
    g.fillStyle(0xffffff, 0.28);
    g.fillEllipse(8, -38, 7, 4);
    // バイザー縁取り
    g.lineStyle(2.5, 0xffffff, 0.8);
    g.strokeCircle(0, -26, 28);
  }

  // ── ハート噴出 ────────────────────────────────────
  private startHearts(cx: number): void {
    this.time.addEvent({
      delay: 110,
      repeat: 70,
      callback: () => {
        const x = cx + Phaser.Math.Between(-180, 180);
        const y = GAME_HEIGHT - Phaser.Math.Between(70, 160);
        this.spawnHeart(x, y);
      },
    });
  }

  private spawnHeart(x: number, y: number): void {
    const g = this.add.graphics().setDepth(15);
    const size = Phaser.Math.Between(7, 20);
    const colors = [0xff1144, 0xff3366, 0xff6688, 0xff88aa, 0xffaabb, 0xffccdd];
    const color  = colors[Phaser.Math.Between(0, colors.length - 1)];

    // ハート形
    g.fillStyle(color, 0.95);
    g.fillCircle(-size * 0.5, 0, size * 0.65);
    g.fillCircle(size * 0.5, 0, size * 0.65);
    g.fillTriangle(-size * 1.1, size * 0.4, size * 1.1, size * 0.4, 0, size * 1.6);
    // ハイライト
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(-size * 0.3, -size * 0.1, size * 0.28);

    g.setPosition(x, y);

    this.tweens.add({
      targets: g,
      y: y - Phaser.Math.Between(170, 320),
      x: x + Phaser.Math.Between(-70, 70),
      alpha: 0,
      scaleX: Phaser.Math.FloatBetween(1.1, 2.2),
      scaleY: Phaser.Math.FloatBetween(1.1, 2.2),
      duration: Phaser.Math.Between(1800, 3400),
      ease: 'Quad.Out',
      onComplete: () => g.destroy(),
    });
  }

  // ── CONGRATULATIONS! & エンディングテキスト ─────────
  private showCongratulations(cx: number, score: number): void {
    // ── "CONGRATULATIONS!" ─────────────────────────
    const congrats = this.add.text(cx, 72, 'CONGRATULATIONS!', {
      fontSize: '40px',
      fontFamily: '"Arial Black", Impact, sans-serif',
      color: '#ffd700',
      stroke: '#884400',
      strokeThickness: 8,
    }).setOrigin(0.5).setScale(0.05).setAlpha(0).setDepth(25);

    this.tweens.add({
      targets: congrats,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 700,
      ease: 'Back.Out',
      onComplete: () => {
        // 虹色サイクル
        const cols = ['#ffd700', '#ff4488', '#00ffcc', '#ff8800', '#88eeff', '#ffccff'];
        let ci = 0;
        this.time.addEvent({
          delay: 140,
          repeat: -1,
          callback: () => { congrats.setStyle({ color: cols[ci++ % cols.length] }); },
        });
      },
    });

    // ── "HAPPY END" ───────────────────────────────
    this.time.delayedCall(550, () => {
      const happyEnd = this.add.text(cx, 122, '~ HAPPY END ~', {
        fontSize: '28px',
        fontFamily: '"Arial Black", Impact, sans-serif',
        color: '#ffeecc',
        stroke: '#664400',
        strokeThickness: 5,
      }).setOrigin(0.5).setAlpha(0).setDepth(25);
      this.tweens.add({
        targets: happyEnd,
        alpha: 1,
        duration: 600,
        ease: 'Quad.Out',
      });
    });

    // ── ストーリーコピー ──────────────────────────
    this.time.delayedCall(900, () => {
      const story = this.add.text(cx, 180,
        '柴犬は超雷神を打ち倒し、\nチワワ姫を救い出した。\n宇宙の平和が戻ってきた。', {
          fontSize: '17px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffeecc',
          stroke: '#000000',
          strokeThickness: 3,
          align: 'center',
          lineSpacing: 9,
        }).setOrigin(0.5).setAlpha(0).setDepth(25);
      this.tweens.add({ targets: story, alpha: 1, y: 186, duration: 700, ease: 'Quad.Out' });
    });

    // ── FINAL SCORE ──────────────────────────────
    this.time.delayedCall(1600, () => {
      // スコアパネル
      const panel = this.add.graphics().setDepth(24);
      panel.fillStyle(0x000000, 0.55);
      panel.fillRoundedRect(cx - 140, 250, 280, 90, 8);
      panel.lineStyle(1.5, 0xffd700, 0.5);
      panel.strokeRoundedRect(cx - 140, 250, 280, 90, 8);

      this.add.text(cx, 268, 'FINAL SCORE', {
        fontSize: '15px',
        fontFamily: '"Arial Black", sans-serif',
        color: '#ffddaa',
        stroke: '#440000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(25);

      this.add.text(cx, 302, score.toLocaleString(), {
        fontSize: '36px',
        fontFamily: '"Courier New", Courier, monospace',
        color: '#00eeff',
        stroke: '#002244',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(25);

      // ハイスコア
      const hs = getHighScore();
      const isNew = score >= hs;
      const hsY = 356;
      if (isNew) {
        const nr = this.add.text(cx, hsY, '★  NEW RECORD!  ★', {
          fontSize: '22px',
          fontFamily: '"Arial Black", sans-serif',
          color: '#ffd700',
          stroke: '#884400',
          strokeThickness: 4,
        }).setOrigin(0.5).setDepth(25);
        this.tweens.add({ targets: nr, alpha: 0, duration: 500, yoyo: true, repeat: -1 });
      } else {
        this.add.text(cx, hsY, `BEST: ${hs.toLocaleString()}`, {
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffdd88',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5).setDepth(25);
      }

      // ── 操作案内 ──────────────────────────────
      this.time.delayedCall(900, () => {
        const hint = this.add.text(cx, 408, 'SPACE でもう一度 ／ T でタイトルへ', {
          fontSize: '17px',
          fontFamily: 'Arial, sans-serif',
          color: '#aaaacc',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(25);
        this.tweens.add({ targets: hint, alpha: 0, duration: 700, yoyo: true, repeat: -1 });

        this.input.keyboard!.once('keydown-SPACE', () => {
          this.cameras.main.fade(700, 0, 0, 0, false, (_: unknown, p: number) => {
            if (p === 1) this.scene.start('GameScene', { stageNumber: 1, score: 0, lives: 3, bombs: 3 });
          });
        });
        this.input.keyboard!.once('keydown-T', () => {
          this.cameras.main.fade(700, 0, 0, 0, false, (_: unknown, p: number) => {
            if (p === 1) this.scene.start('TitleScene');
          });
        });
      });
    });
  }

  // ── エンディングBGM（壮大なアルペジオ）──────────────
  private playEndingBGM(): void {
    try {
      const ctx = new AudioContext();

      // メインメロディ（ファンファーレ→叙情的に）
      const melody = [
        784, 784, 880, 1047, 880, 784,
        659, 659, 784, 880, 784, 659,
        523, 659, 784, 1047, 784, 659, 523,
      ];
      const baseGain = 0.09;

      let idx = 0;
      const interval = setInterval(() => {
        if (idx >= melody.length) { clearInterval(interval); return; }
        const freq = melody[idx];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(baseGain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
        idx++;
      }, 300);

      // ベース（低音ドローン）
      this.time.delayedCall(200, () => {
        const bassMelody = [131, 131, 165, 196, 165, 131, 110, 131];
        let bi = 0;
        const bassInterval = setInterval(() => {
          if (bi >= bassMelody.length) { clearInterval(bassInterval); return; }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(bassMelody[bi], ctx.currentTime);
          gain.gain.setValueAtTime(0.07, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.6);
          bi++;
        }, 600);
      });

    } catch { /* ignore */ }
  }
}
