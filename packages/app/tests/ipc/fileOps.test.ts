import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import * as fileOps from '../../electron/fileOps';

// ---- テンポラリディレクトリのヘルパー ----

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'thinktool-test-'));
}

function removeTmpDir(dir: string) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// ============================================================
// ensureFolderPath
// ============================================================
describe('ensureFolderPath', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('存在しないネストパスを作成する', () => {
    const result = fileOps.ensureFolderPath(tmpDir, ['認証方式', 'JWT調査']);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '認証方式', 'JWT調査'))).toBe(true);
  });

  it('既存フォルダを指定してもエラーにならない', () => {
    fileOps.ensureFolderPath(tmpDir, ['already']);
    const result = fileOps.ensureFolderPath(tmpDir, ['already']);
    expect(result.success).toBe(true);
  });

  it('ファイル名に使えない文字は _ に置換される', () => {
    const result = fileOps.ensureFolderPath(tmpDir, ['bad:name*here']);
    expect(result.success).toBe(true);
    const created = path.join(tmpDir, 'bad_name_here');
    expect(fs.existsSync(created)).toBe(true);
  });

  it('単一セグメントでも動作する', () => {
    const result = fileOps.ensureFolderPath(tmpDir, ['single']);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'single'))).toBe(true);
  });
});

// ============================================================
// removeFolderPath
// ============================================================
describe('removeFolderPath', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('フォルダとその中身を再帰削除する', () => {
    const target = path.join(tmpDir, 'parent', 'child');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'file.txt'), 'data');
    const result = fileOps.removeFolderPath(tmpDir, ['parent']);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'parent'))).toBe(false);
  });

  it('存在しないパスでもエラーにならない', () => {
    const result = fileOps.removeFolderPath(tmpDir, ['nonexistent']);
    expect(result.success).toBe(true);
  });

  it('削除後、兄弟フォルダは残る', () => {
    fs.mkdirSync(path.join(tmpDir, 'keep'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'delete'), { recursive: true });
    fileOps.removeFolderPath(tmpDir, ['delete']);
    expect(fs.existsSync(path.join(tmpDir, 'keep'))).toBe(true);
  });
});

// ============================================================
// addRecentProject / readRecentProjects
// ============================================================
describe('addRecentProject / readRecentProjects', () => {
  let tmpDir: string;
  let recentPath: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    recentPath = path.join(tmpDir, 'recent.json');
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  const opts = () => ({ recentPath, thinktoolDir: tmpDir, maxRecent: 16 });

  it('新規追加するとリストの先頭に入る', () => {
    fileOps.addRecentProject('/proj/A', 'A', opts());
    const list = fileOps.readRecentProjects(recentPath);
    expect(list[0].path).toBe('/proj/A');
    expect(list[0].name).toBe('A');
  });

  it('同じパスを再追加すると重複せず先頭に移動する', () => {
    fileOps.addRecentProject('/proj/A', 'A', opts());
    fileOps.addRecentProject('/proj/B', 'B', opts());
    fileOps.addRecentProject('/proj/A', 'A', opts());
    const list = fileOps.readRecentProjects(recentPath);
    expect(list).toHaveLength(2);
    expect(list[0].path).toBe('/proj/A');
  });

  it('17件追加すると16件に切り詰められる', () => {
    for (let i = 0; i < 17; i++) {
      fileOps.addRecentProject(`/proj/${i}`, `Project${i}`, opts());
    }
    const list = fileOps.readRecentProjects(recentPath);
    expect(list).toHaveLength(16);
  });

  it('openedAt が ISO 8601 形式で記録される', () => {
    fileOps.addRecentProject('/proj/X', 'X', opts());
    const list = fileOps.readRecentProjects(recentPath);
    expect(() => new Date(list[0].openedAt)).not.toThrow();
    expect(new Date(list[0].openedAt).toISOString()).toBe(list[0].openedAt);
  });

  it('ファイルが存在しないとき readRecentProjects は空配列を返す', () => {
    const result = fileOps.readRecentProjects(
      path.join(tmpDir, 'nosuchfile.json'),
    );
    expect(result).toEqual([]);
  });

  it('不正 JSON でも readRecentProjects はクラッシュせず空配列を返す', () => {
    fs.writeFileSync(recentPath, 'NOT_JSON', 'utf8');
    const result = fileOps.readRecentProjects(recentPath);
    expect(result).toEqual([]);
  });
});

