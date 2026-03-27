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
  SCORE_MULT_STAGE0, SCORE_MULT_STAGE1, SCORE_MULT_STAGE2,
  DROP_RATE_STAGE0, DROP_RATE_STAGE1, DROP_RATE_STAGE2,
} from '../config';

// 背景ステージ
type BgStage = 0 | 1 | 2;

// 拾える骨アイテムのデータ
interface BoneItem {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  speed: number;
  rotAngle: number;
}

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
  private floatingBones: Array<{ gfx: Phaser.GameObjects.Graphics; x: number; y: number; speed: number }> = [];
  private pawPrints: Array<{ gfx: Phaser.GameObjects.Graphics; x: number; y: number; speed: number }> = [];

  // アイテム
  private boneItems: BoneItem[] = [];

  // ゲーム状態
  private elapsed: number = 0;
  private bossSpawned: boolean = false;
  private gameEnded: boolean = false;
  private hitstopActive: boolean = false;
  private currentBgStage: BgStage = 0;
  private superModeActive: boolean = false;

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
    this.superModeActive = false;
    this.starLayers = [];
    this.decorations = [];
    this.floatingBones = [];
    this.pawPrints = [];
    this.boneItems = [];

    this.createBackground();
    this.createStarfield();

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 100);
    this.spawner = new EnemySpawner(this);
    this.audio = new AudioManager(this);

    this.hud = new HUD(this);
    this.bossHpBar = new BossHealthBar(this);
    this.bossHpBar.hide();

    this.player.onShoot  = () => this.audio.playShoot();
    this.player.onBomb   = () => this.showShibaBombCutscene();
    this.player.onDamage = () => {
      this.audio.playDamage();
      this.cameras.main.shake(220, 0.012);
      this.hud.updateLives(this.player.lives);
      if (this.player.lives <= 0) this.triggerGameOver();
    };

    this.bossWarningText = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      '⚠ 全自動シャンプーマシン 接近中 ⚠',
      {
        fontSize: '24px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ff4488',
        stroke: '#440000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setAlpha(0).setDepth(95);

    this.audio.resume();
    this.audio.startBGM();
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded || this.hitstopActive) return;

    this.elapsed += delta;

    this.checkBgStageTransition();
    this.updateStarfield(delta);
    this.updateDecorations(delta);

    this.player.update(delta);
    this.updatePlayerBullets(delta);
    this.updateBoneItems(delta);

    if (!this.bossSpawned) {
      this.spawner.update(delta);
      if (this.elapsed >= BOSS_APPEAR_TIME) this.triggerBossAppearance();
    }

    this.checkPlayerBulletsVsEnemies();
    this.checkEnemyBulletsVsPlayer(delta);
    this.checkEnemiesVsPlayer();

    if (this.boss) {
      this.boss.update(delta);
      this.checkPlayerBulletsVsBoss();
      this.checkBossBulletsVsPlayer(delta);
      this.bossHpBar.update(this.boss.hp, this.boss.maxHp);
    }

    this.hud.updateScore(this.player.score);
    this.hud.updateBombs(this.player.bombs);
  }

  // ─── スコア倍率 ────────────────────────────────────

  private getScoreMultiplier(): number {
    if (this.superModeActive) return SCORE_MULT_STAGE2;
    if (this.currentBgStage >= 1) return SCORE_MULT_STAGE1;
    return SCORE_MULT_STAGE0;
  }

  private getDropRate(): number {
    if (this.currentBgStage >= 2) return DROP_RATE_STAGE2;
    if (this.currentBgStage >= 1) return DROP_RATE_STAGE1;
    return DROP_RATE_STAGE0;
  }

  // ─── 背景生成 ──────────────────────────────────────

  private createBackground(): void {
    this.bgRect = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000011
    ).setDepth(0);
    this.stageOverlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x110800
    ).setAlpha(0).setDepth(1);
  }

  private createStarfield(): void {
    const speeds = [18, 48, 95];
    const counts = [90, 45, 22];
    const sizes  = [0.7, 1.2, 1.9];

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
      case 0:
        return [[0x8899bb, 0xaabbcc, 0xccddee], [0xbbccdd, 0xddeeff, 0xffffff], [0xffffff, 0xeeeeff, 0xddeeff]];
      case 1:
        return [[0xcc8833, 0xaa6622, 0xbb7711], [0xffcc44, 0xffaa22, 0xffdd66], [0xffee88, 0xffffff, 0xffcc66]];
      case 2:
        return [[0xcc9900, 0xaa8800, 0xdd9900], [0xffcc00, 0xffdd44, 0xffaa00], [0xffd700, 0xffffff, 0xffee44]];
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
        if (s.y > GAME_HEIGHT + 5) { s.y = -5; s.x = Phaser.Math.Between(0, GAME_WIDTH); }
      });
    });
    this.renderStarLayers();
  }

  // ─── 背景ステージ切り替え ──────────────────────────

  private checkBgStageTransition(): void {
    if (this.elapsed >= 40000 && this.currentBgStage < 2) {
      this.transitionToBgStage(2);
    } else if (this.elapsed >= 20000 && this.currentBgStage < 1) {
      this.transitionToBgStage(1);
    }
  }

  private transitionToBgStage(stage: BgStage): void {
    this.currentBgStage = stage;

    if (stage === 1) {
      // おやつ銀河へ（スコア×2 ＋ アイテムドロップ開始）
      this.stageOverlay.setFillStyle(0x221100);
      this.tweens.add({ targets: this.stageOverlay, alpha: 0.55, duration: 4000, ease: 'Sine.InOut' });
      this.spawnBoneDecorations();
      this.showStageNotice('🦴 おやつ銀河突入！ スコア×2 🦴', 0xffcc44);
      this.hud.setScoreMultiplier(2);

    } else if (stage === 2) {
      // 伝説のドッグランへ（SUPER SHIBA MODE 発動）
      this.stageOverlay.setFillStyle(0x110022);
      this.tweens.add({ targets: this.stageOverlay, alpha: 0.65, duration: 4000, ease: 'Sine.InOut' });
      this.floatingBones.forEach(b => b.gfx.destroy());
      this.floatingBones = [];
      this.spawnPawPrintDecorations();

      // SUPER SHIBA MODE カットイン ＆ 発動
      this.time.delayedCall(200, () => {
        this.showSuperShibaModeEntry();
      });
    }
  }

  // SUPER SHIBA MODE 突入演出
  private showSuperShibaModeEntry(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // ── 1. 画面全体を金色にフラッシュ
    const goldFlash = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0xffcc00, 0).setDepth(100);
    this.tweens.add({
      targets: goldFlash,
      alpha: 0.75,
      duration: 120,
      yoyo: true,
      repeat: 2,
      onComplete: () => goldFlash.destroy(),
    });

    // ── 2. 「SUPER SHIBA MODE!!」テキスト
    const title = this.add.text(cx, cy - 60, 'SUPER SHIBA\nMODE!!', {
      fontSize: '56px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd700',
      stroke: '#885500',
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5).setDepth(102).setScale(0.1).setAlpha(0);

    this.tweens.add({
      targets: title,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 400,
      ease: 'Back.Out',
    });

    // 虹色に点滅（SUPER感演出）
    let colorIdx = 0;
    const rainbowColors = ['#ffd700', '#ff4488', '#00ffcc', '#ff8800', '#88eeff'];
    const colorTimer = this.time.addEvent({
      delay: 100,
      repeat: 15,
      callback: () => {
        title.setStyle({ color: rainbowColors[colorIdx % rainbowColors.length] });
        colorIdx++;
      },
    });
    colorTimer;

    // ── 3. サブテキスト
    const sub = this.add.text(cx, cy + 40, '移動1.5倍 ✦ ショット強化 ✦ スコア×3!', {
      fontSize: '15px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(102);

    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 300 });

    // ── 4. フェードアウト
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: [title, sub],
        alpha: 0, y: '-=40',
        duration: 400,
        onComplete: () => { title.destroy(); sub.destroy(); },
      });
    });

    // ── 5. 実際にスーパーモード発動
    this.time.delayedCall(500, () => {
      this.player.activateSuperMode();
      this.superModeActive = true;
      this.hud.setScoreMultiplier(3);
      this.hud.setPowerBadge(1, true);
      this.audio.playSuperMode();
      this.audio.startFastBGM();

      // プレイヤー周囲にゴールドリング展開
      for (let r = 0; r < 3; r++) {
        const ring = this.add.graphics();
        ring.lineStyle(3, 0xffd700, 0.9);
        ring.strokeCircle(this.player.x, this.player.y, 10);
        ring.setDepth(55);
        this.tweens.add({
          targets: ring,
          scaleX: 8, scaleY: 8,
          alpha: 0,
          duration: 500 + r * 150,
          delay: r * 100,
          onComplete: () => ring.destroy(),
        });
      }
    });
  }

  private showStageNotice(text: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, text, {
      fontSize: '20px',
      fontFamily: 'Arial Black, sans-serif',
      color: hex,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setAlpha(0).setDepth(96);

    this.tweens.add({
      targets: t,
      alpha: 1, y: GAME_HEIGHT / 2 - 80,
      duration: 400,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({ targets: t, alpha: 0, duration: 500, onComplete: () => t.destroy() });
        });
      },
    });
  }

  // ─── 骨アイテムスポーン ────────────────────────────

  private spawnBoneItem(x: number, y: number): void {
    const g = this.add.graphics().setDepth(22);
    this.drawBoneItemGfx(g, 1.0);
    g.setPosition(x, y);

    // スポーン時のスパーク
    const spark = this.add.graphics().setDepth(21);
    spark.lineStyle(2, 0xffd700, 0.9);
    spark.strokeCircle(x, y, 5);
    spark.setPosition(x, y);
    this.tweens.add({
      targets: spark,
      scaleX: 5, scaleY: 5,
      alpha: 0,
      duration: 300,
      onComplete: () => spark.destroy(),
    });

    // 脈動Tween（見つけやすくする）
    this.tweens.add({
      targets: g,
      scaleX: 1.2, scaleY: 1.2,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.boneItems.push({ gfx: g, x, y, speed: 72, rotAngle: 0 });
  }

  private drawBoneItemGfx(g: Phaser.GameObjects.Graphics, scale: number): void {
    g.clear();
    const s = scale * 7; // 拾えるアイテムは弾より少し小さめ
    // 黄金の骨
    g.fillStyle(0xffd700);
    g.fillRect(-s * 0.28, -s * 1.1, s * 0.56, s * 2.2);
    g.fillCircle(-s * 0.5, -s * 0.9, s * 0.52);
    g.fillCircle(s * 0.5, -s * 0.9, s * 0.52);
    g.fillCircle(-s * 0.5, s * 0.9, s * 0.52);
    g.fillCircle(s * 0.5, s * 0.9, s * 0.52);
    // ハイライト
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(-s * 0.1, -s * 1.0, s * 0.18, s * 1.8);
    // 光沢リング
    g.lineStyle(1.2, 0xffee88, 0.6);
    g.strokeCircle(0, 0, s * 1.4);
  }

  private updateBoneItems(delta: number): void {
    for (let i = this.boneItems.length - 1; i >= 0; i--) {
      const item = this.boneItems[i];

      // 落下 & 回転
      item.y += item.speed * (delta / 1000);
      item.rotAngle += 120 * (delta / 1000);
      item.gfx.y = item.y;
      item.gfx.angle = item.rotAngle;

      // 画面外 → 削除
      if (item.y > GAME_HEIGHT + 50) {
        item.gfx.destroy();
        this.boneItems.splice(i, 1);
        continue;
      }

      // プレイヤーとの接触判定（少し広め）
      const dx = item.gfx.x - this.player.x;
      const dy = item.gfx.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        item.gfx.destroy();
        this.boneItems.splice(i, 1);
        this.onPickupBone(item.gfx.x, item.gfx.y);
      }
    }
  }

  private onPickupBone(x: number, y: number): void {
    const result = this.player.activatePowerup();

    if (result === 'new') {
      // 初回パワーアップ → 3WAY解放
      this.audio.playPowerup();
      this.hud.setPowerBadge(1, false);
      this.showFloatingText(x, y, '🦴 3-WAY SHOT!', 0x88eeff);
    } else {
      // 既にパワーアップ済み → スコアボーナス
      const bonus = 500 * this.getScoreMultiplier();
      this.player.score += bonus;
      this.audio.playPowerup();
      this.showFloatingText(x, y, `+${bonus} BONE BONUS!`, 0xffd700);
    }

    // キラキラエフェクト
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const dot = this.add.graphics();
      dot.fillStyle(0xffd700);
      dot.fillCircle(0, 0, 3);
      dot.x = x; dot.y = y;
      dot.setDepth(60);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 45,
        y: y + Math.sin(angle) * 45,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 380,
        onComplete: () => dot.destroy(),
      });
    }
  }

  // 画面上に浮かぶフィードバックテキスト
  private showFloatingText(x: number, y: number, text: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(x, y, text, {
      fontSize: '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: hex,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(65);

    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 900,
      ease: 'Sine.Out',
      onComplete: () => t.destroy(),
    });
  }

  // ─── 装飾オブジェクト ──────────────────────────────

  private spawnBoneDecorations(): void {
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics().setDepth(3).setAlpha(0.4);
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(-200, GAME_HEIGHT);
      this.drawSmallBoneDecor(g);
      g.setPosition(x, y);
      this.floatingBones.push({ gfx: g, x, y, speed: Phaser.Math.Between(18, 36) });
    }
  }

  private drawSmallBoneDecor(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    const s = 10;
    g.fillStyle(0xffcc88, 0.8);
    g.fillRect(-s * 0.2, -s * 0.8, s * 0.4, s * 1.6);
    g.fillCircle(-s * 0.4, -s * 0.7, s * 0.38);
    g.fillCircle(s * 0.4, -s * 0.7, s * 0.38);
    g.fillCircle(-s * 0.4, s * 0.7, s * 0.38);
    g.fillCircle(s * 0.4, s * 0.7, s * 0.38);
  }

  private spawnPawPrintDecorations(): void {
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics().setDepth(3).setAlpha(0.35);
      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const y = Phaser.Math.Between(-300, GAME_HEIGHT);
      this.drawPawPrint(g);
      g.setPosition(x, y);
      this.pawPrints.push({ gfx: g, x, y, speed: Phaser.Math.Between(22, 44) });
    }
  }

  private drawPawPrint(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.fillStyle(0xffd700, 0.8);
    g.fillEllipse(0, 4, 18, 14);
    g.fillCircle(-9, -6, 5);
    g.fillCircle(-3, -10, 5);
    g.fillCircle(3, -10, 5);
    g.fillCircle(9, -6, 5);
  }

  private updateDecorations(delta: number): void {
    this.floatingBones.forEach(b => {
      b.y += b.speed * (delta / 1000);
      b.gfx.setPosition(b.x, b.y);
      if (b.y > GAME_HEIGHT + 60) { b.y = -60; b.x = Phaser.Math.Between(20, GAME_WIDTH - 20); }
    });
    this.pawPrints.forEach(p => {
      p.y += p.speed * (delta / 1000);
      p.gfx.setPosition(p.x, p.y);
      if (p.y > GAME_HEIGHT + 60) { p.y = -60; p.x = Phaser.Math.Between(20, GAME_WIDTH - 20); }
    });
  }

  // ─── プレイヤー弾更新（vx対応）─────────────────────

  private updatePlayerBullets(delta: number): void {
    const bullets = this.player.bullets.getChildren() as any[];
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.active) continue;
      b.x += (b.vx || 0) * (delta / 1000);
      b.y += b.vy * (delta / 1000);
      if (b.y < -50 || b.x < -50 || b.x > GAME_WIDTH + 50) {
        b.destroy();
        this.player.bullets.remove(b, true, true);
      }
    }
  }

  // ─── 当たり判定 ────────────────────────────────────

  private checkPlayerBulletsVsEnemies(): void {
    const bullets = this.player.bullets.getChildren() as any[];
    const enemies = this.spawner.enemies;
    const mult = this.getScoreMultiplier();

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
            const earned = e.score * mult;
            this.player.score += earned;

            // 倍率適用時は得点テキスト表示
            if (mult > 1) this.showFloatingText(e.x, e.y - 20, `+${earned}`, 0xffdd00);

            this.createExplosion(e.x, e.y, 'medium');

            // アイテムドロップ判定
            if (Math.random() < this.getDropRate()) {
              this.spawnBoneItem(e.x, e.y);
            }

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
    const mult = this.getScoreMultiplier();

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
        this.cameras.main.shake(60, 0.005);

        if (this.boss.hp <= 0) {
          this.triggerBossDefeat(mult);
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
    const maxR  = size === 'small' ? 45 : size === 'medium' ? 90 : 180;
    const colors = this.superModeActive
      ? [0xffd700, 0xffcc00, 0xff8800, 0xffffff, 0xffee44] // スーパーモード時はゴールド
      : [0xff8800, 0xffcc00, 0xff4400, 0xffffff, 0xff6600];

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
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
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

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(100);

    this.tweens.add({
      targets: overlay,
      alpha: 0.88,
      duration: 130,
      onComplete: () => {
        const faceC = this.add.container(cx, cy + 40).setDepth(101).setScale(0.01);
        const face = this.add.graphics();

        face.fillStyle(0xdd7700);
        face.fillCircle(0, 0, 95);
        face.fillStyle(0xffcc88);
        face.fillEllipse(0, 25, 110, 75);

        face.fillStyle(0xcc6600);
        face.fillTriangle(-95, -30, -55, -30, -80, -115);
        face.fillTriangle(95, -30, 55, -30, 80, -115);
        face.fillStyle(0xff9999, 0.7);
        face.fillTriangle(-88, -35, -62, -35, -77, -100);
        face.fillTriangle(88, -35, 62, -35, 77, -100);

        face.fillStyle(0x000000);
        face.fillCircle(-36, -22, 22);
        face.fillCircle(36, -22, 22);
        face.fillStyle(0xffffff);
        face.fillCircle(-27, -30, 9);
        face.fillCircle(45, -30, 9);
        face.fillStyle(0xffffff, 0.6);
        face.fillCircle(-24, -26, 4.5);
        face.fillCircle(48, -26, 4.5);

        face.fillStyle(0x111111);
        face.fillEllipse(0, 14, 28, 18);
        face.fillStyle(0x444444, 0.5);
        face.fillCircle(-4, 12, 6);

        face.fillStyle(0x880000);
        face.fillEllipse(0, 45, 70, 42);
        face.fillStyle(0xffaaaa);
        face.fillEllipse(0, 48, 60, 32);
        face.fillStyle(0xff5588);
        face.fillEllipse(0, 60, 38, 26);
        face.fillStyle(0xff88aa, 0.5);
        face.fillEllipse(-4, 58, 16, 14);

        face.fillStyle(0xff8866, 0.38);
        face.fillCircle(-72, 16, 22);
        face.fillCircle(72, 16, 22);

        faceC.add(face);

        const barkTxt = this.add.text(cx, cy - 150, 'ワフッ！', {
          fontSize: '72px',
          fontFamily: 'Arial Black, sans-serif',
          color: '#ffdd00',
          stroke: '#884400',
          strokeThickness: 10,
        }).setOrigin(0.5).setAlpha(0).setDepth(102);

        this.tweens.add({ targets: faceC, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
        this.tweens.add({ targets: barkTxt, alpha: 1, y: cy - 170, duration: 220, ease: 'Back.Out' });

        this.audio.playBark();

        this.time.delayedCall(280, () => {
          this.tweens.add({ targets: faceC, angle: 12, duration: 70, yoyo: true, repeat: 4 });
        });

        this.time.delayedCall(500, () => { this.executeBombDamage(); });

        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: [overlay, faceC, barkTxt],
            alpha: 0,
            duration: 320,
            onComplete: () => { overlay.destroy(); faceC.destroy(); barkTxt.destroy(); },
          });
        });
      },
    });
  }

  private executeBombDamage(): void {
    this.hud.updateBombs(this.player.bombs);
    this.audio.playBomb();
    this.cameras.main.shake(400, 0.022);

    const mult = this.getScoreMultiplier();
    const enemies = [...this.spawner.enemies];
    enemies.forEach(e => {
      this.createExplosion(e.x, e.y, 'medium');
      e.takeDamage(10);
    });
    for (let i = this.spawner.enemies.length - 1; i >= 0; i--) {
      if (this.spawner.enemies[i].hp <= 0) {
        this.player.score += this.spawner.enemies[i].score * mult;
        this.spawner.destroyEnemy(i);
      }
    }

    if (this.boss && !this.boss.isDefeated) {
      this.boss.takeDamage(25);
      if (this.boss.hp <= 0) this.triggerBossDefeat(mult);
    }

    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff).setDepth(80);
    this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });

    for (let r = 0; r < 3; r++) {
      const ring = this.add.graphics();
      ring.lineStyle(3 - r * 0.5, 0x88eeff, 0.9);
      ring.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 10);
      ring.setDepth(81);
      this.tweens.add({
        targets: ring, scaleX: 45, scaleY: 28, alpha: 0,
        duration: 700 + r * 180,
        onComplete: () => ring.destroy(),
      });
    }

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

  private triggerBossDefeat(scoreMult: number = 1): void {
    if (!this.boss || this.gameEnded) return;
    this.boss.isDefeated = true;
    this.audio.stopBGM();

    // ── ヒットストップ（0.25秒）
    this.hitstopActive = true;
    this.cameras.main.shake(120, 0.025);

    const hitFlash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.95).setDepth(90);

    this.time.delayedCall(250, () => {
      this.hitstopActive = false;
      this.gameEnded = true;

      this.tweens.add({ targets: hitFlash, alpha: 0, duration: 300, onComplete: () => hitFlash.destroy() });

      const bossScore = BOSS_SCORE * scoreMult;
      this.player.score += bossScore;
      this.showFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, `BOSS DEFEATED! +${bossScore.toLocaleString()}`, 0xffd700);

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
