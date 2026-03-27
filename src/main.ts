import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ClearScene } from './scenes/ClearScene';

// ゲームの設定
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,          // WebGL優先、fallbackでCanvas
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000011',
  scene: [BootScene, TitleScene, GameScene, GameOverScene, ClearScene],
  parent: document.body,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
};

// ゲーム起動
new Phaser.Game(config);
