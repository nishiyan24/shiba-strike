import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Enemy } from '../objects/Enemy';
import { Boss } from '../objects/Boss';
import { HUD } from '../ui/HUD';
import { BossHealthBar } from '../ui/BossHealthBar';
import { EnemySpawner } from '../systems/EnemySpawner';
import { AudioManager } from '../systems/AudioManager';
import { GAME_WIDTH, GAME_HEIGHT, BOSS_APPEAR_TIME, BOSS_SCORE } from '../config';

// GameScene: メインゲームシーン
export class GameScene extends Phaser.Scene {
  public player!: Player;
  private hud!: HUD;
  private bossHpBar!: BossHealthBar;
  private spawner!: EnemySpawner;
  private boss: Boss | null = null;
  private audio!: AudioManager;

  // 背景レイヤー（パララックス）
  private starLayers: Array<{ gfx: Phaser.GameObjects.Graphics; speed: number; stars: Array<{x: number; y: number; r: number; a: number}> }> = [];
  private planets: Phaser.GameObjects.Graphics[] = [];

  private elapsed: number = 0;
  private bossSpawned: boolean = false;
  private gameEnded: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.elapsed = 0;
    this.bossSpawned = false;
    this.gameEnded = false;
    this.boss = null;

    // 背景
    this.createStarfield();
    this.createPlanets();