// ============================================================
// createProject
// ============================================================
describe('createProject', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('新規フォルダを作成し notes.md を初期化する', () => {
    const result = fileOps.createProject(tmpDir, 'MyProject');
    expect(result.success).toBe(true);
    const notesPath = path.join(result.projectPath!, 'notes.md');
    expect(fs.existsSync(notesPath)).toBe(true);
    const content = fs.readFileSync(notesPath, 'utf8');
    expect(content).toBe('# MyProject\n');
  });

  it('既存フォルダを指定しても notes.md が上書きされない', () => {
    fileOps.createProject(tmpDir, 'Existing');
    const projectPath = path.join(tmpDir, 'Existing');
    const notesPath = path.join(projectPath, 'notes.md');
    // 手動で書き換え
    fs.writeFileSync(notesPath, '# Custom Content\n');
    fileOps.createProject(tmpDir, 'Existing');
    const current = fs.readFileSync(notesPath, 'utf8');
    expect(current).toBe('# Custom Content\n');
  });

  it('プロジェクト名に禁止文字が含まれる場合 _ に置換される', () => {
    const result = fileOps.createProject(tmpDir, 'bad:name');
    expect(result.success).toBe(true);
    expect(result.projectPath).toContain('bad_name');
  });
});

// ============================================================
// readTree / writeTree
// ============================================================
describe('readTree / writeTree', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('writeTree で書き込んだデータを readTree で読み返せる', () => {
    const data = {
      name: 'Test',
      children: [
        {
          id: 'n1',
          name: 'Node1',
          expanded: false,
          summary: '',
          children: [],
          sessions: {
            claude: null,
            codex: null,
            gemini: null,
            copilot: null,
            perplexity: null,
          },
          urls: [],
        },
      ],
    };
    fileOps.writeTree(tmpDir, data);
    const read = fileOps.readTree(tmpDir);
    expect(read).toEqual(data);
  });

  it('tree.json が存在しないとき readTree は null を返す', () => {
    const result = fileOps.readTree(tmpDir);
    expect(result).toBeNull();
  });

  it('tree.json が不正 JSON のとき readTree は null を返す', () => {
    fs.writeFileSync(path.join(tmpDir, 'tree.json'), 'INVALID', 'utf8');
    const result = fileOps.readTree(tmpDir);
    expect(result).toBeNull();
  });
});

// ============================================================
// readLayout / writeLayout
// ============================================================
describe('readLayout / writeLayout', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('writeLayout で書き込んだデータを readLayout で読み返せる', () => {
    const layout = {
      'node-1': { x: 100, y: 200 },
      'node-2': { x: 300, y: 400 },
    };
    fileOps.writeLayout(tmpDir, layout);
    const result = fileOps.readLayout(tmpDir);
    expect(result).toEqual(layout);
  });

  it('layout.json が存在しないとき readLayout は空オブジェクトを返す', () => {
    const result = fileOps.readLayout(tmpDir);
    expect(result).toEqual({});
  });

  it('layout.json が不正 JSON のとき readLayout は空オブジェクトを返す', () => {
    const layoutPath = path.join(tmpDir, 'layout.json');
    fs.writeFileSync(layoutPath, 'INVALID_JSON', 'utf8');
    const result = fileOps.readLayout(tmpDir);
    expect(result).toEqual({});
  });

  it('空のレイアウトを書き込んで読み返せる', () => {
    fileOps.writeLayout(tmpDir, {});
    const result = fileOps.readLayout(tmpDir);
    expect(result).toEqual({});
  });

  it('上書き保存すると最新の値が反映される', () => {
    fileOps.writeLayout(tmpDir, { 'node-1': { x: 10, y: 20 } });
    fileOps.writeLayout(tmpDir, { 'node-1': { x: 999, y: 888 } });
    const result = fileOps.readLayout(tmpDir);
    expect(result['node-1']).toEqual({ x: 999, y: 888 });
  });
});
// ============================================================
// createFolder
// ============================================================
describe('createFolder', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('指定された名前のフォルダを作成する', () => {
    const result = fileOps.createFolder(tmpDir, 'newFolder');
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'newFolder'))).toBe(true);
  });

  it('既存フォルダでもエラーにならない', () => {
    fileOps.createFolder(tmpDir, 'exists');
    const result = fileOps.createFolder(tmpDir, 'exists');
    expect(result.success).toBe(true);
  });
});

