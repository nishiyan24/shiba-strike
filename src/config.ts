// ゲーム全体の設定定数
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

// プレイヤー設定
export const PLAYER_SPEED = 280;
export const PLAYER_SHOOT_INTERVAL = 120; // ms
export const PLAYER_MAX_LIVES = 3;
export const PLAYER_MAX_BOMBS = 3;
export const PLAYER_INVINCIBLE_DURATION = 2000; // ms

// 弾設定
export const BULLET_SPEED = 600;
export const ENEMY_BULLET_SPEED = 220;

// 敵設定
export const ENEMY_SCORE_SMALL = 100;
export const ENEMY_SCORE_MEDIUM = 250;
export const ENEMY_SCORE_LARGE = 500;

// ボス設定
export const BOSS_HP = 200;
export const BOSS_SCORE = 10000;
export const BOSS_APPEAR_TIME = 60000; // 60秒後にボス出現

// 色設定
export const COLOR_BG = 0x000011;
export const COLOR_PLAYER = 0x00aaff;
export const COLOR_BULLET = 0xffff00;
export const COLOR_ENEMY = 0xff4444;
export const COLOR_BOSS = 0xff0088;
export const COLOR_BOMB = 0x00ffff;

// LocalStorageキー
export const STORAGE_KEY_HIGHSCORE = 'shibaStrike_highScore';
