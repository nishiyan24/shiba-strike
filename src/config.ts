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
export const BOSS_HP = 200;          // Stage 1 ボスHP
export const BOSS_VACUUM_HP = 240;   // Stage 2 ボスHP
export const BOSS_THUNDER_HP = 320;  // Stage 3 ボスHP
export const BOSS_SCORE = 10000;
export const BOSS_APPEAR_TIME = 60000; // 60秒後にボス出現

// ── 全3ステージ設定 ───────────────────────────────────
// index = stageNumber - 1
export const STAGE_ENEMY_SPEED_MULT   = [1.0, 1.3, 1.65]; // 敵の移動速度倍率
export const STAGE_ENEMY_BULLET_MULT  = [1.0, 1.25, 1.55]; // 敵の弾速倍率

// 色設定
export const COLOR_BG = 0x000011;
export const COLOR_PLAYER = 0x00aaff;
export const COLOR_BULLET = 0xffff00;
export const COLOR_ENEMY = 0xff4444;
export const COLOR_BOSS = 0xff0088;
export const COLOR_BOMB = 0x00ffff;

// ── パワーアップ設定 ──────────────────────────────────
// 骨アイテムを拾うと NORMAL → POWER_3WAY に昇格
export const POWERUP_SHOOT_INTERVAL = 85;      // パワーアップ時の連射間隔(ms)
export const SUPER_MODE_SHOOT_INTERVAL = 65;   // スーパーモード時
export const SUPER_MODE_SPEED_MULT = 1.5;      // スーパーモード時の速度倍率

// ── ステージ別スコア倍率 ─────────────────────────────
export const SCORE_MULT_STAGE0 = 1;   // 普通の宇宙
export const SCORE_MULT_STAGE1 = 2;   // おやつ銀河（×2）
export const SCORE_MULT_STAGE2 = 3;   // 伝説のドッグラン・スーパーモード（×3）

// ── アイテムドロップ率 ───────────────────────────────
export const DROP_RATE_STAGE0 = 0.0;   // ドロップなし
export const DROP_RATE_STAGE1 = 0.38;  // おやつ銀河：38%
export const DROP_RATE_STAGE2 = 0.58;  // ドッグラン：58%

// LocalStorageキー
export const STORAGE_KEY_HIGHSCORE = 'shibaStrike_highScore';