// ============================================================
// writeNodeMarkdown
// ============================================================
describe('writeNodeMarkdown', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('summary と子ノードがある場合、README.md を正しく生成する', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['認証方式'],
      '認証方式',
      'JWTとOAuth2を比較する。',
      ['JWT調査', 'OAuth調査'],
    );
    expect(result.success).toBe(true);
    const mdPath = path.join(tmpDir, '認証方式', 'README.md');
    expect(fs.existsSync(mdPath)).toBe(true);
    const content = fs.readFileSync(mdPath, 'utf8');
    expect(content).toContain('# 認証方式');
    expect(content).toContain('## Summary');
    expect(content).toContain('JWTとOAuth2を比較する。');
    expect(content).toContain('## Sub-topics');
    expect(content).toContain('- JWT調査');
    expect(content).toContain('- OAuth調査');
  });

  it('summary がない場合、Summary セクションは含まれない', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['NoSummary'],
      'NoSummary',
      '',
      ['子A'],
    );
    expect(result.success).toBe(true);
    const content = fs.readFileSync(
      path.join(tmpDir, 'NoSummary', 'README.md'),
      'utf8',
    );
    expect(content).not.toContain('## Summary');
    expect(content).toContain('## Sub-topics');
  });

  it('子ノードがない場合、Sub-topics セクションは含まれない', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['Leaf'],
      'Leaf',
      'memo',
      [],
    );
    expect(result.success).toBe(true);
    const content = fs.readFileSync(
      path.join(tmpDir, 'Leaf', 'README.md'),
      'utf8',
    );
    expect(content).toContain('## Summary');
    expect(content).not.toContain('## Sub-topics');
  });

  it('summary も子ノードもない場合、ヘッダーのみ', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['Empty'],
      'Empty',
      '',
      [],
    );
    expect(result.success).toBe(true);
    const content = fs.readFileSync(
      path.join(tmpDir, 'Empty', 'README.md'),
      'utf8',
    );
    expect(content.trim()).toBe('# Empty');
  });

  it('フォルダが存在しなくても自動作成される', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['Parent', 'Child'],
      'Child',
      '',
      [],
    );
    expect(result.success).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, 'Parent', 'Child', 'README.md')),
    ).toBe(true);
  });

  it('ノード名に禁止文字が含まれるとき _ に置換してフォルダが作られる', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['bad:name*here'],
      'bad:name*here',
      '',
      [],
    );
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'bad_name_here', 'README.md'))).toBe(
      true,
    );
  });

  it('パストラバーサル (.. セグメント) は _ に置換されて安全に処理される', () => {
    // safeSegments が '..' を '_' に置換するため projectPath 外には出ない
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['..', 'evil'],
      'evil',
      '',
      [],
    );
    expect(result.success).toBe(true);
    // '_/evil/README.md' として作成される
    expect(fs.existsSync(path.join(tmpDir, '_', 'evil', 'README.md'))).toBe(
      true,
    );
  });

  it('上書き保存すると最新の内容に更新される', () => {
    fileOps.writeNodeMarkdown(
      tmpDir,
      ['OverwriteMe'],
      'OverwriteMe',
      '初回',
      [],
    );
    fileOps.writeNodeMarkdown(
      tmpDir,
      ['OverwriteMe'],
      'OverwriteMe',
      '更新後',
      [],
    );
    const content = fs.readFileSync(
      path.join(tmpDir, 'OverwriteMe', 'README.md'),
      'utf8',
    );
    expect(content).toContain('更新後');
    expect(content).not.toContain('初回');
  });

  it('summary の前後の空白はトリムされる', () => {
    const result = fileOps.writeNodeMarkdown(
      tmpDir,
      ['TrimTest'],
      'TrimTest',
      '  前後にスペース  ',
      [],
    );
    expect(result.success).toBe(true);
    const content = fs.readFileSync(
      path.join(tmpDir, 'TrimTest', 'README.md'),
      'utf8',
    );
    expect(content).toContain('前後にスペース');
    expect(content).not.toContain('  前後にスペース  ');
  });
});

// ============================================================
// readMarkdownFile / writeMarkdownFile
// ============================================================
describe('readMarkdownFile / writeMarkdownFile', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('writeMarkdownFile で書き込んだデータを readMarkdownFile で読み返せる', () => {
    const filePath = path.join(tmpDir, 'notes.md');
    fileOps.writeMarkdownFile(filePath, '# Hello\n\n- item\n');
    const result = fileOps.readMarkdownFile(filePath);
    expect(result).toBe('# Hello\n\n- item\n');
  });

  it('存在しないファイルの readMarkdownFile は null を返す', () => {
    const result = fileOps.readMarkdownFile(
      path.join(tmpDir, 'nonexistent.md'),
    );
    expect(result).toBeNull();
  });

  it('writeMarkdownFile は親ディレクトリを自動作成する', () => {
    const filePath = path.join(tmpDir, 'deep', 'nested', 'notes.md');
    const result = fileOps.writeMarkdownFile(filePath, '# Deep\n');
    expect(result.success).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('上書き保存で内容が更新される', () => {
    const filePath = path.join(tmpDir, 'notes.md');
    fileOps.writeMarkdownFile(filePath, '# v1\n');
    fileOps.writeMarkdownFile(filePath, '# v2\n');
    expect(fileOps.readMarkdownFile(filePath)).toBe('# v2\n');
  });
});

// ============================================================
// ensureAIHistoryDir
// ============================================================
describe('ensureAIHistoryDir', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('.ai-history ディレクトリを作成して folderPath を返す', () => {
    const result = fileOps.ensureAIHistoryDir(tmpDir, [
      '認証方式',
      'OAuth調査',
    ]);
    expect(result.success).toBe(true);
    expect(result.folderPath).toBeDefined();
    expect(fs.existsSync(result.folderPath!)).toBe(true);
  });

  it('既に存在しても成功する', () => {
    fileOps.ensureAIHistoryDir(tmpDir, ['test']);
    const result = fileOps.ensureAIHistoryDir(tmpDir, ['test']);
    expect(result.success).toBe(true);
  });

  it('パストラバーサル (..) は _ に置換されて安全に処理される', () => {
    const result = fileOps.ensureAIHistoryDir(tmpDir, ['..', 'evil']);
    expect(result.success).toBe(true);
    // '_/evil/' として作成される
    const expected = path.join(tmpDir, fileOps.AI_HISTORY_SUBDIR, '_', 'evil');
    expect(fs.existsSync(expected)).toBe(true);
  });
});

