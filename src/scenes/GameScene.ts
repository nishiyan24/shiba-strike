import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Boss } from '../objects/Boss';
import { HUD } from '../ui/HUD';
import { BossHealthBar } from '../ui/BossHealthBar';
import { EnemySpawner } from '../systems/EnemySpawner';
import { AudioManager } from '../systems/AudioManager';
import {
  GAME_WIDTH, GAME_HEIGHT,
  BOSS_APPEAR_TIME, BOSS_SCORE,
} from '../config';

// 背景ステージの種類
type BgStage = 0 | 1 | 2;
// 0: 普通の宇宙
// 1: おやつ銀河（骨型の星・温かみのある色）
// 2: 伝説のドッグラン（黄金の星・ドッグラン的演出）

export class GameScene extends Phaser.Scene {
  public player!: Player;
  private hud!: HUD;
  private bossHpBar!: BossHealthBar;
  private spawner!: EnemySpawner;
  private boss: Boss | null = null;
  private audio!: AudioManager;

  // 背景レイヤー
  private bgRect!: Phaser.GameObjects.Rectangle;
  private stageOverlay!: Phaser.GameObjects.Rectangle;
  private starLayers: Array<{
    gfx: Phaser.GameObjects.Graphics;
    speed: number;
    stars: Array<{ x: number; y: number; r: number; a: number }>;
  }> = [];
  private decorations: Phaser.GameObjects.Graphics[] = [];
  private floatingBones: Array<{
    gfx: Phaser.GameObjects.Graphics;
    x: number; y: number; speed: number;
  }> = [];
  private pawPrints: Array<{
    gfx: Phaser.GameObjects.Graphics;
    x: number; y: number; speed: number;
  }> = [];

  private elapsed: number = 0;
  private bossSpawned: boolean = false;
  private gameEnded: boolean = false;
  private hitstopActive: boolean = false;
  private currentBgStage: BgStage = 0;

  private bossWarningText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.elapsed = 0;
    this.bossSpawned = false;
    this.gameEnded = false;
    this.hitstopActive = false;
    this.boss = null;
    this.currentBgStage = 0;
    this.starLayers = [];
    this.decorations = [];
    this.floatingBones = [];
    this.pawPrints = [];

    // ── 背景
    this.createBackground();
    this.createStarfield();

