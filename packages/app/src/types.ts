// ===================== NEW types (HeadingPath-based) =====================

export type HeadingPath = string[]; // e.g. ['認証方式', 'OAuth調査']
export type NodeKey = string; // headingPath.join('/') — TerminalMap のキー

export interface AIHistoryEntry {
  tool: string;
  filePath: string;
  timestamp: string;
}

export interface WebSessions {
  copilot?: string;
  perplexity?: string;
}

// ===================== SHARED types =====================

export interface TerminalEntry {
  ptyId: string;
  tool: string;
}

export type TerminalMap = Record<string, TerminalEntry>;

export interface ContextMenuContext {
  type: string;
  // NEW fields
  headingPath?: HeadingPath;
  nodeLabel?: string;
  // OLD fields (kept for backward compat during migration)
  node?: TreeNode | null;
  treeData?: TreeData | null;
  entry?: { path: string; isDir: boolean; name?: string } | null;
  onRefreshDir?: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  context: ContextMenuContext;
}

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

// ===================== LEGACY types (kept for migration) =====================

export interface NodeSessions {
  claude: string | null;
  codex: string | null;
  gemini: string | null;
  copilot: string | null;
  perplexity: string | null;
}

export interface TreeNode {
  id: string;
  name: string;
  expanded: boolean;
  summary: string;
  children: TreeNode[];
  sessions: NodeSessions;
  urls: string[];
}

export interface TreeData {
  name: string;
  children: TreeNode[];
}

// ===================== Electron API =====================

declare global {
  interface Window {
    electronAPI: {
      showInExplorer: (filePath: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowIsMaximized: () => Promise<boolean>;
      createFolder: (
        parentPath: string,
        name: string,
      ) => Promise<{ success: boolean; folderPath?: string; error?: string }>;
      ensureFolderPath: (
        projectPath: string,
        segments: string[],
      ) => Promise<{ success: boolean; folderPath?: string; error?: string }>;
      removeFolderPath: (
        projectPath: string,
        segments: string[],
      ) => Promise<{ success: boolean; error?: string }>;
      getHomeDir: () => Promise<string>;
      openFolderDialog: () => Promise<string | null>;
      readDir: (dirPath: string) => Promise<DirEntry[]>;
      createProject: (
        parentPath: string,
        name: string,
      ) => Promise<{ success: boolean; projectPath?: string; error?: string }>;
      startCLI: (
        ptyId: string,
        command: string,
        cwd?: string,
      ) => Promise<{ success: boolean; error?: string }>;
      sendInputTo: (ptyId: string, data: string) => void;
      resizeTo: (ptyId: string, cols: number, rows: number) => Promise<void>;
      killTerminal: (ptyId: string) => Promise<void>;
      getTerminalBuffer: (ptyId: string) => Promise<string>;
      readRecentProjects: () => Promise<
        { path: string; name: string; openedAt: string }[]
      >;
      addRecentProject: (
        projectPath: string,
        projectName: string,
      ) => Promise<{ success: boolean }>;
      // LEGACY (kept for transition period — App.tsx rewrite will remove usage)
      readTree: (projectPath: string) => Promise<TreeData | null>;
      writeTree: (
        projectPath: string,
        data: TreeData,
      ) => Promise<{ success: boolean; error?: string }>;
      readLayout: (
        projectPath: string,
      ) => Promise<Record<string, { x: number; y: number }>>;
      writeLayout: (
        projectPath: string,
        layout: Record<string, { x: number; y: number }>,
      ) => Promise<{ success: boolean }>;
      writeNodeMarkdown: (
        projectPath: string,
        segments: string[],
        nodeName: string,
        summary: string,
        childNames: string[],
      ) => Promise<{ success: boolean; error?: string }>;
      // NEW methods
      readMarkdownFile: (filePath: string) => Promise<string | null>;
      writeMarkdownFile: (
        filePath: string,
        content: string,
      ) => Promise<{ success: boolean; error?: string }>;
      ensureAIHistoryDir: (
        projectDir: string,
        headingPath: string[],
      ) => Promise<{ success: boolean; folderPath?: string; error?: string }>;
      listAIHistory: (
        projectDir: string,
        headingPath: string[],
      ) => Promise<AIHistoryEntry[]>;
      saveWebSession: (
        projectDir: string,
        headingPath: string[],
        tool: string,
        url: string,
      ) => Promise<{ success: boolean; error?: string }>;
      readWebSessions: (
        projectDir: string,
        headingPath: string[],
      ) => Promise<WebSessions>;
      onOutputFrom: (
        ptyId: string,
        callback: (data: string) => void,
      ) => () => void;
      onExitFrom: (
        ptyId: string,
        callback: (exitCode: number) => void,
      ) => () => void;
    };
  }
}
