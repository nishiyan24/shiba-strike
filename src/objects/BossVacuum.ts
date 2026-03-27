import Phaser from 'phaser';
import { ENEMY_BULLET_SPEED, GAME_WIDTH, GAME_HEIGHT } from '../config';

// Stage 2 Boss: 高性能掃除機マシーン
// 強力な吸引力と破片散弾で犬を追い詰める工業用掃除機
export class BossVacuum extends Phaser.GameObjects.Container {
  public hp: number;
  public maxHp: number;
  public bullets: Phaser.GameObjects.Group;
  public isDefeated: boolean = false;
  public playerPowerMult: number = 1.0;

  // 吸引状態 — GameScene からフレームごとにプレイヤーへ力を加えるために参照
  public isSucking: boolean = false;
  public suctionStrength: number = 180; // pixels/sec pull force when active

  private phase: number = 1;
  private moveDir: number = 1;
  private moveTimer: number = 0;
  private shootTimer: number = 0;
  private shootPattern: number = 0;
  private entryComplete: boolean = false;

  // 口パーツ（吸引時にアニメーションする）
  private mouthGfx!: Phaser.GameObjects.Graphics;
  private mouthOpen: boolean = false;

  // 警告LED（点滅用）
  private ledGfx!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, hp: number = 240) {
    super(scene, GAME_WIDTH / 2, -160);
    this.hp = hp;
    this.maxHp = hp;
    scene.add.existing(this);
    this.bullets = scene.add.group();
    this.draw();
    this.startEntry();
    this.startLedBlink();
  }

  private draw(): void {
    const g = this.scene.add.graphics();
    this.add(g);

    // ── 車輪・トラック（底面）
    g.fillStyle(0x222222);
    g.fillRoundedRect(-60, 56, 120, 18, 4);
    // トラックの溝
    g.lineStyle(1, 0x444444, 0.8);
    for (let i = -50; i <= 50; i += 12) {
      g.lineBetween(i, 56, i + 6, 74);
    }
    // 左右ホイール
    g.fillStyle(0x333333);
    g.fillCircle(-48, 68, 12);
    g.fillCircle(48, 68, 12);
    g.fillStyle(0x555555);
    g.fillCircle(-48, 68, 6);
    g.fillCircle(48, 68, 6);
    g.fillStyle(0x888888);
    g.fillCircle(-48, 68, 2);
    g.fillCircle(48, 68, 2);

    // ── メインボディ（業務用掃除機・シルバーグレー箱型）
    g.fillStyle(0x8899aa);
    g.fillRoundedRect(-58, -60, 116, 120, 10);

    // ボディ右側の濃いパネル区切り
    g.fillStyle(0x6677888, 0.6);
    g.fillRoundedRect(-58, -60, 116, 120, 10);

    // ボディ外枠（金属感）
    g.lineStyle(2.5, 0xaabbcc, 0.9);
    g.strokeRoundedRect(-58, -60, 116, 120, 10);

    // ボディ中央の縦リブ（金属板の溶接線）
    g.lineStyle(1.5, 0x99aabb, 0.5);
    g.lineBetween(0, -58, 0, 58);
    g.lineStyle(1, 0x99aabb, 0.3);
    g.lineBetween(-28, -55, -28, 55);
    g.lineBetween(28, -55, 28, 55);

    // ハイライト（左上の光沢）
    g.fillStyle(0xccddee, 0.35);
    g.fillRoundedRect(-50, -52, 36, 24, 5);

    // ── ダストバッグ（背面・右側に膨らみ）
    g.fillStyle(0xcc9966);
    g.fillEllipse(45, 0, 32, 56);
    g.fillStyle(0xbb8855, 0.6);
    g.fillEllipse(45, 0, 24, 44);
    // バッグのバインド部
    g.lineStyle(1.5, 0x996644, 0.8);
    g.strokeEllipse(45, 0, 32, 56);
    g.fillStyle(0xddaa88, 0.4);
    g.fillEllipse(41, -8, 10, 16);
    // バッグの膨らみシワ
    g.lineStyle(1, 0x997755, 0.5);
    g.lineBetween(33, -12, 31, 12);
    g.lineBetween(38, -18, 36, 18);

    // ── 怒り顔のデジタルディスプレイ（正面中央）
    g.fillStyle(0x111122);
    g.fillRoundedRect(-36, -42, 60, 50, 6);
    g.lineStyle(1.5, 0x3344556, 0.7);
    g.strokeRoundedRect(-36, -42, 60, 50, 6);

    // ディスプレイ背景（暗い緑）
    g.fillStyle(0x003322);
    g.fillRoundedRect(-32, -38, 52, 42, 4);

    // 怒り顔：眉毛（ハの字）
    g.lineStyle(3, 0x00ff44, 0.9);
    g.lineBetween(-28, -28, -14, -22);  // 左眉
    g.lineBetween(6, -22, 20, -28);     // 右眉

    // 怒り目（矩形）
    g.fillStyle(0x00ff44, 0.9);
    g.fillRect(-28, -20, 14, 8);
    g.fillRect(6, -20, 14, 8);
    // 目の中心（暗く）
    g.fillStyle(0x003322);
    g.fillRect(-25, -18, 8, 4);
    g.fillRect(9, -18, 8, 4);

    // 怒り口（ギザギザ）
    g.fillStyle(0x00ff44, 0.85);
    // 口：ジグザグを三角で表現
    g.fillTriangle(-24, -10, -18, -4, -12, -10);
    g.fillTriangle(-12, -10, -6, -4, 0, -10);
    g.fillTriangle(0, -10, 6, -4, 12, -10);
    g.fillTriangle(12, -10, 18, -4, 24, -10);

    // "SUCK MODE" テキスト風ドット
    g.fillStyle(0x00ee33, 0.7);
    g.fillRect(-28, 4, 4, 4);
    g.fillRect(-22, 4, 4, 4);
    g.fillRect(-16, 4, 4, 4);
    g.fillRect(-10, 4, 4, 4);
    g.fillRect(-4, 4, 4, 4);
    g.fillRect(2, 4, 4, 4);
    g.fillRect(8, 4, 4, 4);

    // ── ホースアーム（両サイド）
    // 左アーム
    g.fillStyle(0x445566);
    g.fillRoundedRect(-88, -28, 34, 12, 5);
    g.fillStyle(0x3a4a5a);
    g.fillRoundedRect(-100, -24, 18, 36, 5);
    // ホースのリング
    g.lineStyle(2, 0x556677, 0.8);
    for (let i = 0; i < 4; i++) {
      g.strokeRoundedRect(-99, -22 + i * 8, 16, 6, 2);
    }

    // 右アーム
    g.fillStyle(0x445566);
    g.fillRoundedRect(54, -28, 34, 12, 5);
    g.fillStyle(0x3a4a5a);
    g.fillRoundedRect(82, -24, 18, 36, 5);
    g.lineStyle(2, 0x556677, 0.8);
    for (let i = 0; i < 4; i++) {
      g.strokeRoundedRect(83, -22 + i * 8, 16, 6, 2);
    }

    // ホース先端ノズル
    g.fillStyle(0x222233);
    g.fillEllipse(-91, 14, 20, 14);
    g.fillStyle(0x334455);
    g.fillEllipse(-91, 14, 12, 8);
    g.fillStyle(0x667788);
    g.fillCircle(-91, 14, 3);

    g.fillStyle(0x222233);
    g.fillEllipse(91, 14, 20, 14);
    g.fillStyle(0x334455);
    g.fillEllipse(91, 14, 12, 8);
    g.fillStyle(0x667788);
    g.fillCircle(91, 14, 3);

    // ── 下部吸引口（中央底部）大きな円形開口部
    // 外枠リング
    g.fillStyle(0x334455);
    g.fillCircle(0, 70, 32);
    g.lineStyle(3, 0x5566778, 0.9);
    g.strokeCircle(0, 70, 32);
    // 内部リング（濃い）
    g.fillStyle(0x112233);
    g.fillCircle(0, 70, 26);
    // 口の内部（吸引口）- 静的部分
    g.fillStyle(0x050f1a);
    g.fillCircle(0, 70, 20);
    // 吸引口の渦巻き模様
    g.lineStyle(1.5, 0x2244668, 0.5);
    g.strokeCircle(0, 70, 14);
    g.strokeCircle(0, 70, 8);

    // ── 可動式口グラフィクス（吸引アニメーション用）
    this.mouthGfx = this.scene.add.graphics();
    this.add(this.mouthGfx);
    this.drawMouth(false);

    // ── 警告LEDライト（角に配置）
    this.ledGfx = this.scene.add.graphics();
    this.add(this.ledGfx);
    this.drawLeds(true);

    // ── 機体上部の排気口グリル
    const grillG = this.scene.add.graphics();
    this.add(grillG);
    grillG.fillStyle(0x333344);
    grillG.fillRoundedRect(-40, -60, 80, 10, 3);
    grillG.lineStyle(1, 0x556677, 0.6);
    for (let i = -35; i <= 35; i += 8) {
      grillG.lineBetween(i, -60, i, -50);
    }

    // 上部吸気ファン（円形グリル）
    grillG.fillStyle(0x222233);
    grillG.fillCircle(-38, -52, 10);
    grillG.lineStyle(1, 0x445566, 0.7);
    grillG.strokeCircle(-38, -52, 10);
    grillG.lineStyle(1, 0x445566, 0.5);
    grillG.lineBetween(-38, -62, -38, -42);
    grillG.lineBetween(-48, -52, -28, -52);
    grillG.lineBetween(-45, -59, -31, -45);
    grillG.lineBetween(-31, -59, -45, -45);

    // DANGER ステッカー
    grillG.fillStyle(0xffcc00);
    grillG.fillRoundedRect(-58, 20, 22, 14, 2);
    grillG.fillStyle(0x000000);
    grillG.fillTriangle(-54, 34, -50, 20, -46, 34);
    grillG.fillRect(-51, 26, 2, 4);
    grillG.fillCircle(-50, 32, 1);
  }

  private drawMouth(open: boolean): void {
    this.mouthGfx.clear();
    if (open) {
      // 開口時：明るい渦と光るリング
      this.mouthGfx.fillStyle(0x0000ff, 0.15);
      this.mouthGfx.fillCircle(0, 70, 22);
      this.mouthGfx.lineStyle(2, 0x4488ff, 0.7);
      this.mouthGfx.strokeCircle(0, 70, 18);
      this.mouthGfx.lineStyle(1.5, 0x66aaff, 0.5);
      this.mouthGfx.strokeCircle(0, 70, 12);
      // 中心の吸い込み渦
      this.mouthGfx.fillStyle(0x001133, 0.9);
      this.mouthGfx.fillCircle(0, 70, 10);
      this.mouthGfx.fillStyle(0x0033888, 0.5);
      this.mouthGfx.fillCircle(0, 70, 5);
    } else {
      // 閉口時：暗い穴
      this.mouthGfx.fillStyle(0x050f1a, 0.8);
      this.mouthGfx.fillCircle(0, 70, 18);
    }
  }

  private drawLeds(on: boolean): void {
    this.ledGfx.clear();
    const color = on ? 0xff3300 : 0x771100;
    const alpha = on ? 1.0 : 0.4;
    this.ledGfx.fillStyle(color, alpha);
    this.ledGfx.fillCircle(-52, -54, 7);
    this.ledGfx.fillCircle(52, -54, 7);
    if (on) {
      this.ledGfx.lineStyle(2, 0xff6600, 0.6);
      this.ledGfx.strokeCircle(-52, -54, 10);
      this.ledGfx.strokeCircle(52, -54, 10);
    }
    // 橙色の補助LED
    this.ledGfx.fillStyle(on ? 0xff8800 : 0x553300, alpha);
    this.ledGfx.fillCircle(-52, -40, 4);
    this.ledGfx.fillCircle(52, -40, 4);
  }

  private startLedBlink(): void {
    let ledOn = true;
    this.scene.time.addEvent({
      delay: 600,
      callback: () => {
        if (this.isDefeated || !this.scene) return;
        ledOn = !ledOn;
        this.drawLeds(ledOn);
      },
      loop: true,
    });
  }

  private startEntry(): void {
    this.scene.tweens.add({
      targets: this,
      y: 150,
      duration: 2200,
      ease: 'Back.Out',
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

    // 左右移動
    this.moveTimer += delta;
    const period = this.phase === 1 ? 2400 : 1600;
    if (this.moveTimer > period) {
      this.moveDir *= -1;
      this.moveTimer = 0;
    }
    const spd = this.phase === 1 ? 55 : 85;
    this.x += this.moveDir * spd * (delta / 1000);
    this.x = Phaser.Math.Clamp(this.x, 90, GAME_WIDTH - 90);

    // 射撃タイマー
    this.shootTimer += delta;
    const baseInterval = this.phase === 1 ? 1600 : 1100;
    const interval = baseInterval / Math.min(this.playerPowerMult, 1.6);

    if (this.shootTimer >= interval) {
      this.shootTimer = 0;
      if (this.phase === 1) {
        // サイクル: 0→debris, 1→debris, 2→suctionPulse+suction
        const pat = this.shootPattern % 3;
        if (pat === 0 || pat === 1) {
          this.fireDebris();
        } else {
          this.fireSuctionPulse();
          this.activateSuction();
        }
      } else {
        // フェーズ2: 0→debris, 1→suctionPulse+suction
        const pat = this.shootPattern % 2;
        if (pat === 0) {
          this.fireDebris();
        } else {
          this.fireSuctionPulse();
          this.activateSuction();
        }
      }
      this.shootPattern++;
    }
  }

  // 破片散弾（ゴミ・ほこり）
  private fireDebris(): void {
    const baseCount = this.phase === 1
      ? (this.playerPowerMult >= 1.5 ? 7 : 5)
      : (this.playerPowerMult >= 1.5 ? 9 : 7);

    const spd = ENEMY_BULLET_SPEED * 1.2 * this.playerPowerMult;

    for (let i = 0; i < baseCount; i++) {
      // 各弾の角度: 90度（真下）を中心にランダムスプレッド
      const spreadRange = this.phase === 1 ? 50 : 65;
      const angleOffset = Phaser.Math.Between(-spreadRange, spreadRange);
      const rad = Phaser.Math.DegToRad(90 + angleOffset);

      const b = this.scene.add.graphics();

      // 小さいグレーの矩形（ゴミ・破片）
      const variant = i % 4;
      if (variant === 0) {
        // ほこりの塊
        b.fillStyle(0x776655, 0.9);
        b.fillRect(-2, -4, 4, 8);
        b.fillStyle(0x998877, 0.5);
        b.fillRect(-3, -3, 2, 5);
      } else if (variant === 1) {
        // 小石
        b.fillStyle(0x888899, 0.9);
        b.fillCircle(0, 0, 4);
        b.fillStyle(0xaabbcc, 0.4);
        b.fillCircle(-1, -1, 2);
      } else if (variant === 2) {
        // 紙くず
        b.fillStyle(0xddddcc, 0.85);
        b.fillRect(-3, -5, 6, 10);
        b.lineStyle(0.5, 0xaaaaaa, 0.5);
        b.lineBetween(-2, -3, 2, -3);
        b.lineBetween(-2, 0, 2, 0);
        b.lineBetween(-2, 3, 2, 3);
      } else {
        // 細かい砂
        b.fillStyle(0xaa9966, 0.9);
        b.fillRect(-2, -3, 4, 6);
        b.fillStyle(0xccbb88, 0.5);
        b.fillCircle(0, 0, 2);
      }

      (b as any).x = this.x + Phaser.Math.Between(-20, 20);
      (b as any).y = this.y + 70;
      (b as any).vx = Math.cos(rad) * spd;
      (b as any).vy = Math.sin(rad) * spd;
      (b as any).active = true;
      this.bullets.add(b as any);
    }
  }

  // 吸引パルス弾（青シアン球）— 吸引中に真下へ射出
  private fireSuctionPulse(): void {
    const count = this.playerPowerMult >= 1.5 ? 5 : 3;
    const spd = ENEMY_BULLET_SPEED * 1.5 * Math.min(this.playerPowerMult, 1.6);

    for (let i = 0; i < count; i++) {
      const xOff = (i - (count - 1) / 2) * 22;
      const b = this.scene.add.graphics();

      // 青/シアン の圧縮エネルギー球
      b.fillStyle(0x0088ff, 0.2);
      b.fillCircle(0, 0, 9);
      b.fillStyle(0x00ccff, 0.7);
      b.fillCircle(0, 0, 6);
      b.fillStyle(0x44eeff, 0.9);
      b.fillCircle(0, 0, 3);
      b.fillStyle(0xffffff, 0.6);
      b.fillCircle(-1, -1, 1.5);
      b.lineStyle(1.5, 0x00aaff, 0.8);
      b.strokeCircle(0, 0, 8);

      (b as any).x = this.x + xOff;
      (b as any).y = this.y + 70;
      (b as any).vx = (xOff * 0.05);  // ごくわずかに拡散
      (b as any).vy = spd;
      (b as any).active = true;
      this.bullets.add(b as any);
    }
  }

  // 吸引モード起動
  private activateSuction(): void {
    if (this.isSucking) return;
    this.isSucking = true;
    this.mouthOpen = true;
    this.drawMouth(true);

    // 口のアニメーション（スケール変化で脈動）
    this.scene.tweens.add({
      targets: this.mouthGfx,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const duration = this.phase === 1 ? 2500 : 1800;
    this.scene.time.delayedCall(duration, () => {
      this.isSucking = false;
      this.mouthOpen = false;
      this.drawMouth(false);
      this.scene.tweens.killTweensOf(this.mouthGfx);
      this.mouthGfx.setScale(1, 1);
    });
  }

  private onPhase2(): void {
    // カメラシェイク
    this.scene.cameras.main.shake(400, 0.015);

    // 吸引強化
    this.suctionStrength = 260;

    // 機体フリッカー（機械的うめき声演出）
    this.scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 60,
      yoyo: true,
      repeat: 8,
      onComplete: () => {
        this.setAlpha(1);
        // OVERDRIVE演出: 短いアルファフリッカーを追加で入れる
        this.scene.tweens.add({
          targets: this,
          alpha: 0.7,
          duration: 80,
          yoyo: true,
          repeat: 3,
          onComplete: () => { this.setAlpha(1); },
        });
      },
    });
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
