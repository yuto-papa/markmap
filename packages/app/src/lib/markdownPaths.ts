import type { HeadingPath } from '../types';

/**
 * Unit Separator (U+001F) — safe delimiter that cannot appear in markdown headings.
 * Using '/' would collide with headings like "# Client / Server".
 */
export const NODE_KEY_SEP = '\x1F';

/**
 * electron/fileOps.ts の safeSegments と完全同一ロジック。
 * renderer プロセスで使用する（IPC 呼び出し前にパスを構築する用途）。
 */
export function headingPathToSegments(headingPath: string[]): string[] {
  return headingPath.map((s) =>
    s === '..' ? '_' : s.replace(/[\\/:*?"<>|]/g, '_'),
  );
}

/**
 * HeadingPath → NodeKey （TerminalMap のキー）。
 * NODE_KEY_SEP (\x1F) で結合する。'/' を含む見出しでも安全。
 */
export function headingPathToNodeKey(headingPath: string[]): string {
  return headingPath.join(NODE_KEY_SEP);
}

/**
 * NodeKey → HeadingPath（headingPathToNodeKey の逆変換）。
 */
export function nodeKeyToHeadingPath(nodeKey: string): HeadingPath {
  if (nodeKey === '__root__') return [];
  return nodeKey.split(NODE_KEY_SEP);
}

/**
 * HTML タグを除去してプレーンテキストを返す。
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}
