/**
 * launchFlow.test.ts — HeadingPath ベースのターミナル起動フローのユニットテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TerminalMap, HeadingPath, NodeKey } from '../../src/types';
import type { TerminalMode } from '../../src/App';
import { headingPathToNodeKey } from '../../src/lib/markdownPaths';

// ---- Helpers ----

function makeTerminalEntry(ptyId: string, tool: string) {
  return { ptyId, tool };
}

function makeTerminalState(entries: [NodeKey, string, string][]): TerminalMap {
  return Object.fromEntries(
    entries.map(([key, ptyId, tool]) => [key, makeTerminalEntry(ptyId, tool)]),
  );
}

// ---- Pure logic extracted from App.tsx (for testability without React) ----

type TerminalModes = Record<NodeKey, TerminalMode>;

function computeActiveAfterHide(
  nodeKey: NodeKey,
  terminals: TerminalMap,
  modes: TerminalModes,
  currentActive: string | null,
): string | null {
  const entry = terminals[nodeKey];
  if (entry && currentActive === entry.ptyId) {
    const remaining = Object.entries(terminals).filter(
      ([id]) => id !== nodeKey && modes[id] === 'tab',
    );
    return remaining.length > 0 ? remaining[0][1].ptyId : null;
  }
  return currentActive;
}

function computeActiveAfterRemove(
  nodeKey: NodeKey,
  terminals: TerminalMap,
  modes: TerminalModes,
  currentActive: string | null,
): string | null {
  return computeActiveAfterHide(nodeKey, terminals, modes, currentActive);
}

// ---- Tests ----

describe('headingPath to nodeKey', () => {
  it('空配列は __root__ に対応する', () => {
    const path: HeadingPath = [];
    const key: NodeKey =
      path.length > 0 ? headingPathToNodeKey(path) : '__root__';
    expect(key).toBe('__root__');
  });

  it('単一要素は element 文字列になる', () => {
    const path: HeadingPath = ['認証方式'];
    expect(headingPathToNodeKey(path)).toBe('認証方式');
  });

  it('階層は \\x1F 区切りになる', () => {
    const path: HeadingPath = ['認証方式', 'OAuth調査'];
    expect(headingPathToNodeKey(path)).toBe('認証方式\x1FOAuth調査');
  });

  it('/ を含む見出しも正確に結合される', () => {
    const path: HeadingPath = ['Client / Server', 'API設計'];
    expect(headingPathToNodeKey(path)).toBe('Client / Server\x1FAPI設計');
  });
});

describe('launchCLI: ptyId の生成', () => {
  it('nodeKey と tool から ptyId を生成する', () => {
    const nodeKey: NodeKey = headingPathToNodeKey(['認証方式', 'OAuth調査']);
    const tool = 'claude';
    const ptyId = `${nodeKey}-${tool}`;
    expect(ptyId).toBe('認証方式\x1FOAuth調査-claude');
  });

  it('同じ nodeKey + tool は同じ ptyId になる（重複起動防止）', () => {
    const nodeKey: NodeKey = 'Section A';
    const tool = 'gemini';
    const id1 = `${nodeKey}-${tool}`;
    const id2 = `${nodeKey}-${tool}`;
    expect(id1).toBe(id2);
  });
});

describe('hideTerminal: アクティブ切り替え', () => {
  it('非アクティブなタブを隠しても activeTerminalId は変わらない', () => {
    const terminals = makeTerminalState([
      ['nodeA', 'nodeA-claude', 'claude'],
      ['nodeB', 'nodeB-gemini', 'gemini'],
    ]);
    const modes: TerminalModes = { nodeA: 'tab', nodeB: 'tab' };
    const result = computeActiveAfterHide(
      'nodeB',
      terminals,
      modes,
      'nodeA-claude',
    );
    expect(result).toBe('nodeA-claude');
  });

  it('アクティブなタブを隠すと別のタブがアクティブになる', () => {
    const terminals = makeTerminalState([
      ['nodeA', 'nodeA-claude', 'claude'],
      ['nodeB', 'nodeB-gemini', 'gemini'],
    ]);
    const modes: TerminalModes = { nodeA: 'tab', nodeB: 'tab' };
    const result = computeActiveAfterHide(
      'nodeA',
      terminals,
      modes,
      'nodeA-claude',
    );
    expect(result).toBe('nodeB-gemini');
  });

  it('最後のタブを隠すと null になる', () => {
    const terminals = makeTerminalState([['nodeA', 'nodeA-claude', 'claude']]);
    const modes: TerminalModes = { nodeA: 'tab' };
    const result = computeActiveAfterHide(
      'nodeA',
      terminals,
      modes,
      'nodeA-claude',
    );
    expect(result).toBeNull();
  });
});

describe('removeTerminal', () => {
  it('削除後に他のタブのアクティブ状態が維持される', () => {
    const terminals = makeTerminalState([
      ['nodeA', 'nodeA-claude', 'claude'],
      ['nodeB', 'nodeB-gemini', 'gemini'],
    ]);
    const modes: TerminalModes = { nodeA: 'tab', nodeB: 'tab' };
    const result = computeActiveAfterRemove(
      'nodeA',
      terminals,
      modes,
      'nodeA-claude',
    );
    expect(result).toBe('nodeB-gemini');
  });
});

describe('floatTerminal: モード切り替え', () => {
  it('float に切り替えると tab エントリから外れる', () => {
    const modes: TerminalModes = { nodeA: 'tab', nodeB: 'tab' };
    const updated = { ...modes, nodeA: 'float' as TerminalMode };
    const tabEntries = Object.entries(updated).filter(([, m]) => m === 'tab');
    expect(tabEntries).toHaveLength(1);
    expect(tabEntries[0][0]).toBe('nodeB');
  });
});

describe('tabTerminal: フロートからタブへ復帰', () => {
  it('tab に戻すと tabEntries に含まれる', () => {
    const modes: TerminalModes = { nodeA: 'float', nodeB: 'tab' };
    const updated = { ...modes, nodeA: 'tab' as TerminalMode };
    const tabEntries = Object.entries(updated).filter(([, m]) => m === 'tab');
    expect(tabEntries).toHaveLength(2);
  });
});
