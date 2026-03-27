import Phaser from 'phaser';
import { ENEMY_BULLET_SPEED, GAME_WIDTH, GAME_HEIGHT } from '../config';

// Stage 3 Boss: 超雷神（ラスボス）
// 暗黒の嵐の神。雷を自在に操り、画面全体を覆う電撃で攻撃する
export class BossThunder extends Phaser.GameObjects.Container {
  public hp: number;
  public maxHp: number;
  public bullets: Phaser.GameObjects.Group;
  public isDefeated: boolean = false;
  public playerPowerMult: number = 1.0;

  private phase: number = 1;
  private moveDir: number = 1;
  private moveTimer: number = 0;
  private shootTimer: number = 0;
  private shootPattern: number = 0;
  private entryComplete: boolean = false;

  // 垂直ボブ（フェーズ2）
  private bobTimer: number = 0;
  private baseY: number = 130;

  // 雲本体グラフィクス（フェーズ2で暗くなる）
  private cloudGfx!: Phaser.GameObjects.Graphics;
  // オーラ（脈動アニメーション用）
  private auraGfx!: Phaser.GameObjects.Graphics;
  private auraTimer: number = 0;

  // 嵐の電撃警告マーカー管理
  private activeWarnings: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene, hp: number = 320) {
    super(scene, GAME_WIDTH / 2, -180);
    this.hp = hp;
    this.maxHp = hp;
    scene.add.existing(this);
    this.bullets = scene.add.group();
    this.draw();
    this.startEntry();
  }

  private draw(): void {
    // ── オーラ（最背面、脈動させる）
    this.auraGfx = this.scene.add.graphics();
    this.add(this.auraGfx);
    this.drawAura(0.5);

    // ── 雷翼（左）
    const wingL = this.scene.add.graphics();
    this.add(wingL);
    this.drawLightningWing(wingL, -1);

    // ── 雷翼（右）
    const wingR = this.scene.add.graphics();
    this.add(wingR);
    this.drawLightningWing(wingR, 1);

    // ── 雲本体（多層）
    this.cloudGfx = this.scene.add.graphics();
    this.add(this.cloudGfx);
    this.drawCloud(false);

    // ── 王冠の雷bolt（上部5本）
    const crownG = this.scene.add.graphics();
    this.add(crownG);
    this.drawCrown(crownG);

    // ── 怒り顔（目・眉・口）
    const faceG = this.scene.add.graphics();
    this.add(faceG);
    this.drawFace(faceG);

    // ── 渦巻きエネルギーリング
    const rings = this.scene.add.graphics();
    this.add(rings);
    this.drawEnergyRings(rings);
  }

  private drawAura(intensity: number): void {
    this.auraGfx.clear();
    // 外側の薄い紫オーラ
    this.auraGfx.fillStyle(0x6600aa, 0.08 * intensity);
    this.auraGfx.fillEllipse(0, 0, 260, 160);
    this.auraGfx.fillStyle(0x9933cc, 0.12 * intensity);
    this.auraGfx.fillEllipse(0, 0, 220, 130);
    this.auraGfx.fillStyle(0xcc66ff, 0.1 * intensity);
    this.auraGfx.fillEllipse(0, 0, 180, 100);
    // 輪郭グロー
    this.auraGfx.lineStyle(3, 0xbb44ff, 0.25 * intensity);
    this.auraGfx.strokeEllipse(0, 0, 210, 125);
    this.auraGfx.lineStyle(2, 0xdd88ff, 0.2 * intensity);
    this.auraGfx.strokeEllipse(0, 0, 195, 115);
  }

  private drawLightningWing(g: Phaser.GameObjects.Graphics, dir: number): void {
    // dir: -1=左, 1=右
    const sx = dir * 78;

    // 翼の根元（太い部分）
    g.fillStyle(0xddcc00, 0.9);
    // ジグザグの雷ボルト形状を三角の連鎖で表現
    if (dir < 0) {
      // 左翼
      g.fillTriangle(sx, -20, sx - 20, -8, sx - 10, -8);
      g.fillTriangle(sx - 10, -8, sx - 38, 8, sx - 20, 8);
      g.fillTriangle(sx - 20, 8, sx - 52, 20, sx - 36, 20);
      g.fillTriangle(sx - 36, 20, sx - 68, 32, sx - 52, 32);
      // 翼の縁取り（白）
      g.fillStyle(0xffffff, 0.5);
      g.fillTriangle(sx, -18, sx - 18, -6, sx - 9, -6);
      g.fillTriangle(sx - 11, -6, sx - 36, 10, sx - 20, 6);
      // 翼の輝きライン
      g.lineStyle(1.5, 0xffff88, 0.7);
      g.lineBetween(sx, -20, sx - 68, 32);
    } else {
      // 右翼
      g.fillTriangle(sx, -20, sx + 20, -8, sx + 10, -8);
      g.fillTriangle(sx + 10, -8, sx + 38, 8, sx + 20, 8);
      g.fillTriangle(sx + 20, 8, sx + 52, 20, sx + 36, 20);
      g.fillTriangle(sx + 36, 20, sx + 68, 32, sx + 52, 32);
      g.fillStyle(0xffffff, 0.5);
      g.fillTriangle(sx, -18, sx + 18, -6, sx + 9, -6);
      g.fillTriangle(sx + 11, -6, sx + 36, 10, sx + 20, 6);
      g.lineStyle(1.5, 0xffff88, 0.7);
      g.lineBetween(sx, -20, sx + 68, 32);
    }

    // 翼のセカンダリ雷枝（細め）
    g.fillStyle(0xffee44, 0.7);
    if (dir < 0) {
      g.fillTriangle(sx - 15, -5, sx - 30, 2, sx - 22, 5);
      g.fillTriangle(sx - 30, 12, sx - 46, 18, sx - 38, 22);
    } else {
      g.fillTriangle(sx + 15, -5, sx + 30, 2, sx + 22, 5);
      g.fillTriangle(sx + 30, 12, sx + 46, 18, sx + 38, 22);
    }
  }

  private drawCloud(darkened: boolean): void {
    this.cloudGfx.clear();
    const baseColor = darkened ? 0x220033 : 0x332244;
    const midColor  = darkened ? 0x330044 : 0x443355;
    const topColor  = darkened ? 0x440055 : 0x554466;
    const rimColor  = darkened ? 0x110022 : 0x221133;

    // 最下層の雲（一番暗い）
    this.cloudGfx.fillStyle(rimColor, 0.95);
    this.cloudGfx.fillEllipse(-50, 20, 80, 44);
    this.cloudGfx.fillEllipse(0, 28, 90, 40);
    this.cloudGfx.fillEllipse(50, 20, 80, 44);

    // 中間層の雲
    this.cloudGfx.fillStyle(baseColor, 0.97);
    this.cloudGfx.fillEllipse(-70, 10, 80, 55);
    this.cloudGfx.fillEllipse(-30, 5, 85, 60);
    this.cloudGfx.fillEllipse(20, 0, 90, 65);
    this.cloudGfx.fillEllipse(65, 10, 80, 55);

    // 上層の雲（明るめ）
    this.cloudGfx.fillStyle(midColor, 0.98);
    this.cloudGfx.fillEllipse(-60, -5, 80, 52);
    this.cloudGfx.fillEllipse(-10, -15, 100, 60);
    this.cloudGfx.fillEllipse(50, -5, 80, 52);

    // 最上層（中央が一番明るい）
    this.cloudGfx.fillStyle(topColor, 1.0);
    this.cloudGfx.fillEllipse(-30, -20, 85, 52);
    this.cloudGfx.fillEllipse(20, -22, 90, 55);

    // 雲の内部ハイライト（輝き感）
    this.cloudGfx.fillStyle(0x9977bb, 0.2);
    this.cloudGfx.fillEllipse(-15, -18, 60, 35);
    this.cloudGfx.fillStyle(0xaa88cc, 0.12);
    this.cloudGfx.fillEllipse(10, -15, 50, 28);

    // 雲の輪郭に紫のストローク
    this.cloudGfx.lineStyle(2, darkened ? 0x550077 : 0x7744aa, 0.6);
    this.cloudGfx.strokeEllipse(-10, -10, 160, 85);
  }

  private drawCrown(g: Phaser.GameObjects.Graphics): void {
    // 5本の雷ボルト（王冠）— 上部から突き出る
    const positions = [-64, -32, 0, 32, 64];
    positions.forEach((px, idx) => {
      const h = idx === 2 ? 44 : idx % 2 === 0 ? 36 : 30; // 中央が一番高い
      // 各ボルトをジグザグ三角で表現
      g.fillStyle(0xffee00, 0.95);
      g.fillTriangle(px - 5, -40, px, -40 - h, px + 5, -40);
      g.fillTriangle(px - 4, -40 - h * 0.3, px + 6, -40 - h * 0.6, px - 6, -40 - h * 0.6);
      g.fillTriangle(px - 3, -40 - h * 0.5, px + 5, -40 - h * 0.8, px - 5, -40 - h * 0.8);
      // 白いハイライト
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(px - 2, -40, px + 1, -40 - h * 0.5, px + 2, -40);
      // 後光（底部の光）
      g.fillStyle(0xffcc00, 0.3);
      g.fillTriangle(px - 8, -38, px, -40 - h - 5, px + 8, -38);
    });
  }

  private drawFace(g: Phaser.GameObjects.Graphics): void {
    // ── 怒り眉毛（V字）
    g.lineStyle(5, 0xffffff, 0.95);
    g.lineBetween(-55, -28, -28, -15);   // 左眉外端→内端
    g.lineBetween(-28, -15, -18, -20);   // 左眉内端→鼻側（わずかに持ち上がる）
    g.lineStyle(5, 0xffffff, 0.95);
    g.lineBetween(55, -28, 28, -15);     // 右眉
    g.lineBetween(28, -15, 18, -20);

    // 眉の黒縁取り（くっきり見せる）
    g.lineStyle(2, 0x110022, 0.7);
    g.lineBetween(-56, -29, -27, -14);
    g.lineBetween(56, -29, 27, -14);

    // ── 目（大きな輝く白目）
    // 白目
    g.fillStyle(0xffffff, 0.95);
    g.fillEllipse(-36, -8, 28, 20);
    g.fillEllipse(36, -8, 28, 20);

    // 白目の輪郭（紫）
    g.lineStyle(2, 0x660099, 0.8);
    g.strokeEllipse(-36, -8, 28, 20);
    g.strokeEllipse(36, -8, 28, 20);

    // 瞳（小さい黒）
    g.fillStyle(0x220033);
    g.fillCircle(-36, -8, 6);
    g.fillCircle(36, -8, 6);

    // 目のグロー（怒り）
    g.fillStyle(0xffcc00, 0.7);
    g.fillCircle(-36, -8, 3);
    g.fillCircle(36, -8, 3);
    // 目のハイライト
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-39, -11, 2);
    g.fillCircle(33, -11, 2);

    // 目の下の怒りライン
    g.lineStyle(2, 0xcc00ff, 0.6);
    g.lineBetween(-50, -2, -22, 2);
    g.lineBetween(22, 2, 50, -2);

    // ── 口（ジグザグ雷ボルト形状）
    g.fillStyle(0xffee00, 0.9);
    // 上顎
    g.fillTriangle(-40, 15, -28, 8, -16, 15);
    g.fillTriangle(-16, 15, -4, 8, 8, 15);
    g.fillTriangle(8, 15, 20, 8, 32, 15);
    g.fillTriangle(32, 15, 42, 8, 44, 15);
    // 下顎
    g.fillStyle(0x000011, 0.8);
    g.fillRect(-44, 16, 88, 12);
    // 歯（小さな三角）
    g.fillStyle(0xffffff, 0.9);
    for (let i = -36; i <= 36; i += 12) {
      g.fillTriangle(i, 16, i + 6, 26, i + 12, 16);
    }
    // 口の中の光
    g.fillStyle(0xffaa00, 0.3);
    g.fillRect(-38, 18, 76, 8);

    // ── 頬の電気ライン（チャージ感）
    g.lineStyle(1.5, 0xcc88ff, 0.5);
    g.lineBetween(-70, -2, -50, 6);
    g.lineBetween(-68, 6, -54, 12);
    g.lineStyle(1.5, 0xcc88ff, 0.5);
    g.lineBetween(70, -2, 50, 6);
    g.lineBetween(68, 6, 54, 12);
  }

  private drawEnergyRings(g: Phaser.GameObjects.Graphics): void {
    // 複数の半透明回転リング（静的に描画）
    g.lineStyle(2, 0xaa44ff, 0.35);
    g.strokeEllipse(0, 5, 185, 110);
    g.lineStyle(1.5, 0x8833cc, 0.25);
    g.strokeEllipse(0, 8, 170, 98);
    g.lineStyle(1, 0xcc66ff, 0.2);
    g.strokeEllipse(0, 3, 155, 88);

    // コーナーの小さい電気球
    const sparkPositions = [[-85, 0], [85, 0], [-65, -30], [65, -30], [0, 42]];
    sparkPositions.forEach(([sx, sy]) => {
      g.fillStyle(0xeeee00, 0.7);
      g.fillCircle(sx, sy, 4);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(sx, sy, 2);
      g.lineStyle(1, 0xffff88, 0.4);
      g.strokeCircle(sx, sy, 6);
    });
  }

  private startEntry(): void {
    this.scene.cameras.main.flash(300, 255, 255, 255);
    this.scene.tweens.add({
      targets: this,
      y: this.baseY,
      duration: 2000,
      ease: 'Bounce.Out',
      onComplete: () => { this.entryComplete = true; },
    });
  }

  update(delta: number): void {
    if (!this.entryComplete || this.isDefeated) return;

    // フェーズ移行チェック
    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      this.phase = 2;
      this.onPhase2();
    }

    // オーラ脈動
    this.auraTimer += delta;
    const auraIntensity = 0.5 + 0.5 * Math.sin(this.auraTimer / 600);
    this.drawAura(auraIntensity);

    // 左右移動
    this.moveTimer += delta;
    const period = this.phase === 1 ? 3000 : 1800;
    if (this.moveTimer > period) {
      this.moveDir *= -1;
      this.moveTimer = 0;
    }
    const spd = this.phase === 1 ? 45 : 75;
    this.x += this.moveDir * spd * (delta / 1000);
    this.x = Phaser.Math.Clamp(this.x, 100, GAME_WIDTH - 100);

    // フェーズ2: 上下ボブ
    if (this.phase === 2) {
      this.bobTimer += delta;
      const bob = Math.sin(this.bobTimer / 700) * 20;
      this.y = this.baseY + bob;
    }

    // 射撃タイマー
    this.shootTimer += delta;
    const baseInterval = this.phase === 1 ? 1300 : 900;
    const interval = baseInterval / Math.min(this.playerPowerMult, 1.7);

    if (this.shootTimer >= interval) {
      this.shootTimer = 0;

      if (this.phase === 1) {
        // サイクル: 0→spray, 1→aimed, 2→spray, 3→spray, 4→storm
        const pat = this.shootPattern % 5;
        if (pat === 0 || pat === 2 || pat === 3) {
          this.fireLightningSpray();
        } else if (pat === 1) {
          this.fireAimedLightning();
        } else {
          this.fireLightningStorm();
        }
      } else {
        // フェーズ2: 0→spray, 1→aimed, 2→storm
        const pat = this.shootPattern % 3;
        if (pat === 0) {
          this.fireLightningSpray();
        } else if (pat === 1) {
          this.fireAimedLightning();
        } else {
          this.fireLightningStorm();
        }
      }
      this.shootPattern++;
    }
  }

  // 雷スプレー（広角扇形）
  private fireLightningSpray(): void {
    let count: number;
    if (this.phase === 2 || this.playerPowerMult >= 1.5) {
      count = this.playerPowerMult >= 2.0 ? 11 : 9;
    } else {
      count = 7;
    }

    const spd = ENEMY_BULLET_SPEED * 1.3 * Math.min(this.playerPowerMult, 1.7);
    const totalSpread = 120; // -60 ~ +60 degrees

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const angleDeg = -60 + t * totalSpread + 90; // 90=真下基準
      const rad = Phaser.Math.DegToRad(angleDeg);

      const b = this.scene.add.graphics();
      this.drawLightningBullet(b);

      (b as any).x = this.x + Phaser.Math.Between(-15, 15);
      (b as any).y = this.y + 50;
      (b as any).vx = Math.cos(rad) * spd;
      (b as any).vy = Math.sin(rad) * spd;
      (b as any).active = true;
      this.bullets.add(b as any);
    }
  }

  // 狙い撃ち雷（プレイヤー追跡）
  private fireAimedLightning(): void {
    const player = (this.scene as any).player;
    if (!player) return;

    // カメラフラッシュ（短い）
    this.scene.cameras.main.flash(120, 255, 255, 100);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const baseAngle = Math.atan2(dy, dx);
    const spd = ENEMY_BULLET_SPEED * 1.8 * Math.min(this.playerPowerMult, 1.6);

    const shotCount = this.playerPowerMult >= 1.5 ? 3 : 2;
    const spreads = shotCount === 3 ? [-8, 0, 8] : [-4, 4];

    for (let i = 0; i < shotCount; i++) {
      const spreadRad = Phaser.Math.DegToRad(spreads[i]);
      const angle = baseAngle + spreadRad;

      const b = this.scene.add.graphics();
      // 狙い撃ち弾：より明るい白/黄の雷
      b.fillStyle(0xffffff, 0.95);
      b.fillTriangle(-4, -10, 0, -2, 4, -10);
      b.fillTriangle(-3, -2, 2, 6, 5, -2);
      b.fillTriangle(-2, 6, 2, 14, 6, 6);
      b.fillStyle(0xffee00, 0.8);
      b.fillTriangle(-2, -8, 1, 0, 3, -8);
      b.fillTriangle(-1, 0, 3, 8, 5, 0);

      (b as any).x = this.x;
      (b as any).y = this.y + 40;
      (b as any).vx = Math.cos(angle) * spd;
      (b as any).vy = Math.sin(angle) * spd;
      (b as any).active = true;
      this.bullets.add(b as any);
    }
  }

  // 雷嵐（画面全体への柱攻撃）
  private fireLightningStorm(): void {
    const pillarCount = this.playerPowerMult >= 2.0 ? 7 : Phaser.Math.Between(4, 6);

    // 使用するX座標をランダムに選択（重複を避ける）
    const positions: number[] = [];
    const margin = 30;
    for (let i = 0; i < pillarCount; i++) {
      let px: number;
      let attempts = 0;
      do {
        px = Phaser.Math.Between(margin, GAME_WIDTH - margin);
        attempts++;
      } while (positions.some(p => Math.abs(p - px) < 50) && attempts < 20);
      positions.push(px);
    }

    // 警告マーカーを生成
    const warnings: Phaser.GameObjects.Graphics[] = [];
    positions.forEach((px) => {
      const warn = this.scene.add.graphics();
      warn.fillStyle(0xffee00, 0.25);
      warn.fillRect(-12, 0, 24, GAME_HEIGHT);
      warn.lineStyle(1, 0xffff88, 0.3);
      warn.strokeRect(-12, 0, 24, GAME_HEIGHT);
      warn.setPosition(px, 0);
      warn.setDepth(60);
      warnings.push(warn);
      this.activeWarnings.push(warn);
    });

    // 700ms後に柱を落とす
    this.scene.time.delayedCall(700, () => {
      if (this.isDefeated) {
        warnings.forEach(w => w.destroy());
        return;
      }

      this.scene.cameras.main.flash(150, 255, 255, 200);

      warnings.forEach((warn, idx) => {
        const px = positions[idx];

        // 警告マーカーをフラッシュしてから破棄
        this.scene.tweens.add({
          targets: warn,
          alpha: 0,
          duration: 100,
          onComplete: () => { warn.destroy(); },
        });

        // 柱弾を生成（上から降ってくる）
        const pillar = this.scene.add.graphics();
        // 明るい黄白の雷柱
        pillar.fillStyle(0xffffff, 0.9);
        pillar.fillRect(-10, 0, 20, GAME_HEIGHT);
        pillar.fillStyle(0xffee00, 0.7);
        pillar.fillRect(-6, 0, 12, GAME_HEIGHT);
        pillar.fillStyle(0xffffff, 0.5);
        pillar.fillRect(-2, 0, 4, GAME_HEIGHT);
        // 柱のギザギザエッジ
        pillar.fillStyle(0xffee44, 0.6);
        for (let gy = 0; gy < GAME_HEIGHT; gy += 40) {
          pillar.fillTriangle(-12, gy, -10, gy + 20, -8, gy);
          pillar.fillTriangle(8, gy, 10, gy + 20, 12, gy);
        }

        (pillar as any).x = px;
        (pillar as any).y = -GAME_HEIGHT; // 画面外上から
        (pillar as any).vx = 0;
        (pillar as any).vy = ENEMY_BULLET_SPEED * 2.5;
        (pillar as any).active = true;
        (pillar as any).isPillar = true; // GameSceneの当たり判定で特別扱い
        pillar.setDepth(62);
        this.bullets.add(pillar as any);
      });

      // 警告リストから除去
      this.activeWarnings = this.activeWarnings.filter(w => !warnings.includes(w));
    });
  }

  private drawLightningBullet(g: Phaser.GameObjects.Graphics): void {
    // ジグザグ雷ボルト弾（仕様通り）
    g.fillStyle(0xffee00, 0.95);
    g.fillTriangle(-3, -8, 0, -2, 3, -8);    // top
    g.fillTriangle(-2, -2, 1, 4, 4, -2);     // middle
    g.fillTriangle(-1, 4, 2, 10, 5, 4);      // bottom
    g.fillStyle(0xffffff, 0.7);
    g.fillTriangle(-1, -6, 1, 0, 2, -6);     // inner bright
  }

  private onPhase2(): void {
    // カメラシェイク + フラッシュ
    this.scene.cameras.main.shake(600, 0.02);
    this.scene.cameras.main.flash(200, 100, 0, 200);

    // 雲を暗くする
    this.drawCloud(true);

    // 機体フリッカー（怒り爆発演出）
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.setAlpha(1);
      },
    });

    // フェーズ2: ボブの基準Yを設定
    this.baseY = this.y;
    this.bobTimer = 0;
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
    if (this.hp <= this.maxHp / 2 && this.phase === 1) {
      this.phase = 2;
      this.onPhase2();
    }
  }
}
