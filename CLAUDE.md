# CLAUDE.md — Project Rules

## GitHub Backup Rule

When the user says **「現在の進捗をCLAUDE.mdに更新して」**, follow these steps **in order — no exceptions**:

1. **Update CLAUDE.md** — reflect today's progress, what was implemented, and current state
2. **Commit & Push to GitHub** — run the following:
   ```bash
   git add .
   git commit -m "<generated message>"
   git push
   ```
3. **Run `/clear`** to reset the conversation context

> ⚠️ **MUST always GitHub backup (commit & push) before running /clear.**
> Never skip the push step. This rule applies every single time without exception.

### Commit Message Rules

- Language: **English only**
- Format: conventional commits (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- Content: based on **what was actually implemented today** in the conversation
- Examples:
  - `feat: add player movement and collision detection`
  - `fix: resolve enemy spawn timing bug`
  - `refactor: simplify game loop logic`
  - `docs: update progress in CLAUDE.md`

---

## Project Info

- **Repository**: https://github.com/nishiyan24/shiba-strike
- **Branch**: main
- **Local path**: `C:/Users/owner/Desktop/claude code/0327game`
- **Stack**: Phaser 3.90 + Vite 5 + TypeScript 5.4
- **Build**: `npm run build` → `dist/` (Vercel ready, `base: './'` in vite.config.ts)

---

## ✅ 完成済み機能

### ゲームコア
- [x] 全3ステージ構成（Stage 1 → 2 → 3 → Ending）
- [x] ステージ間スコア・ライフ・ボム引き継ぎ（ClearScene経由）
- [x] 各ステージの敵速度・弾速スケーリング（config: `STAGE_ENEMY_SPEED_MULT`）
- [x] ボス出現タイマー（BOSS_APPEAR_TIME = 60000ms）
- [x] ボス出現前警告テキスト + 「STAGE BOSS」バナー

### プレイヤー
- [x] 宇宙服柴犬（耳・しっぽアニメーション、スラスター）
- [x] 骨弾幕（通常/3-WAY/SUPER）
- [x] パワーアップシステム（PowerLevel 0→1, SUPER SHIBA MODE）
- [x] ボム（でかい柴犬顔カットシーン「ワフッ！」）
- [x] 無敵時間・ダメージフラッシュ
- [x] `addLife()` メソッド（1UPアイテム取得用）

### 敵
- [x] 3種類（黒猫/ロボット掃除機/雷雲）
- [x] 各敵固有弾（毛玉/汚れ粒子/ミニ雷）
- [x] グローバル速度倍率（`setEnemyGlobalMult()`）

### ボス
- [x] **Stage 1**: 全自動シャンプーマシン（水スプレー/エイムジェット/泡バレー、2フェーズ）
- [x] **Stage 2**: 高性能掃除機マシーン（デブリ散弾/吸引ギミック、`isSucking`でプレイヤー引き寄せ）
- [x] **Stage 3**: 雷神（`BossThunder`、雷柱/フラッシュ/嵐攻撃、`isPillar`）
- [x] 全ボスに `playerPowerMult` 難易度スケーリング

### 背景・ステージ演出
- [x] 3層視差スクロール星フィールド
- [x] bgStage 0→1（おやつ銀河、20秒）→ 2（伝説のドッグラン/SUPER MODE、40秒）
- [x] ステージバナー表示（各ステージ開始時）
- [x] 骨・肉球デコレーション（bgStage別）

### アイテム
- [x] 骨アイテム（3-WAYパワーアップ、ドロップ率ステージ別）
- [x] **1UPライフアイテム**（柴犬顔アイコン、緑グロウ、左右揺れ落下）
  - Stage 2: elapsed 36000ms（おやつ銀河終わり際）
  - Stage 3: elapsed 30000ms（道中中盤）

### UI・HUD
- [x] スコア表示・スコア倍率バッジ（×2/×3）
- [x] パワーバッジ（3-WAY SHOT / SUPER SHIBA）
- [x] ライフ表示（ステージ引き継ぎ値で初期同期済み）
- [x] ボム表示
- [x] ボスHPバー（グラデーション + デコレーション枠）

### シーン
- [x] **BootScene** → **TitleScene** → **GameScene** → **ClearScene** → **EndingScene**
- [x] **GameOverScene**（悲しい柴犬、「次はがんばるWAN…」）
- [x] **ClearScene**（ステージ対応、Stage1/2クリア後は次ステージへ）
- [x] **EndingScene**（チワワ姫登場、ハート演出、CONGRATULATIONS、最終スコア）

### VFX・サウンド
- [x] 爆発パーティクル（多層）
- [x] 弾グロウエフェクト
- [x] 1UP取得キラキラVFX（衝撃波リング×2、14方向スパーク、フラッシュ）
- [x] Web Audio API 合成音（射撃/被弾/パワーアップ/ボム/BGM）

---

## ❌ 未実装・残タスク

### 優先度：高
- [ ] **ハイスコア保存** — `localStorage` への最高スコア記録・表示が未実装
  - GameOverScene / EndingScene / TitleScene に追加が必要
- [ ] **Stage 3 bgStage タイミング調整** — 現状 Stage 3 も elapsed 20000ms/40000ms で bgStage 遷移するが、Stage 3 専用の背景演出（雷雲フィールドなど）が未実装

### 優先度：中
- [ ] **モバイル対応** — タッチ操作（仮想パッド）未実装
- [ ] **Vercel デプロイ確認** — `vercel.json` 未作成（`vite build` → `dist/` のみ、Vercel自動検出に依存）
- [ ] **ポーズ機能** — ESCキーでポーズ未実装

### 優先度：低
- [ ] **BGMのステージ別差別化** — Stage 2/3 に異なるBGMパターン追加
- [ ] **クレジット画面** — エンディング後のスタッフロール

---

## ⚠️ 特に注意すべき点

1. **ビルドは必ず `npm run build` で確認** — TypeScript型エラーがあるとViteビルドが止まる
2. **Phaser Graphics の `fillStar` は型エラー** — `fillCircle` で代替すること（過去に踏んだバグ）
3. **AudioManager の `private scene` フィールド重複に注意** — ゲッターと通常フィールドを混在させるとコンパイルエラー
4. **BossVacuum の `drawMouth`/`drawLeds` は `mouthGfx`/`ledGfx` が `draw()` 内でセットされる** — コンストラクタ順序を変えないこと
5. **ClearScene はステージ引き継ぎデータ（score/lives/bombs）を次のGameSceneに渡す** — `stageNumber + 1` を渡す実装になっている
6. **`checkBgStageTransition` は全ステージ共通タイミング** — Stage 3 専用演出を追加する場合は `this.stageNumber === 3` でガードする

---

## 🔜 次回作業開始時の最初のタスク

**`localStorage` を使ったハイスコア保存・表示機能を GameOverScene / EndingScene / TitleScene の3箇所に追加する。**

---

## Progress Log

### 2026-03-27
- Initialized Git repository, created `0327game` repo, set up CLAUDE.md
- Built full vertical shooter "SHIBA STRIKE" (Phaser 3 + Vite + TypeScript)
- Implemented: player, 3 enemies, Stage 1 boss, 3-stage backgrounds, powerup system
- Added: Stage 2 boss (vacuum + suction), Stage 3 boss (thunder god), EndingScene
- Visual overhaul: high-detail procedural graphics, VFX particles, glow effects
- Added 1UP life recovery item (Stage 2 & 3) with sparkle VFX
- Migrated repo remote to `nishiyan24/shiba-strike` and pushed
