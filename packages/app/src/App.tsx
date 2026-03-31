import { useState, useCallback, useRef, useEffect } from 'react';
import MarkdownEditor from './components/MarkdownEditor';
import MindMap from './components/MindMap';
import ContextMenu from './components/ContextMenu';
import FloatingTerminal from './components/FloatingTerminal';
import AIHistoryPanel from './components/AIHistoryPanel';
import NodeTerminal from './components/NodeTerminal';
import { LangContext } from './LangContext';
import { translations } from './i18n';
import type { Lang } from './i18n';
import TitleBar from './components/TitleBar';
import type {
  HeadingPath,
  NodeKey,
  ContextMenuState,
  TerminalMap,
} from './types';
import { nodeKeyToHeadingPath } from './lib/markdownPaths';

export type TerminalMode = 'tab' | 'float' | 'hidden';

const BOTTOM_MIN = 80;
const BOTTOM_DEFAULT = 260;

export default function App() {
  // ---- Lang ----
  const [lang, setLang] = useState<Lang>('en');
  const t = translations[lang];

  // ---- Project state ----
  const [markdown, setMarkdown] = useState<string>('');
  const [mdFilePath, setMdFilePath] = useState<string>('');
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<
    { path: string; name: string }[]
  >([]);

  // ---- Heading / selection ----
  const [selectedHeading, setSelectedHeading] = useState<HeadingPath>([]);

  // ---- Terminals ----
  const [terminals, setTerminals] = useState<TerminalMap>({});
  const [terminalModes, setTerminalModes] = useState<
    Record<NodeKey, TerminalMode>
  >({});
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // ---- Context menu ----
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ---- Bottom panel height ----
  const [bottomHeight, setBottomHeight] = useState(BOTTOM_DEFAULT);
  const bottomDragging = useRef(false);
  const bottomDragStart = useRef({ my: 0, h: 0 });

  // ---- Debounced markdown write ----
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for use inside callbacks without stale closure issues
  const mdFilePathRef = useRef(mdFilePath);
  useEffect(() => {
    mdFilePathRef.current = mdFilePath;
  }, [mdFilePath]);
  const markdownRef = useRef(markdown);
  useEffect(() => {
    markdownRef.current = markdown;
  }, [markdown]);

  // ---- Load recent projects ----
  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI
      .readRecentProjects()
      .then((list) =>
        setRecentProjects(list.map((p) => ({ path: p.path, name: p.name }))),
      )
      .catch(() => {});
  }, []);

  // ---- Open project ----
  const openProject = useCallback(async (folderPath: string) => {
    // Flush any pending write for the current project before switching
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
      if (mdFilePathRef.current && markdownRef.current) {
        window.electronAPI
          .writeMarkdownFile(mdFilePathRef.current, markdownRef.current)
          .catch(console.error);
      }
    }

    const normalized = folderPath.replace(/[\\/]+$/, '');
    const parts = normalized.split(/[\\/]/);
    const name = parts[parts.length - 1] || 'project';
    const notesPath = normalized + '/notes.md'; // '/' works on all platforms in Node.js

    let content = await window.electronAPI.readMarkdownFile(notesPath);
    if (content === null) {
      const parent = parts.slice(0, -1).join('/') || normalized;
      const result = await window.electronAPI.createProject(parent, name);
      if (!result.success) return;
      content = await window.electronAPI.readMarkdownFile(notesPath);
    }

    setProjectDir(normalized);
    setMdFilePath(notesPath);
    setMarkdown(content ?? `# ${name}\n`);
    setSelectedHeading([]);
    window.electronAPI.addRecentProject(normalized, name);
    setRecentProjects((prev) => [
      { path: normalized, name },
      ...prev.filter((p) => p.path !== normalized),
    ]);
  }, []); // deps removed — uses refs to avoid stale closures

  const openFolderDialog = useCallback(async () => {
    const folder = await window.electronAPI.openFolderDialog();
    if (folder) await openProject(folder);
  }, [openProject]);

  // ---- Markdown change ----
  const handleMarkdownChange = useCallback(
    (md: string) => {
      setMarkdown(md);
      if (!mdFilePath) return;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        window.electronAPI
          .writeMarkdownFile(mdFilePath, md)
          .catch(console.error);
      }, 500);
    },
    [mdFilePath],
  );

  // ---- Terminal operations ----
  const removeTerminal = useCallback(
    (nodeKey: NodeKey) => {
      setTerminals((prev) => {
        const next = { ...prev };
        delete next[nodeKey];
        return next;
      });
      setTerminalModes((prev) => {
        const next = { ...prev };
        delete next[nodeKey];
        return next;
      });
      setActiveTerminalId((prev) => {
        const entry = terminals[nodeKey];
        if (entry && prev === entry.ptyId) {
          const remaining = Object.entries(terminals).filter(
            ([id]) => id !== nodeKey && terminalModes[id] === 'tab',
          );
          return remaining.length > 0 ? remaining[0][1].ptyId : null;
        }
        return prev;
      });
    },
    [terminals, terminalModes],
  );

  const launchCLI = useCallback(
    async (nodeKey: NodeKey, tool: string, cwd?: string) => {
      const ptyId = `${nodeKey}-${tool}`;
      if (terminals[nodeKey]?.ptyId === ptyId) {
        setTerminalModes((prev) => ({ ...prev, [nodeKey]: 'tab' }));
        setActiveTerminalId(ptyId);
        return;
      }
      const command =
        tool === 'claude' ? 'claude' : tool === 'gemini' ? 'gemini' : tool;
      const resolvedCwd = cwd ?? projectDir ?? undefined;
      await window.electronAPI.startCLI(ptyId, command, resolvedCwd);
      setTerminals((prev) => ({ ...prev, [nodeKey]: { ptyId, tool } }));
      setTerminalModes((prev) => ({ ...prev, [nodeKey]: 'tab' }));
      setActiveTerminalId(ptyId);
    },
    [projectDir, terminals],
  );

  const hideTerminal = useCallback(
    (nodeKey: NodeKey) => {
      setTerminalModes((prev) => ({ ...prev, [nodeKey]: 'hidden' }));
      setActiveTerminalId((prevActive) => {
        const entry = terminals[nodeKey];
        if (!entry || prevActive !== entry.ptyId) return prevActive;
        // Build updated modes snapshot so the hidden terminal is excluded from search
        const updatedModes = {
          ...terminalModes,
          [nodeKey]: 'hidden' as TerminalMode,
        };
        const remaining = Object.entries(terminals).filter(
          ([id]) => id !== nodeKey && updatedModes[id] === 'tab',
        );
        return remaining.length > 0 ? remaining[0][1].ptyId : null;
      });
    },
    [terminals, terminalModes],
  );

  const floatTerminal = useCallback((nodeKey: NodeKey) => {
    setTerminalModes((prev) => ({ ...prev, [nodeKey]: 'float' }));
  }, []);

  const tabTerminal = useCallback(
    (nodeKey: NodeKey) => {
      const ptyId = terminals[nodeKey]?.ptyId;
      setTerminalModes((prev) => ({ ...prev, [nodeKey]: 'tab' }));
      if (ptyId) setActiveTerminalId(ptyId);
    },
    [terminals],
  );

  const tabEntries = Object.entries(terminals).filter(
    ([nk]) => terminalModes[nk] === 'tab',
  ) as [NodeKey, { ptyId: string; tool: string }][];

  const floatingEntries = Object.entries(terminals).filter(
    ([nk]) => terminalModes[nk] === 'float',
  ) as [NodeKey, { ptyId: string; tool: string }][];

  // ---- Context menu ----
  const showContextMenu = useCallback(
    (e: React.MouseEvent, ctx: ContextMenuState['context']) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, context: ctx });
    },
    [],
  );

  const hideContextMenu = useCallback(() => setContextMenu(null), []);

  // ---- Bottom panel drag resize ----
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!bottomDragging.current) return;
      const delta = bottomDragStart.current.my - e.clientY;
      setBottomHeight(Math.max(BOTTOM_MIN, bottomDragStart.current.h + delta));
    };
    const onMouseUp = () => {
      bottomDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const onBottomDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      bottomDragging.current = true;
      bottomDragStart.current = { my: e.clientY, h: bottomHeight };
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [bottomHeight],
  );

  const hasTerminals = tabEntries.length > 0;
  const showBottom = hasTerminals || selectedHeading.length > 0;

  return (
    <LangContext.Provider value={t}>
      <TitleBar />
      <div className="app-layout" onClick={hideContextMenu}>
        {/* Lang toggle */}
        <button
          className="lang-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setLang((l) => (l === 'en' ? 'ja' : 'en'));
          }}
          title="Switch language"
        >
          {t.lang_toggle}
        </button>

        {/* ---- Main area: editor + mindmap (flex column wrapper needed for bottom panel) ---- */}
        <div className="app-main-area">
          {/* Top: editor | mindmap */}
          <div className="main-content">
            <div className="editor-pane">
              {projectDir ? (
                <MarkdownEditor
                  value={markdown}
                  onChange={handleMarkdownChange}
                />
              ) : (
                <div className="project-open-prompt">
                  <p>{t.middle_empty}</p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 12 }}
                    onClick={openFolderDialog}
                  >
                    {t.open_folder}
                  </button>
                  {recentProjects.length > 0 && (
                    <div className="recent-projects">
                      <div className="recent-projects-title">
                        {t.recent_projects}
                      </div>
                      <ul className="recent-projects-list">
                        {recentProjects.map((p) => (
                          <li
                            key={p.path}
                            className="recent-project-item"
                            onClick={() => openProject(p.path)}
                          >
                            <span className="recent-project-name">
                              {p.name}
                            </span>
                            <span className="recent-project-path">
                              {p.path}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mindmap-pane">
              <MindMap
                markdown={markdown}
                onSelectHeading={setSelectedHeading}
                onShowContextMenu={showContextMenu}
              />
            </div>
          </div>

          {/* Bottom panel */}
          {showBottom && (
            <>
              <div
                className="middle-divider"
                onMouseDown={onBottomDividerMouseDown}
              >
                <div className="middle-divider-handle" />
              </div>
              <div className="middle-bottom" style={{ height: bottomHeight }}>
                {hasTerminals ? (
                  <>
                    <div className="terminal-tab-bar">
                      {tabEntries.map(([nk, entry]) => (
                        <div
                          key={entry.ptyId}
                          className={`terminal-tab${activeTerminalId === entry.ptyId ? ' active' : ''}`}
                          onClick={() => {
                            setActiveTerminalId(entry.ptyId);
                            setSelectedHeading(nodeKeyToHeadingPath(nk));
                          }}
                        >
                          <span className={`terminal-tab-icon ${entry.tool}`}>
                            {(entry.tool[0] ?? '?').toUpperCase()}
                          </span>
                          <span className="terminal-tab-label">
                            {nk === '__root__'
                              ? 'Root'
                              : (nodeKeyToHeadingPath(nk).slice(-1)[0] ?? nk)}
                          </span>
                          <button
                            className="terminal-tab-float"
                            title={t.tooltip_float_window}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              floatTerminal(nk);
                            }}
                          >
                            ↗
                          </button>
                          <button
                            className="terminal-tab-close"
                            title={t.tooltip_hide_terminal}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              hideTerminal(nk);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="terminal-tab-content">
                      {tabEntries.map(([nk, entry]) => (
                        <div
                          key={entry.ptyId}
                          className="terminal-tab-panel"
                          style={{
                            display:
                              activeTerminalId === entry.ptyId
                                ? 'flex'
                                : 'none',
                          }}
                        >
                          <NodeTerminal
                            ptyId={entry.ptyId}
                            nodeId={nk}
                            projectPath={projectDir}
                            isActive={activeTerminalId === entry.ptyId}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <AIHistoryPanel
                    projectDir={projectDir}
                    headingPath={selectedHeading}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Floating terminals */}
        {floatingEntries.map(([nk, entry], i) => (
          <FloatingTerminal
            key={entry.ptyId}
            nodeKey={nk}
            ptyId={entry.ptyId}
            tool={entry.tool}
            projectPath={projectDir}
            initialOffset={i * 32}
            onTabTerminal={tabTerminal}
            onHideTerminal={hideTerminal}
            onRemoveTerminal={removeTerminal}
          />
        ))}

        {/* Context menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            context={contextMenu.context}
            projectDir={projectDir}
            onLaunchCLI={launchCLI}
            onClose={hideContextMenu}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}
