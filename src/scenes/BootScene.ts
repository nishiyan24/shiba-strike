import Phaser from 'phaser';

// BootScene: ゲーム起動時に最初に走るシーン
// アセット（画像・音声）の読み込みを担当する
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // ローディングバー表示
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    const barBg = this.add.graphics();

    barBg.fillStyle(0x222222);
    barBg.fillRect(width / 2 - 150, height / 2 - 10, 300, 20);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x00aaff);
      bar.fillRect(width / 2 - 150, height / 2 - 10, 300 * value, 20);
    });

    this.load.on('complete', () => {
      bar.destroy();
      barBg.destroy();
    });

    // アセット読み込み（Phase 9でサウンド追加）
    // 現在はプログラム生成グラフィックのみなので即完了
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
