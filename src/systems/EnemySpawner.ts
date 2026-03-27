import Phaser from 'phaser';
import { Enemy, EnemyType, setEnemyGlobalMult } from '../objects/Enemy';
import { GAME_WIDTH } from '../config';

// EnemySpawner: 時間経過 + プレイヤー強化状態に応じて敵を出現させる
export class EnemySpawner {
  private scene: Phaser.Scene;
  public enemies: Enemy[] = [];
  private spawnTimer: number = 0;
  private elapsed: number = 0;
  private waveIndex: number = 0;

  // GameScene から動的にセットされるスポーンレート倍率
  // 1.0 = 通常、1.5 = 3WAY時、2.0 = SUPER SHIBA時
  public spawnRateMultiplier: number = 1.0;

  // ステージ別速度倍率（GameSceneからinitでセットされる）
  public setStageMultipliers(speedMult: number, bulletMult: number): void {
    setEnemyGlobalMult(speedMult, bulletMult);
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.spawnTimer += delta;

    const interval = this.getSpawnInterval();

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(delta);
      if (e.y > 790 || e.x < -70 || e.x > GAME_WIDTH + 70) {
        this.destroyEnemy(i);
      }
    }
  }

  // ── スポーン間隔（倍率に応じて短縮）─────────────────
  private getSpawnInterval(): number {
    // 基本間隔（時間経過で短縮）
    let base: number;
    if (this.elapsed < 15000) base = 2200;
    else if (this.elapsed < 30000) base = 1600;
    else if (this.elapsed < 45000) base = 1200;
    else base = 900;

    // パワーアップ倍率で短縮（プレイヤーが強くなるほど敵も増える）
    return Math.max(350, Math.floor(base / this.spawnRateMultiplier));
  }

  // ── ウェーブ生成 ─────────────────────────────────────
  private spawnWave(): void {
    this.waveIndex++;
    const t = this.elapsed;
    const isHard = this.spawnRateMultiplier >= 1.8; // SUPER SHIBA時
    const isMid  = this.spawnRateMultiplier >= 1.4; // 3WAY時

    if (t < 10000) {
      this.spawnSingle('straight');
    } else if (t < 25000) {
      const type: EnemyType = Math.random() < 0.65 ? 'straight' : 'zigzag';
      this.spawnSingle(type);
    } else if (t < 40000) {
      if (this.waveIndex % 4 === 0) {
        this.spawnFormation(isMid ? 5 : 4);
      } else {
        const types: EnemyType[] = ['straight', 'zigzag', 'formation'];
        this.spawnSingle(types[Math.floor(Math.random() * types.length)]);
      }
    } else {
      // 後半: SUPER時は同時2体スポーン or 大編隊
      if (isHard) {
        // SUPER SHIBA MODE: 50%で2体同時、残りは大編隊
        if (Math.random() < 0.5) {
          this.spawnSingle('zigzag');
          this.spawnSingle('straight');   // 同時2体
        } else {
          this.spawnFormation(Phaser.Math.Between(5, 7)); // 大編隊
        }
      } else if (isMid) {
        // 3WAY: 40%で2体同時
        if (Math.random() < 0.4) {
          this.spawnSingle('zigzag');
          this.spawnSingle('straight');
        } else {
          this.spawnFormation(Phaser.Math.Between(4, 5));
        }
      } else {
        // 通常
        if (this.waveIndex % 2 === 0) this.spawnFormation(Phaser.Math.Between(3, 4));
        else this.spawnSingle('zigzag');
      }
    }
  }

  private spawnSingle(type: EnemyType): void {
    const x = Phaser.Math.Between(30, GAME_WIDTH - 30);
    const e = new Enemy(this.scene, x, -30, type);
    this.enemies.push(e);
  }

  private spawnFormation(count: number): void {
    const startX = Phaser.Math.Between(50, GAME_WIDTH - 50);
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Clamp(startX + (i - Math.floor(count / 2)) * 40, 22, GAME_WIDTH - 22);
      const e = new Enemy(this.scene, x, -30 - i * 10, 'formation');
      this.enemies.push(e);
    }
  }

  destroyEnemy(index: number): void {
    const e = this.enemies[index];
    e.bullets.getChildren().forEach(b => b.destroy());
    e.bullets.clear(true, true);
    e.destroy();
    this.enemies.splice(index, 1);
  }

  destroyAll(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.destroyEnemy(i);
    }
  }
}
