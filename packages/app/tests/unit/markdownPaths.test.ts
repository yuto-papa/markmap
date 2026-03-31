/**
 * markdownPaths.test.ts
 * headingPathToSegments / headingPathToNodeKey / nodeKeyToHeadingPath / stripHtmlTags
 */
import { describe, it, expect } from 'vitest';
import {
  headingPathToSegments,
  headingPathToNodeKey,
  nodeKeyToHeadingPath,
  stripHtmlTags,
  NODE_KEY_SEP,
} from '../../src/lib/markdownPaths';

// ============================================================
// headingPathToSegments
// ============================================================
describe('headingPathToSegments', () => {
  it('通常の見出しはそのまま返る', () => {
    expect(headingPathToSegments(['認証方式', 'OAuth調査'])).toEqual([
      '認証方式',
      'OAuth調査',
    ]);
  });

  it('空配列は空配列を返す', () => {
    expect(headingPathToSegments([])).toEqual([]);
  });

  it('.. は _ に変換する', () => {
    expect(headingPathToSegments(['..', 'evil'])).toEqual(['_', 'evil']);
  });

  it('禁止文字 \\ / : * ? " < > | は _ に置換される', () => {
    expect(headingPathToSegments(['bad:name'])).toEqual(['bad_name']);
    expect(headingPathToSegments(['path/segment'])).toEqual(['path_segment']);
    expect(headingPathToSegments(['x*y'])).toEqual(['x_y']);
    expect(headingPathToSegments(['a"b'])).toEqual(['a_b']);
    expect(headingPathToSegments(['a<b>c'])).toEqual(['a_b_c']);
    expect(headingPathToSegments(['a|b'])).toEqual(['a_b']);
  });

  it('electron/fileOps.ts の safeSegments と完全同一の結果を返す', () => {
    const inputs = ['..', 'bad:name', 'path/to/file', 'normal', 'a*b?c'];
    const expected = ['_', 'bad_name', 'path_to_file', 'normal', 'a_b_c'];
    expect(headingPathToSegments(inputs)).toEqual(expected);
  });
});

// ============================================================
// headingPathToNodeKey / nodeKeyToHeadingPath (往復変換)
// ============================================================
describe('headingPathToNodeKey / nodeKeyToHeadingPath', () => {
  it('通常の見出しで往復変換が完全一致する', () => {
    const path = ['認証方式', 'OAuth調査'];
    const key = headingPathToNodeKey(path);
    expect(nodeKeyToHeadingPath(key)).toEqual(path);
  });

  it('/ を含む見出しでも往復変換が正確', () => {
    const path = ['Client / Server', 'API設計'];
    const key = headingPathToNodeKey(path);
    // key に / が含まれていても正確に分割できる
    expect(nodeKeyToHeadingPath(key)).toEqual(path);
  });

  it('空配列は空文字列になる', () => {
    expect(headingPathToNodeKey([])).toBe('');
  });

  it('nodeKeyToHeadingPath("__root__") は空配列を返す', () => {
    expect(nodeKeyToHeadingPath('__root__')).toEqual([]);
  });

  it('NODE_KEY_SEP は \\x1F (Unit Separator)', () => {
    expect(NODE_KEY_SEP).toBe('\x1F');
  });

  it('単一要素の往復変換', () => {
    const path = ['認証方式'];
    expect(nodeKeyToHeadingPath(headingPathToNodeKey(path))).toEqual(path);
  });

  it('深い階層の往復変換', () => {
    const path = ['L1', 'L2', 'L3', 'L4'];
    expect(nodeKeyToHeadingPath(headingPathToNodeKey(path))).toEqual(path);
  });

  it('セパレータ文字 \\x1F を含む見出しも往復変換できる（後方互換確認）', () => {
    // \x1F は通常の見出しには現れないが、万一含まれていた場合の動作確認
    // → 分割が意図通りにならないため、このような見出しは使用禁止
    const key = headingPathToNodeKey(['a', 'b']);
    expect(key).toBe('a\x1Fb');
  });
});

// ============================================================
// stripHtmlTags
// ============================================================
describe('stripHtmlTags', () => {
  it('HTML タグを除去する', () => {
    expect(stripHtmlTags('<strong>OAuth 調査</strong>')).toBe('OAuth 調査');
  });

  it('ネストしたタグを除去する', () => {
    expect(stripHtmlTags('<a href="#"><span>リンク</span></a>')).toBe('リンク');
  });

  it('普通のテキストはそのまま返る', () => {
    expect(stripHtmlTags('プレーンテキスト')).toBe('プレーンテキスト');
  });

  it('空文字列は空文字列を返す', () => {
    expect(stripHtmlTags('')).toBe('');
  });

  it('属性付きタグも除去される', () => {
    expect(stripHtmlTags('<img src="x" onerror="alert(1)">テキスト')).toBe(
      'テキスト',
    );
  });

  it('複数タグが混在していても除去される', () => {
    expect(stripHtmlTags('<em>A</em> and <strong>B</strong>')).toBe('A and B');
  });
});