    // ── ゲームオブジェクト
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 100);
    this.spawner = new EnemySpawner(this);
    this.audio = new AudioManager(this);

    // ── UI
    this.hud = new HUD(this);
    this.bossHpBar = new BossHealthBar(this);
    this.bossHpBar.hide();

    // ── プレイヤーコールバック
    this.player.onShoot = () => this.audio.playShoot();
    this.player.onBomb = () => this.showShibaBombCutscene();
    this.player.onDamage = () => {
      this.audio.playDamage();
      this.cameras.main.shake(220, 0.012);
      this.hud.updateLives(this.player.lives);
      if (this.player.lives <= 0) this.triggerGameOver();
    };

    // ── ボス警告テキスト
    this.bossWarningText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      '⚠ 全自動シャンプーマシン 接近中 ⚠', {
        fontSize: '24px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ff4488',
        stroke: '#440000',
        strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(0).setDepth(95);

    // BGM開始
    this.audio.resume();
    this.audio.startBGM();
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded || this.hitstopActive) return;

    this.elapsed += delta;

    // 背景ステージ切り替えチェック
    this.checkBgStageTransition();

    // 背景スクロール更新
    this.updateStarfield(delta);
    this.updateDecorations(delta);

    // プレイヤー更新
    this.player.update(delta);

    // プレイヤー弾更新
    this.updatePlayerBullets(delta);

    // 敵スポーン & 通常敵の処理
    if (!this.bossSpawned) {
      this.spawner.update(delta);
      if (this.elapsed >= BOSS_APPEAR_TIME) {
        this.triggerBossAppearance();
      }
    }

    // 当たり判定
    this.checkPlayerBulletsVsEnemies();
    this.checkEnemyBulletsVsPlayer(delta);
    this.checkEnemiesVsPlayer();

    // ボス処理
    if (this.boss) {
      this.boss.update(delta);
      this.checkPlayerBulletsVsBoss();
      this.checkBossBulletsVsPlayer(delta);
      this.bossHpBar.update(this.boss.hp, this.boss.maxHp);
    }

    // HUD
    this.hud.updateScore(this.player.score);
    this.hud.updateBombs(this.player.bombs);
  }

  // ─── 背景生成 ──────────────────────────────────────

  private createBackground(): void {
    this.bgRect = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000011
    ).setDepth(0);

    // ステージ色オーバーレイ（Stage 1, 2, 3 で色が変わる）
    this.stageOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x110800
    ).setAlpha(0).setDepth(1);
  }

  private createStarfield(): void {
    const speeds = [18, 48, 95];
    const counts = [90, 45, 22];
    const sizes = [0.7, 1.2, 1.9];

    speeds.forEach((speed, li) => {
      const stars: Array<{ x: number; y: number; r: number; a: number }> = [];
      for (let i = 0; i < counts[li]; i++) {
        stars.push({
          x: Phaser.Math.Between(0, GAME_WIDTH),
          y: Phaser.Math.Between(0, GAME_HEIGHT),
          r: Phaser.Math.FloatBetween(sizes[li] * 0.5, sizes[li]),
          a: Phaser.Math.FloatBetween(0.3, 1.0),
        });
      }
      const gfx = this.add.graphics().setDepth(2);
      this.starLayers.push({ gfx, speed, stars });
    });

    // 惑星（各ステージで別の装飾に変わる）
    const planet = this.add.graphics().setDepth(2);
    planet.fillStyle(0x334466, 0.55);
    planet.fillCircle(55, 220, 42);
    planet.fillStyle(0x223355, 0.35);
    planet.fillEllipse(55, 220, 96, 14);
    planet.fillStyle(0x443322, 0.45);
    planet.fillCircle(415, 480, 22);
    this.decorations.push(planet);

    this.renderStarLayers();
  }

  private getStarColors(): number[][] {
    switch (this.currentBgStage) {
      case 0: // 普通の宇宙
        return [
          [0x8899bb, 0xaabbcc, 0xccddee],
          [0xbbccdd, 0xddeeff, 0xffffff],
          [0xffffff, 0xeeeeff, 0xddeeff],
        ];
      case 1: // おやつ銀河
        return [
          [0xcc8833, 0xaa6622, 0xbb7711],
          [0xffcc44, 0xffaa22, 0xffdd66],
          [0xffee88, 0xffffff, 0xffcc66],
        ];
      case 2: // 伝説のドッグラン
        return [
          [0xcc9900, 0xaa8800, 0xdd9900],
          [0xffcc00, 0xffdd44, 0xffaa00],
          [0xffd700, 0xffffff, 0xffee44],
        ];
    }
  }

  private renderStarLayers(): void {
    const colorSets = this.getStarColors();
    this.starLayers.forEach((layer, li) => {
      layer.gfx.clear();
      const colors = colorSets[li];
      layer.stars.forEach(s => {
        const c = colors[Math.floor(s.a * colors.length) % colors.length];
        layer.gfx.fillStyle(c, s.a);
        layer.gfx.fillCircle(s.x, s.y, s.r);
      });
    });
  }

  private updateStarfield(delta: number): void {
    this.starLayers.forEach(layer => {
      layer.stars.forEach(s => {
        s.y += layer.speed * (delta / 1000);
        if (s.y > GAME_HEIGHT + 5) {
          s.y = -5;
          s.x = Phaser.Math.Between(0, GAME_WIDTH);
        }
      });
    });
    this.renderStarLayers();
  }

  // ─── 背景ステージ切り替え ──────────────────────────

  private checkBgStageTransition(): void {
    const STAGE1_TIME = 20000;
    const STAGE2_TIME = 40000;

    if (this.elapsed >= STAGE2_TIME && this.currentBgStage < 2) {
      this.transitionToBgStage(2);
    } else if (this.elapsed >= STAGE1_TIME && this.currentBgStage < 1) {
      this.transitionToBgStage(1);
    }
  }

  private transitionToBgStage(stage: BgStage): void {
    this.currentBgStage = stage;

    if (stage === 1) {
      // おやつ銀河へ：温かいオレンジ色のオーバーレイ
      this.stageOverlay.setFillStyle(0x221100);
      this.tweens.add({
        targets: this.stageOverlay,
        alpha: 0.55,
        duration: 4000,
        ease: 'Sine.InOut',
      });
      // 骨型の装飾を追加
      this.spawnBoneDecorations();

      // 通知テキスト
      this.showStageNotice('🦴 おやつ銀河突入 🦴', 0xffcc44);

    } else if (stage === 2) {
      // 伝説のドッグランへ：深紫
      this.stageOverlay.setFillStyle(0x110022);
      this.tweens.add({
        targets: this.stageOverlay,
        alpha: 0.65,
        duration: 4000,
        ease: 'Sine.InOut',
      });
      // 肉球マーク装飾を追加
      this.spawnPawPrintDecorations();

      // 既存の骨を片付ける
      this.floatingBones.forEach(b => b.gfx.destroy());
      this.floatingBones = [];

      this.showStageNotice('🐾 伝説のドッグラン 🐾', 0xffd700);
    }
  }

  private showStageNotice(text: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, text, {
      fontSize: '22px',
      fontFamily: 'Arial Black, sans-serif',
      color: hex,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(96);

    this.tweens.add({
      targets: t,
      alpha: 1,
      y: GAME_HEIGHT / 2 - 80,
      duration: 400,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(1800, () => {
          this.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.destroy() });
        });
      },
    });
  }

  // ステージ1: 骨型の流れる装飾
  private spawnBoneDecorations(): void {
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics().setDepth(3).setAlpha(0.4);
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(-200, GAME_HEIGHT);
      this.drawSmallBoneDecor(g, 0, 0);
      g.setPosition(x, y);
      this.floatingBones.push({ gfx: g, x, y, speed: Phaser.Math.Between(18, 36) });
    }
  }

  private drawSmallBoneDecor(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.clear();
    const scale = Phaser.Math.FloatBetween(0.6, 1.2);
    const s = scale * 10;
    g.fillStyle(0xffcc88, 0.8);
    g.fillRect(x - s * 0.2, y - s * 0.8, s * 0.4, s * 1.6);
    g.fillCircle(x - s * 0.4, y - s * 0.7, s * 0.38);
    g.fillCircle(x + s * 0.4, y - s * 0.7, s * 0.38);
    g.fillCircle(x - s * 0.4, y + s * 0.7, s * 0.38);
    g.fillCircle(x + s * 0.4, y + s * 0.7, s * 0.38);
    g.lineStyle(1, 0xffaa44, 0.5);
    g.strokeRect(x - s * 0.2, y - s * 0.8, s * 0.4, s * 1.6);
  }

  // ステージ2: 肉球マークの流れる装飾
  private spawnPawPrintDecorations(): void {
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics().setDepth(3).setAlpha(0.35);
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(-300, GAME_HEIGHT);
      this.drawPawPrint(g, 0, 0);
      g.setPosition(x, y);
      this.pawPrints.push({ gfx: g, x, y, speed: Phaser.Math.Between(22, 44) });
    }
  }

  private drawPawPrint(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.clear();
    g.fillStyle(0xffd700, 0.8);
    // メインの肉球パッド
    g.fillEllipse(x, y + 4, 18, 14);
    // 4つの小さい爪先パッド
    g.fillCircle(x - 9, y - 6, 5);
    g.fillCircle(x - 3, y - 10, 5);
    g.fillCircle(x + 3, y - 10, 5);
    g.fillCircle(x + 9, y - 6, 5);
  }

  private updateDecorations(delta: number): void {
    // 骨の流れ
    this.floatingBones.forEach(b => {
      b.y += b.speed * (delta / 1000);
      b.gfx.setPosition(b.x, b.y);
      if (b.y > GAME_HEIGHT + 60) {
        b.y = -60;
        b.x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      }
    });

    // 肉球の流れ
    this.pawPrints.forEach(p => {
      p.y += p.speed * (delta / 1000);
      p.gfx.setPosition(p.x, p.y);
      if (p.y > GAME_HEIGHT + 60) {
        p.y = -60;
        p.x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      }
    });
  }

  // ─── プレイヤー弾更新 ──────────────────────────────

  private updatePlayerBullets(delta: number): void {
    const bullets = this.player.bullets.getChildren() as any[];
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.active) continue;
      b.y += b.vy * (delta / 1000);
      if (b.y < -30) {
        b.destroy();
        this.player.bullets.remove(b, true, true);
      }
    }
  }

  // ─── 当たり判定 ────────────────────────────────────

  private checkPlayerBulletsVsEnemies(): void {
    const bullets = this.player.bullets.getChildren() as any[];
    const enemies = this.spawner.enemies;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (!b.active) continue;

      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (Math.sqrt(dx * dx + dy * dy) < 24) {
          this.createExplosion(e.x, e.y, 'small');
          this.audio.playExplosion();
          b.destroy();
          this.player.bullets.remove(b, true, true);

          if (e.takeDamage(1)) {
            this.player.score += e.score;
            this.createExplosion(e.x, e.y, 'medium');
            this.spawner.destroyEnemy(ei);
          }
          break;
        }
      }
    }
  }

  private checkEnemyBulletsVsPlayer(delta: number): void {
    if (this.player.isInvincible) return;

    this.spawner.enemies.forEach(e => {
      const bullets = e.bullets.getChildren() as any[];
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b.active) continue;

        b.x += (b.vx || 0) * (delta / 1000);
        b.y += (b.vy || 0) * (delta / 1000);

        if (b.y > GAME_HEIGHT + 30 || b.x < -30 || b.x > GAME_WIDTH + 30) {
          b.destroy(); e.bullets.remove(b, true, true); continue;
        }

        const dx = b.x - this.player.x;
        const dy = b.y - this.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 14) {
          b.destroy(); e.bullets.remove(b, true, true);
          this.player.takeDamage();
        }
      }
    });
  }

  private checkEnemiesVsPlayer(): void {
    if (this.player.isInvincible) return;
    for (let i = this.spawner.enemies.length - 1; i >= 0; i--) {
      const e = this.spawner.enemies[i];
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 26) {
        this.createExplosion(e.x, e.y, 'medium');
        this.spawner.destroyEnemy(i);
        this.player.takeDamage();
      }
    }
  }

  private checkPlayerBulletsVsBoss(): void {
    if (!this.boss || this.boss.isDefeated) return;
    const bullets = this.player.bullets.getChildren() as any[];

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.active) continue;
      const dx = b.x - this.boss.x;
      const dy = b.y - this.boss.y;
      if (Math.sqrt(dx * dx + dy * dy) < 65) {
        b.destroy();
        this.player.bullets.remove(b, true, true);
        this.boss.takeDamage(1);
        this.audio.playBossDamage();
        this.cameras.main.shake(60, 0.005); // ボスヒット時の小さな揺れ

        if (this.boss.hp <= 0) {
          this.triggerBossDefeat();
        }
      }
    }
  }

  private checkBossBulletsVsPlayer(delta: number): void {
    if (!this.boss || this.player.isInvincible) return;
    const bullets = this.boss.bullets.getChildren() as any[];

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.active) continue;

      b.x += (b.vx || 0) * (delta / 1000);
      b.y += (b.vy || 0) * (delta / 1000);

      if (b.y > GAME_HEIGHT + 30 || b.x < -30 || b.x > GAME_WIDTH + 30 || b.y < -30) {
        b.destroy(); this.boss.bullets.remove(b, true, true); continue;
      }

      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 14) {
        b.destroy(); this.boss.bullets.remove(b, true, true);
        this.player.takeDamage();
      }
    }
  }

  // ─── エフェクト ────────────────────────────────────

  private createExplosion(x: number, y: number, size: 'small' | 'medium' | 'large'): void {
    const count = size === 'small' ? 7 : size === 'medium' ? 16 : 34;
    const maxR = size === 'small' ? 45 : size === 'medium' ? 90 : 180;
    const colors = [0xff8800, 0xffcc00, 0xff4400, 0xffffff, 0xff6600];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.4, 0.4);
      const speed = Phaser.Math.Between(35, maxR);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dot = this.add.graphics();
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      dot.x = x; dot.y = y;
      dot.setDepth(50);

      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(280, 620),
        onComplete: () => dot.destroy(),
      });
    }

    const flash = this.add.graphics();
    const fs = size === 'small' ? 18 : size === 'medium' ? 38 : 75;
    flash.fillStyle(0xffffff, 0.9);
    flash.fillCircle(x, y, fs);
    flash.setDepth(51);
    this.tweens.add({
      targets: flash,
      alpha: 0, scaleX: 2.2, scaleY: 2.2,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  // ─── ボム：柴犬カットイン ──────────────────────────

  private showShibaBombCutscene(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 暗転オーバーレイ
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
    overlay.setDepth(100);

    this.tweens.add({
      targets: overlay,
      alpha: 0.88,
      duration: 130,
      onComplete: () => {
        // 巨大柴犬カットインコンテナ
        const faceC = this.add.container(cx, cy + 40);
        faceC.setDepth(101);
        faceC.setScale(0.01);

        const face = this.add.graphics();

        // 顔（橙色の大きな丸）
        face.fillStyle(0xdd7700);
        face.fillCircle(0, 0, 95);

        // マズル（薄い色の楕円）
        face.fillStyle(0xffcc88);
        face.fillEllipse(0, 25, 110, 75);

        // 大きな耳
        face.fillStyle(0xcc6600);
        face.fillTriangle(-95, -30, -55, -30, -80, -115);
        face.fillTriangle(95, -30, 55, -30, 80, -115);
        face.fillStyle(0xff9999, 0.7);
        face.fillTriangle(-88, -35, -62, -35, -77, -100);
        face.fillTriangle(88, -35, 62, -35, 77, -100);

        // 目（丸くてかわいい）
        face.fillStyle(0x000000);
        face.fillCircle(-36, -22, 22);
        face.fillCircle(36, -22, 22);
        face.fillStyle(0xffffff);
        face.fillCircle(-27, -30, 9);
        face.fillCircle(45, -30, 9);
        face.fillStyle(0xffffff, 0.6);
        face.fillCircle(-24, -26, 4.5);
        face.fillCircle(48, -26, 4.5);

        // 鼻
        face.fillStyle(0x111111);
        face.fillEllipse(0, 14, 28, 18);
        face.fillStyle(0x444444, 0.5);
        face.fillCircle(-4, 12, 6);

        // ワフッ！な口（大きく開いている）
        face.fillStyle(0x880000);
        face.fillEllipse(0, 45, 70, 42);
        face.fillStyle(0xffaaaa);
        face.fillEllipse(0, 48, 60, 32);
        // 舌
        face.fillStyle(0xff5588);
        face.fillEllipse(0, 60, 38, 26);
        face.fillStyle(0xff88aa, 0.5);
        face.fillEllipse(-4, 58, 16, 14);

        // ほっぺたの赤み
        face.fillStyle(0xff8866, 0.38);
        face.fillCircle(-72, 16, 22);
        face.fillCircle(72, 16, 22);

        faceC.add(face);

        // 「ワフッ！」テキスト
        const barkTxt = this.add.text(cx, cy - 150, 'ワフッ！', {
          fontSize: '72px',
          fontFamily: 'Arial Black, sans-serif',
          color: '#ffdd00',
          stroke: '#884400',
          strokeThickness: 10,
        }).setOrigin(0.5).setAlpha(0).setDepth(102);

        // 出現アニメーション
        this.tweens.add({
          targets: faceC,
          scaleX: 1, scaleY: 1,
          duration: 220,
          ease: 'Back.Out',
        });
        this.tweens.add({
          targets: barkTxt,
          alpha: 1,
          y: cy - 170,
          duration: 220,
          ease: 'Back.Out',
        });

        // 吠え声再生
        this.audio.playBark();

        // 揺れ演出
        this.time.delayedCall(280, () => {
          this.tweens.add({
            targets: faceC,
            angle: 12,
            duration: 70,
            yoyo: true,
            repeat: 4,
          });
        });

        // 少し間を置いてボムダメージ実行
        this.time.delayedCall(500, () => {
          this.executeBombDamage();
        });

        // フェードアウト
        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: [overlay, faceC, barkTxt],
            alpha: 0,
            duration: 320,
            onComplete: () => {
              overlay.destroy();
              faceC.destroy();
              barkTxt.destroy();
            },
          });
        });
      },
    });
  }

  private executeBombDamage(): void {
    this.hud.updateBombs(this.player.bombs);
    this.audio.playBomb();
    this.cameras.main.shake(400, 0.022); // ボム使用時の大きな揺れ

    // 全敵にダメージ
    const enemies = [...this.spawner.enemies];
    enemies.forEach(e => {
      this.createExplosion(e.x, e.y, 'medium');
      e.takeDamage(10);
    });
    for (let i = this.spawner.enemies.length - 1; i >= 0; i--) {
      if (this.spawner.enemies[i].hp <= 0) {
        this.player.score += this.spawner.enemies[i].score;
        this.spawner.destroyEnemy(i);
      }
    }

    // ボスにもダメージ
    if (this.boss && !this.boss.isDefeated) {
      this.boss.takeDamage(25);
      if (this.boss.hp <= 0) this.triggerBossDefeat();
    }

    // 画面フラッシュ（白）
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff);
    flash.setDepth(80);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      onComplete: () => flash.destroy(),
    });

    // 衝撃波リング（3重）
    for (let r = 0; r < 3; r++) {
      const ring = this.add.graphics();
      ring.lineStyle(3 - r * 0.5, 0x88eeff, 0.9);
      ring.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 10);
      ring.setDepth(81);
      this.tweens.add({
        targets: ring,
        scaleX: 45, scaleY: 28,
        alpha: 0,
        duration: 700 + r * 180,
        onComplete: () => ring.destroy(),
      });
    }

    // 敵弾を全消去
    this.spawner.enemies.forEach(e => e.bullets.clear(true, true));
    if (this.boss) this.boss.bullets.clear(true, true);
  }

  // ─── ボス ──────────────────────────────────────────

  private triggerBossAppearance(): void {
    this.bossSpawned = true;
    this.spawner.destroyAll();

    if (this.bossWarningText) {
      this.tweens.add({
        targets: this.bossWarningText,
        alpha: 1,
        duration: 280,
        yoyo: true,
        repeat: 6,
        onComplete: () => {
          this.bossWarningText?.destroy();
          this.spawnBoss();
        },
      });
    }
  }

  private spawnBoss(): void {
    this.boss = new Boss(this);
    this.bossHpBar.show();
    this.audio.stopBGM();
  }

  private triggerBossDefeat(): void {
    if (!this.boss || this.gameEnded) return;
    this.boss.isDefeated = true;
    this.audio.stopBGM();

    // ── ヒットストップ（0.25秒の静止）
    this.hitstopActive = true;
    this.cameras.main.shake(120, 0.025);

    // ヒットストップ中に白フラッシュ
    const hitFlash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.95);
    hitFlash.setDepth(90);

    this.time.delayedCall(250, () => {
      this.hitstopActive = false;
      this.gameEnded = true;

      this.tweens.add({
        targets: hitFlash,
        alpha: 0,
        duration: 300,
        onComplete: () => hitFlash.destroy(),
      });

      this.player.score += BOSS_SCORE;

      // 連続大爆発 + 大きな揺れ
      for (let i = 0; i < 7; i++) {
        this.time.delayedCall(i * 180, () => {
          if (!this.boss) return;
          const ox = Phaser.Math.Between(-70, 70);
          const oy = Phaser.Math.Between(-60, 60);
          this.createExplosion(this.boss.x + ox, this.boss.y + oy, 'large');
          this.audio.playExplosion();
          this.cameras.main.shake(100 + i * 15, 0.008 + i * 0.002);
        });
      }

      this.time.delayedCall(1500, () => {
        this.boss?.destroy();
        this.cameras.main.flash(600, 255, 255, 255);
        this.time.delayedCall(700, () => {
          this.scene.start('ClearScene', { score: this.player.score });
        });
      });
    });
  }

  private triggerGameOver(): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.audio.stopBGM();

    this.createExplosion(this.player.x, this.player.y, 'large');
    this.player.setVisible(false);

    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', { score: this.player.score });
    });
  }
}
