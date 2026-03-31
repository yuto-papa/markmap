import { useEffect, useState } from 'react';
import type { AIHistoryEntry, HeadingPath, WebSessions } from '../types';
import { useLang } from '../LangContext';
import { isElectron } from '../lib/platform';

interface AIHistoryPanelProps {
  projectDir: string | null;
  headingPath: HeadingPath;
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString();
  } catch {
    return isoStr;
  }
}

const TOOL_LABELS: Record<string, string> = {
  claude: 'Claude CLI',
  gemini: 'Gemini CLI',
  unknown: 'Unknown',
};

export default function AIHistoryPanel({
  projectDir,
  headingPath,
}: AIHistoryPanelProps) {
  const t = useLang();
  const [history, setHistory] = useState<AIHistoryEntry[]>([]);
  const [sessions, setSessions] = useState<WebSessions>({});

  useEffect(() => {
    if (!projectDir || !isElectron()) {
      setHistory([]);
      setSessions({});
      return;
    }

    let cancelled = false;
    const load = async () => {
      const [hist, sess] = await Promise.all([
        window.electronAPI.listAIHistory(projectDir, headingPath),
        window.electronAPI.readWebSessions(projectDir, headingPath),
      ]);
      if (!cancelled) {
        setHistory(hist);
        setSessions(sess);
      }
    };
    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [projectDir, headingPath]);

  const openUrl = (url: string) => {
    window.electronAPI?.openExternal(url);
  };

  const isEmpty =
    history.length === 0 && !sessions.copilot && !sessions.perplexity;

  return (
    <div className="ai-history-panel">
      <div className="ai-history-header">
        {headingPath.length > 0 ? headingPath.join(' / ') : t.ai_history}
      </div>

      <div className="ai-history-body">
        {isEmpty && <div className="ai-history-empty">{t.no_history_yet}</div>}

        {(sessions.copilot || sessions.perplexity) && (
          <div className="ai-history-section">
            <div className="ai-history-section-label">Web Sessions</div>
            {sessions.copilot && (
              <div
                className="ai-history-url-item"
                title={sessions.copilot}
                onClick={() => openUrl(sessions.copilot!)}
              >
                <span className="ai-history-tool-badge copilot">Copilot</span>
                <span className="ai-history-url-text">{sessions.copilot}</span>
              </div>
            )}
            {sessions.perplexity && (
              <div
                className="ai-history-url-item"
                title={sessions.perplexity}
                onClick={() => openUrl(sessions.perplexity!)}
              >
                <span className="ai-history-tool-badge perplexity">
                  Perplexity
                </span>
                <span className="ai-history-url-text">
                  {sessions.perplexity}
                </span>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="ai-history-section">
            <div className="ai-history-section-label">CLI Sessions</div>
            {history.map((entry, i) => (
              <div key={i} className="ai-history-file-item">
                <span className={`ai-history-tool-badge ${entry.tool}`}>
                  {TOOL_LABELS[entry.tool] ?? entry.tool}
                </span>
                <span className="ai-history-timestamp">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
