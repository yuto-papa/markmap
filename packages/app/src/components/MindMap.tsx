import { useCallback, useEffect, useRef } from 'react';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';
import type { HeadingPath, ContextMenuContext } from '../types';
import { stripHtmlTags } from '../lib/markdownPaths';

const transformer = new Transformer();

interface MindMapProps {
  markdown: string;
  onSelectHeading: (path: HeadingPath) => void;
  onShowContextMenu: (e: React.MouseEvent, ctx: ContextMenuContext) => void;
}

/**
 * Climb from clicked D3 hierarchy node up to (but not including) the root,
 * building HeadingPath from content strings.
 */
function buildHeadingPath(d3Node: unknown): HeadingPath {
  const path: string[] = [];
  let cur: any = d3Node;
  while (cur?.parent) {
    // D3 hierarchy wraps original data in .data; fall back to direct access
    const raw: string = cur.data?.content ?? cur.content ?? '';
    const text = stripHtmlTags(raw).trim();
    if (text) path.unshift(text);
    cur = cur.parent;
  }
  return path;
}

export default function MindMap({
  markdown,
  onSelectHeading,
  onShowContextMenu,
}: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<InstanceType<typeof Markmap> | null>(null);

  // Initialize markmap once
  useEffect(() => {
    if (!svgRef.current) return;
    const mm = Markmap.create(svgRef.current, {
      duration: 300,
      maxWidth: 300,
      initialExpandLevel: -1,
      zoom: true,
      pan: true,
    } as any);
    mmRef.current = mm;

    return () => {
      svgRef.current?.replaceChildren();
      mmRef.current = null;
    };
  }, []);

  // Re-render whenever markdown changes
  useEffect(() => {
    if (!mmRef.current) return;
    const { root } = transformer.transform(markdown);
    mmRef.current
      .setData(root as any)
      .then(() => mmRef.current?.fit())
      .catch(console.error);
  }, [markdown]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.target as Element;
      const nodeEl = target.closest('.markmap-node') as
        | (Element & { __data__?: unknown })
        | null;

      if (!nodeEl?.__data__) {
        onShowContextMenu(e, { type: 'root-node' });
        return;
      }

      const headingPath = buildHeadingPath(nodeEl.__data__);
      if (headingPath.length === 0) {
        onShowContextMenu(e, { type: 'root-node' });
        return;
      }
      const nodeLabel = headingPath[headingPath.length - 1];
      onShowContextMenu(e, { type: 'node', headingPath, nodeLabel });
    },
    [onShowContextMenu],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as Element;
      const nodeEl = target.closest('.markmap-node') as
        | (Element & { __data__?: unknown })
        | null;
      if (!nodeEl?.__data__) return;
      const headingPath = buildHeadingPath(nodeEl.__data__);
      if (headingPath.length > 0) {
        onSelectHeading(headingPath);
      }
    },
    [onSelectHeading],
  );

  return (
    <div
      className="mindmap-container"
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