    // ゲームオブジェクト
    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 100);
    this.spawner = new EnemySpawner(this);
    this.audio = new AudioManager(this);

    // UI
    this.hud = new HUD(this);
    this.bossHpBar = new BossHealthBar(this);
    this.bossHpBar.hide();

    // プレイヤーコールバック設定
    this.player.onShoot = () => this.audio.playShoot();
    this.player.onBomb = () => this.activateBomb();
    this.player.onDamage = () => {
      this.audio.playDamage();
      this.cameras.main.shake(200, 0.01);
      this.hud.updateLives(this.player.lives);
      if (this.player.lives <= 0) this.triggerGameOver();
    };

    // BGM開始
    this.audio.resume();
    this.audio.startBGM();

    // ボス警告テキスト（非表示で待機）
    this.bossWarningSetup();
  }

  update(_time: number, delta: number): void {
    if (this.gameEnded) return;

    this.elapsed += delta;

    // 背景スクロール
    this.updateStarfield(delta);

    // プレイヤー更新
    this.player.update(delta);

    // プレイヤー弾更新
    this.updatePlayerBullets(delta);

    // ボス出現前：敵スポーン
    if (!this.bossSpawned) {
      this.spawner.update(delta);

      // ボス出現タイミング
      if (this.elapsed >= BOSS_APPEAR_TIME) {
        this.triggerBossAppearance();
      }
    }

    // 通常敵との当たり判定
    this.checkPlayerBulletsVsEnemies();
    this.checkEnemyBulletsVsPlayer();
    this.checkEnemiesVsPlayer();

    // ボス更新・当たり判定
    if (this.boss) {
      this.boss.update(delta);
      this.checkPlayerBulletsVsBoss();
      this.checkBossBulletsVsPlayer();
      this.bossHpBar.update(this.boss.hp, this.boss.maxHp);
    }

    // HUD更新
    this.hud.updateScore(this.player.score);
    this.hud.updateBombs(this.player.bombs);
  }

  // ─── 背景生成 ─────────────────────────────────────

  private createStarfield(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000011);

    // 3レイヤーで奥行き感を演出
    const speeds = [20, 50, 100];
    const counts = [80, 40, 20];
    const sizes = [0.8, 1.2, 2.0];

    speeds.forEach((speed, li) => {
      const stars: Array<{x: number; y: number; r: number; a: number}> = [];
      for (let i = 0; i < counts[li]; i++) {
        stars.push({
          x: Phaser.Math.Between(0, GAME_WIDTH),
          y: Phaser.Math.Between(0, GAME_HEIGHT),
          r: Phaser.Math.FloatBetween(sizes[li] * 0.5, sizes[li]),
          a: Phaser.Math.FloatBetween(0.3, 1.0),
        });
      }
      const gfx = this.add.graphics();
      gfx.setDepth(0);
      this.starLayers.push({ gfx, speed, stars });
    });

    this.renderStarLayers();
  }

  private renderStarLayers(): void {
    this.starLayers.forEach(layer => {
      layer.gfx.clear();
      layer.stars.forEach(s => {
        layer.gfx.fillStyle(0xffffff, s.a);
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

  private createPlanets(): void {
    // 遠方の惑星（装飾）
    const pg = this.add.graphics();
    pg.setDepth(1);
    // 大きな惑星（左上）
    pg.fillStyle(0x334466, 0.6);
    pg.fillCircle(60, 200, 45);
    pg.fillStyle(0x223355, 0.4);
    pg.fillEllipse(60, 200, 100, 15); // リング
    // 小さな惑星（右）
    pg.fillStyle(0x443322, 0.5);
    pg.fillCircle(420, 500, 25);
    this.planets.push(pg);
  }

  // ─── プレイヤー弾の更新 ────────────────────────────

  private updatePlayerBullets(delta: number): void {
    const bullets = this.player.bullets.getChildren() as any[];
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.active) continue;
      b.y += b.vy * (delta / 1000);
      if (b.y < -20) {
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
        if (Math.sqrt(dx * dx + dy * dy) < 22) {
          // 命中
          this.createExplosion(e.x, e.y, 'small');
          this.audio.playExplosion();
          b.destroy();
          this.player.bullets.remove(b, true, true);

          const killed = e.takeDamage(1);
          if (killed) {
            this.player.score += e.score;
            this.createExplosion(e.x, e.y, 'medium');
            this.spawner.destroyEnemy(ei);
          }
          break;
        }
      }
    }
  }

  private checkEnemyBulletsVsPlayer(): void {
    if (this.player.isInvincible) return;

    this.spawner.enemies.forEach(e => {
      const bullets = e.bullets.getChildren() as any[];
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b.active) continue;

        // 弾の移動
        b.x += (b.vx || 0) * (1 / 60);
        b.y += (b.vy || 0) * (1 / 60);

        // 画面外削除
        if (b.y > GAME_HEIGHT + 20 || b.x < -20 || b.x > GAME_WIDTH + 20) {
          b.destroy();
          e.bullets.remove(b, true, true);
          continue;
        }

        const dx = b.x - this.player.x;
        const dy = b.y - this.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 14) {
          b.destroy();
          e.bullets.remove(b, true, true);
          this.player.takeDamage();
        }
      }
    });
  }

  private checkEnemiesVsPlayer(): void {
    if (this.player.isInvincible) return;
    const enemies = this.spawner.enemies;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 24) {
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
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        b.destroy();
        this.player.bullets.remove(b, true, true);
        this.boss.takeDamage(1);
        this.audio.playBossDamage();

        if (this.boss.hp <= 0) {
          this.triggerBossDefeat();
        }
      }
    }
  }

  private checkBossBulletsVsPlayer(): void {
    if (!this.boss || this.player.isInvincible) return;
    const bullets = this.boss.bullets.getChildren() as any[];

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (!b.active) continue;

      b.x += (b.vx || 0) * (1 / 60);
      b.y += (b.vy || 0) * (1 / 60);

      if (b.y > GAME_HEIGHT + 20 || b.x < -20 || b.x > GAME_WIDTH + 20 || b.y < -20) {
        b.destroy();
        this.boss.bullets.remove(b, true, true);
        continue;
      }

      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 14) {
        b.destroy();
        this.boss.bullets.remove(b, true, true);
        this.player.takeDamage();
      }
    }
  }

  // ─── エフェクト ────────────────────────────────────

  private createExplosion(x: number, y: number, size: 'small' | 'medium' | 'large'): void {
    const count = size === 'small' ? 6 : size === 'medium' ? 14 : 30;
    const maxR = size === 'small' ? 40 : size === 'medium' ? 80 : 160;
    const colors = [0xff8800, 0xffcc00, 0xff4400, 0xffffff];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
      const speed = Phaser.Math.Between(30, maxR);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dot = this.add.graphics();
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      dot.x = x;
      dot.y = y;
      dot.setDepth(50);

      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Phaser.Math.Between(300, 600),
        onComplete: () => dot.destroy(),
      });
    }

    // 中心フラッシュ
    const flash = this.add.graphics();
    const flashSize = size === 'small' ? 20 : size === 'medium' ? 40 : 80;
    flash.fillStyle(0xffffff, 0.9);
    flash.fillCircle(x, y, flashSize);
    flash.setDepth(51);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  // ─── ボム ──────────────────────────────────────────

  private activateBomb(): void {
    this.hud.updateBombs(this.player.bombs);
    this.audio.playBomb();

    // 全敵にダメージ
    const enemies = [...this.spawner.enemies];
    enemies.forEach(e => {
      this.createExplosion(e.x, e.y, 'medium');
      e.takeDamage(10);
    });
    // 削除
    for (let i = this.spawner.enemies.length - 1; i >= 0; i--) {
      if (this.spawner.enemies[i].hp <= 0) {
        this.player.score += this.spawner.enemies[i].score;
        this.spawner.destroyEnemy(i);
      }
    }

    // ボスにもダメージ
    if (this.boss && !this.boss.isDefeated) {
      this.boss.takeDamage(20);
      if (this.boss.hp <= 0) this.triggerBossDefeat();
    }

    // 画面フラッシュ（白）
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff);
    overlay.setDepth(80);
    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 500,
      onComplete: () => overlay.destroy(),
    });

    // 衝撃波リング
    for (let r = 0; r < 3; r++) {
      const ring = this.add.graphics();
      ring.lineStyle(3, 0x00ffff, 0.8);
      ring.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 10);
      ring.setDepth(81);
      this.tweens.add({
        targets: ring,
        scaleX: 40,
        scaleY: 25,
        alpha: 0,
        duration: 600 + r * 150,
        onComplete: () => ring.destroy(),
      });
    }

    // 敵弾を全消去
    this.spawner.enemies.forEach(e => {
      e.bullets.clear(true, true);
    });
  }

  // ─── ボス ──────────────────────────────────────────

  private bossWarningText: Phaser.GameObjects.Text | null = null;

  private bossWarningSetup(): void {
    this.bossWarningText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '⚠ BOSS INCOMING ⚠', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff0044',
      stroke: '#440000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(95);
  }

  private triggerBossAppearance(): void {
    this.bossSpawned = true;
    this.spawner.destroyAll();

    // 警告表示
    if (this.bossWarningText) {
      this.tweens.add({
        targets: this.bossWarningText,
        alpha: 1,
        duration: 300,
        yoyo: true,
        repeat: 5,
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
    this.gameEnded = true;
    this.boss.isDefeated = true;

    this.player.score += BOSS_SCORE;
    this.audio.stopBGM();

    // 大爆発演出
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 200, () => {
        if (!this.boss) return;
        const ox = Phaser.Math.Between(-50, 50);
        const oy = Phaser.Math.Between(-50, 50);
        this.createExplosion(this.boss.x + ox, this.boss.y + oy, 'large');
        this.audio.playExplosion();
      });
    }

    this.time.delayedCall(1200, () => {
      this.boss?.destroy();
      this.cameras.main.flash(500, 255, 255, 255);
      this.time.delayedCall(600, () => {
        this.audio.stopBGM();
        this.scene.start('ClearScene', { score: this.player.score });
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
