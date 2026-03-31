import { useEffect, useRef, useState } from 'react';
import type { ContextMenuContext } from '../types';
import {
  headingPathToSegments,
  headingPathToNodeKey,
} from '../lib/markdownPaths';
import { isElectron } from '../lib/platform';
import { useLang } from '../LangContext';

interface ContextMenuProps {
  x: number;
  y: number;
  context: ContextMenuContext;
  projectDir: string | null;
  onLaunchCLI: (nodeKey: string, tool: string, cwd?: string) => void;
  onClose: () => void;
}

type InlineMode = 'save-copilot-url' | 'save-perplexity-url';

export default function ContextMenu({
  x,
  y,
  context,
  projectDir,
  onLaunchCLI,
  onClose,
}: ContextMenuProps) {
  const t = useLang();
  const [inlineMode, setInlineMode] = useState<InlineMode | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineMode) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [inlineMode]);

  const { type, headingPath = [], nodeLabel: _label } = context;

  /** Ensure .ai-history dir exists and return its path */
  const resolveAICwd = async (): Promise<string | undefined> => {
    if (!projectDir) return undefined;
    if (!headingPath.length) return projectDir;
    const result = await window.electronAPI.ensureAIHistoryDir(
      projectDir,
      headingPath,
    );
    return result.success ? result.folderPath : projectDir;
  };

  const handleLaunchCLI = (tool: string) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nodeKey =
      headingPath.length > 0 ? headingPathToNodeKey(headingPath) : '__root__';
    const cwd = await resolveAICwd();
    onLaunchCLI(nodeKey, tool, cwd);
    onClose();
  };

  const handleOpenWeb =
    (defaultUrl: string, sessionKey: 'copilot' | 'perplexity') =>
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.electronAPI?.openExternal) {
        onClose();
        return;
      }
      let url = defaultUrl;
      if (projectDir && headingPath.length) {
        const sessions = await window.electronAPI.readWebSessions(
          projectDir,
          headingPath,
        );
        if (sessions[sessionKey]) url = sessions[sessionKey]!;
      }
      window.electronAPI.openExternal(url);
      onClose();
    };

  const startInline = (mode: InlineMode) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    setInlineMode(mode);
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = inputValue.trim();
    if (url && projectDir && headingPath.length && inlineMode) {
      const toolKey =
        inlineMode === 'save-copilot-url' ? 'copilot' : 'perplexity';
      await window.electronAPI.saveWebSession(
        projectDir,
        headingPath,
        toolKey,
        url,
      );
    }
    onClose();
  };

  const isNodeOrRoot = type === 'node' || type === 'root-node';

  if (inlineMode) {
    const placeholder =
      inlineMode === 'save-copilot-url'
        ? t.placeholder_copilot_url
        : t.placeholder_perplexity_url;

    return (
      <div
        className="context-menu"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        <form className="context-inline-form" onSubmit={handleInlineSubmit}>
          <input
            ref={inputRef}
            className="context-inline-input"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <button type="submit" className="context-inline-btn">
            {t.btn_save}
          </button>
        </form>
      </div>
    );
  }

  if (!isNodeOrRoot) return null;

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {isElectron() && (
        <>
          <div
            className="context-menu-item"
            onClick={handleLaunchCLI('claude')}
          >
            {t.claude_open}
          </div>
          <div
            className="context-menu-item"
            onClick={handleLaunchCLI('gemini')}
          >
            {t.gemini_open}
          </div>
          <div className="context-menu-sep" />
        </>
      )}
      <div
        className="context-menu-item"
        onClick={handleOpenWeb('https://copilot.microsoft.com/', 'copilot')}
      >
        {t.copilot_open_browser}
      </div>
      <div
        className="context-menu-item"
        onClick={startInline('save-copilot-url')}
      >
        {t.copilot_save_url}
      </div>
      <div className="context-menu-sep" />
      <div
        className="context-menu-item"
        onClick={handleOpenWeb('https://www.perplexity.ai/', 'perplexity')}
      >
        {t.perplexity_open_browser}
      </div>
      <div
        className="context-menu-item"
        onClick={startInline('save-perplexity-url')}
      >
        {t.perplexity_save_url}
      </div>
    </div>
  );
}
