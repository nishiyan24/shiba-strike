import Phaser from 'phaser';
import { Enemy, EnemyType } from '../objects/Enemy';
import { GAME_WIDTH } from '../config';

// EnemySpawner: 時間経過に応じて敵を出現させる管理クラス
export class EnemySpawner {
  private scene: Phaser.Scene;
  public enemies: Enemy[] = [];
  private spawnTimer: number = 0;
  private elapsed: number = 0;
  private waveIndex: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(delta: number): void {
    this.elapsed += delta;
    this.spawnTimer += delta;

    // 経過時間で難易度とスポーン間隔を決定
    const interval = this.getSpawnInterval();

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    // 敵の移動更新 & 画面外削除
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(delta);

      if (e.y > 780 || e.x < -60 || e.x > GAME_WIDTH + 60) {
        this.destroyEnemy(i);
      }
    }
  }

  private getSpawnInterval(): number {
    // 序盤：ゆっくり。後半：高速
    if (this.elapsed < 15000) return 2200;
    if (this.elapsed < 30000) return 1600;
    if (this.elapsed < 45000) return 1200;
    return 900;
  }

  private spawnWave(): void {
    this.waveIndex++;
    const t = this.elapsed;

    if (t < 10000) {
      // 序盤：直進のみ
      this.spawnSingle('straight');
    } else if (t < 25000) {
      // 中盤：直進 + たまにジグザグ
      const type: EnemyType = Math.random() < 0.7 ? 'straight' : 'zigzag';
      this.spawnSingle(type);
    } else if (t < 40000) {
      // 後半：全種類 + 編隊
      if (this.waveIndex % 4 === 0) {
        this.spawnFormation();
      } else {
        const types: EnemyType[] = ['straight', 'zigzag', 'formation'];
        this.spawnSingle(types[Math.floor(Math.random() * types.length)]);
      }
    } else {
      // ボス直前：編隊ラッシュ
      if (this.waveIndex % 2 === 0) {
        this.spawnFormation();
      } else {
        this.spawnSingle('zigzag');
      }
    }
  }

  private spawnSingle(type: EnemyType): void {
    const x = Phaser.Math.Between(30, GAME_WIDTH - 30);
    const e = new Enemy(this.scene, x, -30, type);
    this.enemies.push(e);
  }

  private spawnFormation(): void {
    // 3〜5機の編隊
    const count = Phaser.Math.Between(3, 5);
    const startX = Phaser.Math.Between(40, GAME_WIDTH - 40);
    for (let i = 0; i < count; i++) {
      const x = startX + (i - Math.floor(count / 2)) * 40;
      const clampedX = Phaser.Math.Clamp(x, 20, GAME_WIDTH - 20);
      const e = new Enemy(this.scene, clampedX, -30 - i * 10, 'formation');
      this.enemies.push(e);
    }
  }

  destroyEnemy(index: number): void {
    const e = this.enemies[index];
    // 残弾を消す
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
