import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';

interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function MarkdownEditor({
  value,
  onChange,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep ref up-to-date without remounting editor
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Mount editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          markdown(),
          oneDark,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': { height: '100%', background: '#0d0d1a', color: '#cdd6f4' },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: '"Cascadia Code", "Consolas", monospace',
              fontSize: '13px',
            },
            '.cm-content': { padding: '8px 0' },
            '.cm-gutters': {
              background: '#0d0d1a',
              borderRight: '1px solid #2a2a3c',
              color: '#6c7086',
            },
            '.cm-activeLine': { backgroundColor: 'rgba(89,137,250,0.05)' },
            '.cm-activeLineGutter': {
              backgroundColor: 'rgba(89,137,250,0.08)',
            },
            '.cm-cursor': { borderLeftColor: '#89b4fa' },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once only; value sync is handled below

  // Sync external value → editor (e.g. when project is opened)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (value === view.state.doc.toString()) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}
