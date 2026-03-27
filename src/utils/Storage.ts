import { STORAGE_KEY_HIGHSCORE } from '../config';

// ハイスコアをブラウザに保存・取得するユーティリティ
// 将来的にサーバー保存に切り替える場合はここだけ変更すればOK

export function getHighScore(): number {
  const stored = localStorage.getItem(STORAGE_KEY_HIGHSCORE);
  return stored ? parseInt(stored, 10) : 0;
}

export function saveHighScore(score: number): void {
  const current = getHighScore();
  if (score > current) {
    localStorage.setItem(STORAGE_KEY_HIGHSCORE, score.toString());
  }
}
