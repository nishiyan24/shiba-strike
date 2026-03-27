import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Boss } from '../objects/Boss';
import { BossVacuum } from '../objects/BossVacuum';
import { BossThunder } from '../objects/BossThunder';
import { HUD } from '../ui/HUD';
import { BossHealthBar } from '../ui/BossHealthBar';
import { EnemySpawner } from '../systems/EnemySpawner';
import { AudioManager } from '../systems/AudioManager';
import {
  GAME_WIDTH, GAME_HEIGHT,
  BOSS_APPEAR_TIME, BOSS_SCORE, BOSS_VACUUM_HP, BOSS_THUNDER_HP,
  SCORE_MULT_STAGE0, SCORE_MULT_STAGE1, SCORE_MULT_STAGE2,
  DROP_RATE_STAGE0, DROP_RATE_STAGE1, DROP_RATE_STAGE2,
  STAGE_ENEMY_SPEED_MULT, STAGE_ENEMY_BULLET_MULT,
} from '../config';

// ボスのユニオン型
type AnyBoss = Boss | BossVacuum | BossThunder;

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

interface LifeItem {
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  speed: number;
  bobTimer: number;
}

export class GameScene extends Phaser.Scene {
  public player!: Player;
  private hud!: HUD;
  private bossHpBar!: BossHealthBar;
  private spawner!: EnemySpawner;
  private boss: AnyBoss | null = null;
  private audio!: AudioManager;

  // 全3ステージ管理
  private stageNumber: number = 1;   // 1, 2, 3
  private carryScore: number = 0;    // ステージ間引き継ぎスコア
  private carryLives: number = 3;
  private carryBombs: number = 3;

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
  private lifeItems: LifeItem[] = [];
  private lifeItemSpawnedStage2: boolean = false;
  private lifeItemSpawnedStage3: boolean = false;

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

  init(data: { stageNumber?: number; score?: number; lives?: number; bombs?: number }): void {
    this.stageNumber = data.stageNumber ?? 1;
    this.carryScore  = data.score  ?? 0;
    this.carryLives  = data.lives  ?? 3;
    this.carryBombs  = data.bombs  ?? 3;
  }

