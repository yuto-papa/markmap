import fs from 'fs';
import path from 'path';
import os from 'os';
import type { TreeData, AIHistoryEntry, WebSessions } from '../src/types';

export const THINKTOOL_DIR = path.join(os.homedir(), '.thinktool');
export const RECENT_PATH = path.join(THINKTOOL_DIR, 'recent.json');
export const MAX_RECENT = 16;
export const AI_HISTORY_SUBDIR = '.ai-history';

export interface RecentProject {
  path: string;
  name: string;
  openedAt: string;
}

export interface OpResult {
  success: boolean;
  error?: string;
}

export interface FolderResult extends OpResult {
  folderPath?: string;
}

export interface ProjectResult extends OpResult {
  projectPath?: string;
}

interface AddRecentOptions {
  recentPath?: string;
  thinktoolDir?: string;
  maxRecent?: number;
}

export function safeSegments(segments: string[]): string[] {
  return segments.map((s) =>
    s === '..' ? '_' : s.replace(/[\\/:*?"<>|]/g, '_'),
  );
}

// ============================================================
// Recent projects
// ============================================================

export function readRecentProjects(recentPath = RECENT_PATH): RecentProject[] {
  try {
    if (!fs.existsSync(recentPath)) return [];
    return JSON.parse(fs.readFileSync(recentPath, 'utf8')) as RecentProject[];
  } catch {
    return [];
  }
}

export function addRecentProject(
  projectPath: string,
  projectName: string,
  {
    recentPath = RECENT_PATH,
    thinktoolDir = THINKTOOL_DIR,
    maxRecent = MAX_RECENT,
  }: AddRecentOptions = {},
): OpResult {
  try {
    fs.mkdirSync(thinktoolDir, { recursive: true });
    let list = readRecentProjects(recentPath);
    list = list.filter((item) => item.path !== projectPath);
    list.unshift({
      path: projectPath,
      name: projectName,
      openedAt: new Date().toISOString(),
    });
    if (list.length > maxRecent) list = list.slice(0, maxRecent);
    fs.writeFileSync(recentPath, JSON.stringify(list, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// Folder operations
// ============================================================

export function ensureFolderPath(
  projectPath: string,
  segments: string[],
): FolderResult {
  try {
    const folderPath = path.join(projectPath, ...safeSegments(segments));
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true, folderPath };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function removeFolderPath(
  projectPath: string,
  segments: string[],
): OpResult {
  try {
    const folderPath = path.join(projectPath, ...safeSegments(segments));
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function createFolder(parentPath: string, name: string): FolderResult {
  try {
    const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
    const folderPath = path.join(parentPath, safeName);
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true, folderPath };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// Project management
// ============================================================

/**
 * プロジェクトフォルダを作成し notes.md を初期化する。
 * notes.md が既に存在する場合は上書きしない。
 */
export function createProject(parentPath: string, name: string): ProjectResult {
  try {
    const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
    const projectPath = path.join(parentPath, safeName);
    fs.mkdirSync(projectPath, { recursive: true });
    const notesPath = path.join(projectPath, 'notes.md');
    if (!fs.existsSync(notesPath)) {
      fs.writeFileSync(notesPath, `# ${safeName}\n`, 'utf8');
    }
    return { success: true, projectPath };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// Markdown file I/O
// ============================================================

export function readMarkdownFile(filePath: string): string | null {
  try {
    const resolved = path.resolve(filePath);
    if (!resolved.toLowerCase().endsWith('.md')) return null;
    if (!fs.existsSync(resolved)) return null;
    return fs.readFileSync(resolved, 'utf8');
  } catch {
    return null;
  }
}

export function writeMarkdownFile(filePath: string, content: string): OpResult {
  try {
    const resolved = path.resolve(filePath);
    if (!resolved.toLowerCase().endsWith('.md')) {
      return { success: false, error: 'Only .md files allowed' };
    }
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============================================================
// AI history
// ============================================================

function getAIHistoryDir(projectDir: string, headingPath: string[]): string {
  return path.join(projectDir, AI_HISTORY_SUBDIR, ...safeSegments(headingPath));
}

function checkTraversal(dir: string, projectDir: string): boolean {
  const resolved = path.resolve(dir);
  const resolvedProject = path.resolve(projectDir);
  // Fix: if resolvedProject already ends with sep (e.g. 'C:\'), avoid double-sep
  const suffix = resolvedProject.endsWith(path.sep) ? '' : path.sep;
  return (
    resolved === resolvedProject ||
    resolved.startsWith(resolvedProject + suffix)
  );
}

export function ensureAIHistoryDir(
  projectDir: string,
  headingPath: string[],
): FolderResult {
  try {
    const dir = getAIHistoryDir(projectDir, headingPath);
    if (!checkTraversal(dir, projectDir)) {
      return { success: false, error: 'Path traversal detected' };
    }
    fs.mkdirSync(dir, { recursive: true });
    return { success: true, folderPath: dir };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function listAIHistory(
  projectDir: string,
  headingPath: string[],
): AIHistoryEntry[] {
  try {
    const dir = getAIHistoryDir(projectDir, headingPath);
    if (!checkTraversal(dir, projectDir)) return [];
    if (!fs.existsSync(dir)) return [];

    const entries: AIHistoryEntry[] = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      if (file.name === 'web-sessions.json') continue;
      const filePath = path.join(dir, file.name);
      const stat = fs.statSync(filePath);
      // Extract tool name from filename convention: <tool>[-_.]...
      const toolMatch = file.name.match(/^([a-z]+)[-_.]/);
      const tool = toolMatch ? toolMatch[1] : 'unknown';
      entries.push({ tool, filePath, timestamp: stat.mtime.toISOString() });
    }
    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export function saveWebSession(
  projectDir: string,
  headingPath: string[],
  tool: string,
  url: string,
): OpResult {
  try {
    const dir = getAIHistoryDir(projectDir, headingPath);
    if (!checkTraversal(dir, projectDir)) {
      return { success: false, error: 'Path traversal detected' };
    }
    fs.mkdirSync(dir, { recursive: true });
    const sessionsPath = path.join(dir, 'web-sessions.json');
    let sessions: Record<string, string> = {};
    if (fs.existsSync(sessionsPath)) {
      try {
        sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
      } catch {
        /* ignore */
      }
    }
    sessions[tool] = url;
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function readWebSessions(
  projectDir: string,
  headingPath: string[],
): WebSessions {
  try {
    const dir = getAIHistoryDir(projectDir, headingPath);
    if (!checkTraversal(dir, projectDir)) return {};
    const sessionsPath = path.join(dir, 'web-sessions.json');
    if (!fs.existsSync(sessionsPath)) return {};
    return JSON.parse(fs.readFileSync(sessionsPath, 'utf8')) as WebSessions;
  } catch {
    return {};
  }
}

// ============================================================
// LEGACY: kept for backward-compat (tests + old IPC handlers)
// These will be removed in Phase 12 after tests are updated.
// ============================================================

export function readTree(projectPath: string): TreeData | null {
  const treePath = path.join(projectPath, 'tree.json');
  if (!fs.existsSync(treePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(treePath, 'utf8')) as TreeData;
  } catch {
    return null;
  }
}

export function writeTree(projectPath: string, data: TreeData): OpResult {
  try {
    const treePath = path.join(projectPath, 'tree.json');
    fs.writeFileSync(treePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function readLayout(
  projectPath: string,
): Record<string, { x: number; y: number }> {
  const layoutPath = path.join(projectPath, 'layout.json');
  if (!fs.existsSync(layoutPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(layoutPath, 'utf8')) as Record<
      string,
      { x: number; y: number }
    >;
  } catch {
    return {};
  }
}

export function writeLayout(
  projectPath: string,
  layout: Record<string, { x: number; y: number }>,
): OpResult {
  try {
    const layoutPath = path.join(projectPath, 'layout.json');
    fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function writeNodeMarkdown(
  projectPath: string,
  segments: string[],
  nodeName: string,
  summary: string,
  childNames: string[],
): OpResult {
  try {
    const safe = safeSegments(segments);
    const folderPath = path.join(projectPath, ...safe);

    const resolvedFolder = path.resolve(folderPath);
    const resolvedProject = path.resolve(projectPath);
    if (
      !resolvedFolder.startsWith(resolvedProject + path.sep) &&
      resolvedFolder !== resolvedProject
    ) {
      return { success: false, error: 'Path traversal detected' };
    }

    fs.mkdirSync(folderPath, { recursive: true });

    const summarySection = summary.trim()
      ? `## Summary\n\n${summary.trim()}\n\n---\n\n`
      : '';

    const childrenSection =
      childNames.length > 0
        ? `## Sub-topics\n\n${childNames.map((n) => `- ${n}`).join('\n')}\n`
        : '';

    const content = `# ${nodeName}\n\n${summarySection}${childrenSection}`;
    const mdPath = path.join(folderPath, 'README.md');
    fs.writeFileSync(mdPath, content, 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
