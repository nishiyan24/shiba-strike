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

---

## Progress Log

### 2026-03-27
- Initialized Git repository
- Created private GitHub repository `0327game`
- Connected local repo to GitHub remote and pushed initial commit
- Set up CLAUDE.md with backup rules
- Built complete vertical-scrolling shooter "SHIBA STRIKE" (Phaser 3 + Vite + TypeScript)
  - Space-suited Shiba Inu player with bone bullets, 3-WAY powerup, SUPER SHIBA MODE
  - 3 enemy types: black cat, robot vacuum, thunder cloud
  - Stage 1 Boss: 全自動シャンプーマシン
  - Stage 2 Boss: 高性能掃除機マシーン（吸引ギミック）
  - 3-stage background transitions, score multipliers, bomb cutscene
  - Full visual overhaul: high-detail procedural graphics, VFX particles, glows
  - 1UP life recovery item (Stage 2 & 3) with sparkle VFX
  - ClearScene, GameOverScene, EndingScene implemented
  - Migrated remote to `nishiyan24/shiba-strike` and pushed