  create(): void {
    this.elapsed = 0;
    this.bossSpawned = false;
    this.gameEnded = false;
    this.hitstopActive = false;
    this.lifeItems = [];
    this.lifeItemSpawnedStage2 = false;
    this.lifeItemSpawnedStage3 = false;
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
    // ステージ間引き継ぎ
    this.player.score = this.carryScore;
    this.player.lives = this.carryLives;
    this.player.bombs = this.carryBombs;

    this.spawner = new EnemySpawner(this);
    // ステージ別敵速度倍率を設定
    const si = this.stageNumber - 1;
    this.spawner.setStageMultipliers(
      STAGE_ENEMY_SPEED_MULT[si] ?? 1.0,
      STAGE_ENEMY_BULLET_MULT[si] ?? 1.0
    );
    this.audio = new AudioManager(this);

    this.hud = new HUD(this);
    this.bossHpBar = new BossHealthBar(this);
    this.bossHpBar.hide();
    // ステージ引き継ぎ値でHUDを初期同期
    this.hud.updateLives(this.player.lives);
    this.hud.updateBombs(this.player.bombs);
    this.hud.updateScore(this.player.score);

    this.player.onShoot  = () => this.audio.playShoot();
    this.player.onBomb   = () => this.showShibaBombCutscene();
    this.player.onDamage = () => {
      this.audio.playDamage();
      this.cameras.main.shake(220, 0.012);
      this.hud.updateLives(this.player.lives);
      if (this.player.lives <= 0) this.triggerGameOver();
    };

    const bossWarningMessages = [
      '⚠ 全自動シャンプーマシン 接近中 ⚠',
      '⚠ 高性能掃除機マシーン 起動 ⚠',
      '⚠ 超雷神 降臨 ⚠',
    ];
    const bossWarningColors = ['#ff4488', '#ff8800', '#ffee00'];
    const bossWarningMsg = bossWarningMessages[this.stageNumber - 1] ?? bossWarningMessages[0];
    const bossWarningColor = bossWarningColors[this.stageNumber - 1] ?? bossWarningColors[0];

    this.bossWarningText = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      bossWarningMsg,
      {
        fontSize: '22px',
        fontFamily: 'Arial Black, sans-serif',
        color: bossWarningColor,
        stroke: '#440000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setAlpha(0).setDepth(95);

    // ステージ番号バナー表示
    this.time.delayedCall(100, () => this.showStageBanner());

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
    this.updateLifeItems(delta);
    this.checkLifeItemSpawn();

    // プレイヤー強化状態に応じてスポーン・ボス倍率を更新
    const powerMult = this.superModeActive ? 2.0 : this.player.powerLevel >= 1 ? 1.5 : 1.0;
    this.spawner.spawnRateMultiplier = powerMult;
    if (this.boss) this.boss.playerPowerMult = powerMult;

    // Stage 2: 吸引ギミック — プレイヤーをボスへ引き寄せる
    if (this.boss instanceof BossVacuum && this.boss.isSucking && !this.player.isInvincible) {
      const strength = this.boss.suctionStrength;
      const dx = this.boss.x - this.player.x;
      const dy = this.boss.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      // 近いほど強くなる吸引力
      const force = strength * (1 - Math.min(dist, 400) / 400) + strength * 0.3;
      const nx = dx / dist;
      const ny = dy / dist;
      this.player.x += nx * force * (delta / 1000);
      this.player.y += ny * force * (delta / 1000);
      // 下キー押しっぱなしで一部抵抗
      const cursors = this.player.getCursors?.();
      if (cursors?.down?.isDown) {
        this.player.y += force * 0.55 * (delta / 1000);
      }
      // 画面内クランプ
      this.player.x = Phaser.Math.Clamp(this.player.x, 24, GAME_WIDTH - 24);
      this.player.y = Phaser.Math.Clamp(this.player.y, 24, GAME_HEIGHT - 24);
    }

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

  // ステージ開始バナー表示
  private showStageBanner(): void {
    const labels = ['', 'STAGE 1', 'STAGE 2', 'STAGE 3 — FINAL'];
    const colors = ['', '#00ccff', '#ff8800', '#ff2244'];
    const subs = ['', 'シャンプーマシンを倒せ！', '掃除機マシーンが迫る！', '超雷神 — 最後の戦い！'];
    const label = labels[this.stageNumber] ?? `STAGE ${this.stageNumber}`;
    const color = colors[this.stageNumber] ?? '#ffffff';
    const sub = subs[this.stageNumber] ?? '';

    const cx = GAME_WIDTH / 2;
    const t = this.add.text(cx, GAME_HEIGHT / 2 - 30, label, {
      fontSize: '48px',
      fontFamily: 'Arial Black, sans-serif',
      color,
      stroke: '#000000',
      strokeThickness: 7,
    }).setOrigin(0.5).setAlpha(0).setDepth(96).setScale(0.4);

    const s = this.add.text(cx, GAME_HEIGHT / 2 + 30, sub, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(96);

    this.tweens.add({
      targets: t,
      scaleX: 1, scaleY: 1, alpha: 1,
      duration: 500, ease: 'Back.Out',
    });
    this.tweens.add({ targets: s, alpha: 1, duration: 400, delay: 200 });

    this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: [t, s], alpha: 0, y: '-=30', duration: 500,
        onComplete: () => { t.destroy(); s.destroy(); } });
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

  // ─────────────────────────────────────────────────
  //  1UP ライフアイテム
  // ─────────────────────────────────────────────────

  /** ステージ・elapsed に応じて1UPを自動スポーン */
  private checkLifeItemSpawn(): void {
    if (this.bossSpawned || this.gameEnded) return;

    // Stage 2 : おやつ銀河の終わり際（elapsed 36000ms）
    if (this.stageNumber === 2 && !this.lifeItemSpawnedStage2 && this.elapsed >= 36000) {
      this.lifeItemSpawnedStage2 = true;
      // 少し間をおいてから落としてくる（唐突感を和らげる）
      this.time.delayedCall(600, () => this.spawnLifeItem());
    }

    // Stage 3 : 道中中盤（elapsed 30000ms）に1UP
    if (this.stageNumber === 3 && !this.lifeItemSpawnedStage3 && this.elapsed >= 30000) {
      this.lifeItemSpawnedStage3 = true;
      this.time.delayedCall(600, () => this.spawnLifeItem());
    }
  }

  /** 1UPアイテムをランダムX座標からスポーン */
  private spawnLifeItem(): void {
    if (this.gameEnded) return;

    const spawnX = Phaser.Math.Between(60, GAME_WIDTH - 60);
    const spawnY = -50;

    // ── アイコン本体（柴犬顔）──────────────────────
    const g = this.add.graphics().setDepth(24);
    this.drawLifeItemIcon(g);
    g.setPosition(spawnX, spawnY);

    // ── 緑グロウリング（外枠）──────────────────────
    const glow = this.add.graphics().setDepth(23);
    glow.fillStyle(0x00ff88, 0.12);
    glow.fillCircle(0, 0, 32);
    glow.fillStyle(0x00ff88, 0.08);
    glow.fillCircle(0, 0, 42);
    glow.lineStyle(2.5, 0x00ff88, 0.75);
    glow.strokeCircle(0, 0, 26);
    glow.lineStyle(1, 0xaaffcc, 0.4);
    glow.strokeCircle(0, 0, 30);
    glow.setPosition(spawnX, spawnY);

    // ── "1UP" ラベル ────────────────────────────────
    const label = this.add.text(spawnX, spawnY - 36, '1UP', {
      fontSize: '15px',
      fontFamily: '"Arial Black", Impact, sans-serif',
      color: '#00ff88',
      stroke: '#003322',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25);

    // ── 脈動アニメーション ──────────────────────────
    this.tweens.add({
      targets: [g, glow],
      scaleX: 1.15, scaleY: 1.15,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // ── スポーン出現サークル ─────────────────────────
    const ring = this.add.graphics().setDepth(26);
    ring.lineStyle(3, 0x00ffaa, 0.9);
    ring.strokeCircle(spawnX, spawnY, 8);
    this.tweens.add({
      targets: ring,
      scaleX: 4, scaleY: 4,
      alpha: 0,
      duration: 500,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy(),
    });

    this.lifeItems.push({
      gfx: g,
      label,
      x: spawnX,
      y: spawnY,
      speed: 68,
      bobTimer: 0,
    });

    // glowは別途ライフアイテムと同期させるため、gfxに紐付けする
    (g as any)._glow = glow;
  }

  /** 柴犬ライフアイコン（HUDと同一デザイン、ゲームフィールドサイズ版）*/
  private drawLifeItemIcon(g: Phaser.GameObjects.Graphics): void {
    // ソフトグロウ背景
    g.fillStyle(0xff8800, 0.1);
    g.fillCircle(0, 0, 22);

    // 頭（柴犬オレンジ）
    g.fillStyle(0xdd7700);
    g.fillCircle(0, 0, 16);

    // マズル
    g.fillStyle(0xffcc88);
    g.fillEllipse(0, 5, 19, 13);

    // 目（黒）
    g.fillStyle(0x111111);
    g.fillCircle(-4.5, -3, 3.5);
    g.fillCircle(4.5, -3, 3.5);
    // 目の白ハイライト
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-3.2, -4.5, 1.5);
    g.fillCircle(5.8, -4.5, 1.5);

    // 鼻
    g.fillStyle(0x221100);
    g.fillEllipse(0, 2, 6, 4.5);
    // 鼻ハイライト
    g.fillStyle(0x554422, 0.5);
    g.fillCircle(-0.5, 1.5, 1.2);

    // 口
    g.lineStyle(1.2, 0x553300, 0.8);
    g.beginPath();
    g.arc(0, 5, 4.5, 0.3, Math.PI - 0.3, false);
    g.strokePath();

    // ほほ
    g.fillStyle(0xff9988, 0.3);
    g.fillCircle(-11, 2, 7);
    g.fillCircle(11, 2, 7);

    // 耳（三角）
    g.fillStyle(0xcc6600);
    g.fillTriangle(-18, -10, -9, -12, -14, -24);
    g.fillTriangle(18, -10, 9, -12, 14, -24);
    // 耳内ピンク
    g.fillStyle(0xff9999, 0.7);
    g.fillTriangle(-16, -10, -10, -11, -14, -20);
    g.fillTriangle(16, -10, 10, -11, 14, -20);

    // 外枠リング（ヘルメット風）
    g.lineStyle(2, 0xeeeeff, 0.4);
    g.strokeCircle(0, 0, 16);
  }

  /** ライフアイテムの移動・接触判定・削除 */
  private updateLifeItems(delta: number): void {
    for (let i = this.lifeItems.length - 1; i >= 0; i--) {
      const item = this.lifeItems[i];

      // 落下
      item.y += item.speed * (delta / 1000);
      // 横ゆらゆら（サインカーブ）
      item.bobTimer += delta;
      const wobble = Math.sin(item.bobTimer / 500) * 18;

      item.gfx.setPosition(item.x + wobble, item.y);
      (item.gfx as any)._glow?.setPosition(item.x + wobble, item.y);
      item.label.setPosition(item.x + wobble, item.y - 36);

      // 画面外 → 削除
      if (item.y > GAME_HEIGHT + 60) {
        item.gfx.destroy();
        (item.gfx as any)._glow?.destroy();
        item.label.destroy();
        this.lifeItems.splice(i, 1);
        continue;
      }

      // プレイヤーとの接触判定
      const dx = (item.x + wobble) - this.player.x;
      const dy = item.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 34) {
        const px = item.x + wobble;
        const py = item.y;
        item.gfx.destroy();
        (item.gfx as any)._glow?.destroy();
        item.label.destroy();
        this.lifeItems.splice(i, 1);
        this.onPickupLife(px, py);
      }
    }
  }

  /** 1UP取得処理 & キラキラVFX */
  private onPickupLife(x: number, y: number): void {
    const wasAtMax = this.player.lives >= 3; // PLAYER_MAX_LIVES
    this.player.addLife();
    this.hud.updateLives(this.player.lives);

    // ── 1. 効果音（明るいファンファーレ）──────────────
    try {
      const ctx = new AudioContext();
      const notes = wasAtMax
        ? [784, 1047]          // 上限時: 短い2音
        : [523, 659, 784, 1047]; // 通常: 4音昇り
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.15);
        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.18);
      });
    } catch { /* ignore */ }

