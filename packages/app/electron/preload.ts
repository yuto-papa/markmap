import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  showInExplorer: (filePath: string) =>
    ipcRenderer.invoke('show-in-explorer', filePath),
  createFolder: (parentPath: string, name: string) =>
    ipcRenderer.invoke('create-folder', parentPath, name),
  ensureFolderPath: (projectPath: string, segments: string[]) =>
    ipcRenderer.invoke('ensure-folder-path', projectPath, segments),
  removeFolderPath: (projectPath: string, segments: string[]) =>
    ipcRenderer.invoke('remove-folder-path', projectPath, segments),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  readTree: (projectPath: string) =>
    ipcRenderer.invoke('read-tree', projectPath),
  writeTree: (projectPath: string, data: unknown) =>
    ipcRenderer.invoke('write-tree', projectPath, data),
  readLayout: (projectPath: string) =>
    ipcRenderer.invoke('read-layout', projectPath),
  writeLayout: (
    projectPath: string,
    layout: Record<string, { x: number; y: number }>,
  ) => ipcRenderer.invoke('write-layout', projectPath, layout),
  createProject: (parentPath: string, name: string) =>
    ipcRenderer.invoke('create-project', parentPath, name),
  startCLI: (ptyId: string, command: string, cwd?: string) =>
    ipcRenderer.invoke('start-cli', ptyId, command, cwd),
  sendInputTo: (ptyId: string, data: string) =>
    ipcRenderer.send('terminal-input', ptyId, data),
  resizeTo: (ptyId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('resize-terminal', ptyId, cols, rows),
  killTerminal: (ptyId: string) => ipcRenderer.invoke('kill-terminal', ptyId),
  getTerminalBuffer: (ptyId: string) =>
    ipcRenderer.invoke('get-terminal-buffer', ptyId),
  readRecentProjects: () => ipcRenderer.invoke('read-recent-projects'),
  addRecentProject: (projectPath: string, projectName: string) =>
    ipcRenderer.invoke('add-recent-project', projectPath, projectName),
  writeNodeMarkdown: (
    projectPath: string,
    segments: string[],
    nodeName: string,
    summary: string,
    childNames: string[],
  ) =>
    ipcRenderer.invoke(
      'write-node-markdown',
      projectPath,
      segments,
      nodeName,
      summary,
      childNames,
    ),
  // NEW: Markdown file I/O
  readMarkdownFile: (filePath: string) =>
    ipcRenderer.invoke('read-markdown-file', filePath),
  writeMarkdownFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-markdown-file', filePath, content),
  // NEW: AI history
  ensureAIHistoryDir: (projectDir: string, headingPath: string[]) =>
    ipcRenderer.invoke('ensure-ai-history-dir', projectDir, headingPath),
  listAIHistory: (projectDir: string, headingPath: string[]) =>
    ipcRenderer.invoke('list-ai-history', projectDir, headingPath),
  saveWebSession: (
    projectDir: string,
    headingPath: string[],
    tool: string,
    url: string,
  ) =>
    ipcRenderer.invoke('save-web-session', projectDir, headingPath, tool, url),
  readWebSessions: (projectDir: string, headingPath: string[]) =>
    ipcRenderer.invoke('read-web-sessions', projectDir, headingPath),
  onOutputFrom: (ptyId: string, callback: (data: string) => void) => {
    const ch = `terminal-output-${ptyId}`;
    const handler = (_e: Electron.IpcRendererEvent, data: string) =>
      callback(data);
    ipcRenderer.on(ch, handler);
    return () => ipcRenderer.removeListener(ch, handler);
  },
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () =>
    ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,
  onExitFrom: (ptyId: string, callback: (exitCode: number) => void) => {
    const ch = `terminal-exit-${ptyId}`;
    const handler = (_e: Electron.IpcRendererEvent, exitCode: number) =>
      callback(exitCode);
    ipcRenderer.on(ch, handler);
    return () => ipcRenderer.removeListener(ch, handler);
  },
});