// ============================================================
// saveWebSession / readWebSessions
// ============================================================
describe('saveWebSession / readWebSessions', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('saveWebSession で URL を保存し readWebSessions で読み返せる', () => {
    fileOps.saveWebSession(
      tmpDir,
      ['node1'],
      'copilot',
      'https://copilot.microsoft.com/chats/abc',
    );
    const sessions = fileOps.readWebSessions(tmpDir, ['node1']);
    expect(sessions.copilot).toBe('https://copilot.microsoft.com/chats/abc');
  });

  it('複数のツールの URL を独立して保存できる', () => {
    fileOps.saveWebSession(
      tmpDir,
      ['node1'],
      'copilot',
      'https://copilot.example.com/',
    );
    fileOps.saveWebSession(
      tmpDir,
      ['node1'],
      'perplexity',
      'https://perplexity.ai/s/xyz',
    );
    const sessions = fileOps.readWebSessions(tmpDir, ['node1']);
    expect(sessions.copilot).toBe('https://copilot.example.com/');
    expect(sessions.perplexity).toBe('https://perplexity.ai/s/xyz');
  });

  it('ディレクトリが存在しないとき readWebSessions は空オブジェクトを返す', () => {
    const sessions = fileOps.readWebSessions(tmpDir, ['nonexistent']);
    expect(sessions).toEqual({});
  });

  it('URL を上書き保存できる', () => {
    fileOps.saveWebSession(
      tmpDir,
      ['n'],
      'copilot',
      'https://old.example.com/',
    );
    fileOps.saveWebSession(
      tmpDir,
      ['n'],
      'copilot',
      'https://new.example.com/',
    );
    const sessions = fileOps.readWebSessions(tmpDir, ['n']);
    expect(sessions.copilot).toBe('https://new.example.com/');
  });
});

// ============================================================
// listAIHistory
// ============================================================
describe('listAIHistory', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    removeTmpDir(tmpDir);
  });

  it('ディレクトリが存在しないとき空配列を返す', () => {
    const result = fileOps.listAIHistory(tmpDir, ['nonexistent']);
    expect(result).toEqual([]);
  });

  it('ファイルを作成すると一覧に含まれる', () => {
    fileOps.ensureAIHistoryDir(tmpDir, ['node1']);
    const dir = path.join(tmpDir, fileOps.AI_HISTORY_SUBDIR, 'node1');
    fs.writeFileSync(path.join(dir, 'claude-session.txt'), 'data', 'utf8');
    const result = fileOps.listAIHistory(tmpDir, ['node1']);
    expect(result).toHaveLength(1);
    expect(result[0].tool).toBe('claude');
  });

  it('web-sessions.json は一覧に含まれない', () => {
    fileOps.ensureAIHistoryDir(tmpDir, ['node1']);
    const dir = path.join(tmpDir, fileOps.AI_HISTORY_SUBDIR, 'node1');
    fs.writeFileSync(path.join(dir, 'web-sessions.json'), '{}', 'utf8');
    const result = fileOps.listAIHistory(tmpDir, ['node1']);
    expect(result).toHaveLength(0);
  });

  it('新しいファイルが先頭に並ぶ（timestamp 降順）', async () => {
    fileOps.ensureAIHistoryDir(tmpDir, ['node1']);
    const dir = path.join(tmpDir, fileOps.AI_HISTORY_SUBDIR, 'node1');
    fs.writeFileSync(path.join(dir, 'gemini-first.txt'), 'first', 'utf8');
    // 1ms 間隔で mtime を変える
    await new Promise((r) => setTimeout(r, 10));
    fs.writeFileSync(path.join(dir, 'claude-second.txt'), 'second', 'utf8');
    const result = fileOps.listAIHistory(tmpDir, ['node1']);
    expect(result[0].tool).toBe('claude');
    expect(result[1].tool).toBe('gemini');
  });
});