    // ── 2. 衝撃波グリーンリング ───────────────────────
    for (let r = 0; r < 2; r++) {
      const ring = this.add.graphics().setDepth(66);
      ring.lineStyle(3 - r, 0x00ff88, 0.85 - r * 0.25);
      ring.strokeCircle(x, y, 10 + r * 6);
      this.tweens.add({
        targets: ring,
        scaleX: 5 + r * 2, scaleY: 5 + r * 2,
        alpha: 0,
        duration: 400 + r * 80,
        delay: r * 60,
        ease: 'Quad.Out',
        onComplete: () => ring.destroy(),
      });
    }

    // ── 3. 星形スパーク（12方向）─────────────────────
    const sparkColors = [0x00ff88, 0x88ffcc, 0xffffff, 0x00ffaa, 0xaaffdd];
    for (let i = 0; i < 14; i++) {
      const angle  = (Math.PI * 2 * i) / 14;
      const speed  = Phaser.Math.Between(40, 90);
      const color  = sparkColors[i % sparkColors.length];
      const isLong = i % 2 === 0;

      const spark = this.add.graphics().setDepth(65);
      spark.fillStyle(color, 1.0);
      if (isLong) {
        // 細長い星芒
        spark.fillTriangle(-2, -8, 0, 0, 2, -8);
        spark.fillCircle(0, 0, 2.5);
      } else {
        // 丸いスパーク
        spark.fillCircle(0, 0, 3.5);
        spark.fillStyle(0xffffff, 0.6);
        spark.fillCircle(-0.5, -0.5, 1.5);
      }
      spark.x = x; spark.y = y;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2, scaleY: 0.2,
        rotation: angle + Math.PI,
        duration: Phaser.Math.Between(320, 560),
        ease: 'Quad.Out',
        onComplete: () => spark.destroy(),
      });
    }

    // ── 4. コアフラッシュ（緑白）────────────────────
    const flash = this.add.graphics().setDepth(67);
    flash.fillStyle(0xffffff, 0.85);
    flash.fillCircle(x, y, 22);
    flash.fillStyle(0x00ff88, 0.5);
    flash.fillCircle(x, y, 16);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.4, scaleY: 2.4,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    });

    // ── 5. 浮遊テキスト ──────────────────────────────
    const msg  = wasAtMax ? '💚 LIFE MAX!' : '💚 +1 LIFE!';
    const col  = wasAtMax ? 0xffdd00 : 0x00ff88;
    this.showFloatingText(x, y - 10, msg, col);

    // ── 6. HUD ライフ点滅（取得感強調）───────────────
    this.cameras.main.flash(120, 0, 255, 100);
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
      // 柱弾（雷神の落雷）の当たり判定
      if (b.isPillar) {
        const inX = Math.abs(b.x - this.player.x) < 18;
        const inY = this.player.y >= b.y && this.player.y <= b.y + GAME_HEIGHT;
        if (inX && inY) {
          b.destroy(); this.boss.bullets.remove(b, true, true);
          this.player.takeDamage();
          this.cameras.main.flash(120, 255, 255, 100);
        }
        continue;
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
    const isSuper = this.superModeActive;

    // ── サイズ設定 ─────────────────────────────────
    const cfg = {
      small:  { sparks: 10, debris: 5,  embers: 4,  maxR: 55,  smoke: 2 },
      medium: { sparks: 18, debris: 10, embers: 8,  maxR: 100, smoke: 4 },
      large:  { sparks: 32, debris: 18, embers: 14, maxR: 200, smoke: 7 },
    }[size];

    const coreColors = isSuper
      ? [0xffd700, 0xffcc00, 0xffee44, 0xffffff, 0xff9900]
      : [0xff8800, 0xff5500, 0xffcc00, 0xff3300, 0xffffff];
    const emberColors = isSuper
      ? [0xffdd00, 0xff8800, 0xffffff]
      : [0xff4400, 0xff8800, 0xffcc00];

    const depth = 50;

    // ─── 1. 衝撃波リング（外側へ拡張して消える）──────
    const ringCount = size === 'small' ? 1 : size === 'medium' ? 2 : 3;
    for (let r = 0; r < ringCount; r++) {
      const ring = this.add.graphics();
      const startR = 8 + r * 10;
      const endR   = (size === 'small' ? 50 : size === 'medium' ? 90 : 160) + r * 20;
      const ringCol = isSuper ? 0xffdd44 : 0xff6600;
      ring.lineStyle(3 - r * 0.5, ringCol, 0.85 - r * 0.2);
      ring.strokeCircle(x, y, startR);
      ring.setDepth(depth + 3);
      this.tweens.add({
        targets: ring,
        scaleX: endR / startR,
        scaleY: endR / startR,
        alpha: 0,
        duration: 220 + r * 60,
        delay: r * 35,
        ease: 'Quad.Out',
        onComplete: () => ring.destroy(),
      });
    }

    // ─── 2. コアフラッシュ（白熱光）──────────────────
    const flashR = size === 'small' ? 20 : size === 'medium' ? 42 : 85;
    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 1.0);
    flash.fillCircle(x, y, flashR);
    flash.setDepth(depth + 4);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.5, scaleY: 2.5,
      duration: 180,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy(),
    });

    // ─── 3. コアグロウ（フラッシュの後に残る橙の球）──
    const glow = this.add.graphics();
    const glowR = size === 'small' ? 14 : size === 'medium' ? 28 : 55;
    const glowCol = isSuper ? 0xffcc00 : 0xff6600;
    glow.fillStyle(glowCol, 0.65);
    glow.fillCircle(x, y, glowR);
    glow.fillStyle(glowCol, 0.25);
    glow.fillCircle(x, y, glowR * 1.7);
    glow.setDepth(depth + 2);
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scaleX: 1.8, scaleY: 1.8,
      duration: 350,
      delay: 50,
      ease: 'Quad.Out',
      onComplete: () => glow.destroy(),
    });

    // ─── 4. スパーク（速い小粒子）────────────────────
    for (let i = 0; i < cfg.sparks; i++) {
      const angle = (Math.PI * 2 * i) / cfg.sparks + Phaser.Math.FloatBetween(-0.3, 0.3);
      const speed = Phaser.Math.Between(50, cfg.maxR);
      const color = coreColors[i % coreColors.length];
      const r     = Phaser.Math.Between(2, size === 'large' ? 5 : 4);
      const spark = this.add.graphics();
      spark.fillStyle(color, 1.0);
      spark.fillCircle(0, 0, r);
      // 先端グロウ
      spark.fillStyle(0xffffff, 0.5);
      spark.fillCircle(0, 0, Math.max(1, r - 1));
      spark.x = x; spark.y = y;
      spark.setDepth(depth + 1);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2, scaleY: 0.2,
        duration: Phaser.Math.Between(250, 500),
        ease: 'Quad.Out',
        onComplete: () => spark.destroy(),
      });
    }

    // ─── 5. デブリ（遅い大きめの欠片）────────────────
    for (let i = 0; i < cfg.debris; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(20, cfg.maxR * 0.55);
      const color = coreColors[Math.floor(Math.random() * coreColors.length)];
      const w = Phaser.Math.Between(3, 7);
      const h = Phaser.Math.Between(3, 7);
      const deb = this.add.graphics();
      deb.fillStyle(color, 0.9);
      deb.fillRect(-w / 2, -h / 2, w, h);
      deb.x = x; deb.y = y;
      deb.setDepth(depth);
      this.tweens.add({
        targets: deb,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        rotation: Phaser.Math.FloatBetween(-Math.PI * 2, Math.PI * 2),
        duration: Phaser.Math.Between(350, 700),
        ease: 'Sine.Out',
        onComplete: () => deb.destroy(),
      });
    }

    // ─── 6. エンバー（長く輝く余燼）──────────────────
    for (let i = 0; i < cfg.embers; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(15, cfg.maxR * 0.4);
      const color = emberColors[i % emberColors.length];
      const ember = this.add.graphics();
      ember.fillStyle(color, 1.0);
      ember.fillCircle(0, 0, Phaser.Math.Between(1, 3));
      ember.x = x; ember.y = y;
      ember.setDepth(depth - 1);
      const dur = Phaser.Math.Between(500, 900);
      this.tweens.add({
        targets: ember,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed + 20,
        alpha: 0,
        scaleX: 0.4, scaleY: 0.4,
        duration: dur,
        delay: Phaser.Math.Between(80, 200),
        ease: 'Sine.In',
        onComplete: () => ember.destroy(),
      });
    }

    // ─── 7. スモークパフ（大爆発のみ）────────────────
    for (let i = 0; i < cfg.smoke; i++) {
      const dx = Phaser.Math.Between(-20, 20);
      const dy = Phaser.Math.Between(-20, 10);
      const sr = size === 'large' ? Phaser.Math.Between(18, 32) : Phaser.Math.Between(10, 18);
      const smoke = this.add.graphics();
      smoke.fillStyle(0x555566, 0.3);
      smoke.fillCircle(x + dx, y + dy, sr);
      smoke.fillStyle(0x777788, 0.15);
      smoke.fillCircle(x + dx + 5, y + dy - 5, sr * 0.7);
      smoke.setDepth(depth - 2);
      this.tweens.add({
        targets: smoke,
        alpha: 0,
        scaleX: 2.2, scaleY: 2.2,
        y: (smoke.y ?? 0) - 20,
        duration: Phaser.Math.Between(500, 900),
        delay: Phaser.Math.Between(0, 150),
        ease: 'Sine.Out',
        onComplete: () => smoke.destroy(),
      });
    }
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

    // 「STAGE BOSS」大テキスト
    const stageBossText = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50,
      'STAGE BOSS',
      {
        fontSize: '52px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ff0000',
        stroke: '#440000',
        strokeThickness: 8,
      }
    ).setOrigin(0.5).setAlpha(0).setDepth(96).setScale(0.2);

    this.tweens.add({
      targets: stageBossText,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 300,
      ease: 'Back.Out',
    });
    // 点滅後に消える
    this.time.delayedCall(400, () => {
      this.tweens.add({
        targets: stageBossText,
        alpha: 0,
        duration: 200,
        yoyo: true,
        repeat: 5,
        onComplete: () => stageBossText.destroy(),
      });
    });

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
    // ステージによってボスを切り替え
    switch (this.stageNumber) {
      case 2:
        this.boss = new BossVacuum(this, BOSS_VACUUM_HP);
        break;
      case 3:
        this.boss = new BossThunder(this, BOSS_THUNDER_HP);
        break;
      default:
        this.boss = new Boss(this);
        break;
    }
    // ボス名をHPバーに反映
    const bossNames = ['シャンプーマシン', '高性能掃除機', '超雷神 — FINAL'];
    this.bossHpBar.setName(bossNames[this.stageNumber - 1] ?? 'BOSS');
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
          if (this.stageNumber >= 3) {
            // ラスボス撃破 → 暗転してEndingScene
            this.cameras.main.fade(800, 0, 0, 0, false, (_: unknown, progress: number) => {
              if (progress === 1) this.scene.start('EndingScene', { score: this.player.score });
            });
          } else {
            // Stage 1/2 クリア → ClearScene（スコア・ライフ引き継ぎ）
            this.scene.start('ClearScene', {
              stageNumber: this.stageNumber,
              score: this.player.score,
              lives: this.player.lives,
              bombs: this.player.bombs,
            });
          }
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
