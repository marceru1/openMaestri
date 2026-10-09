import { useRef, useState, type PointerEvent } from 'react';
import { useReactFlow, useStore, type Edge, type Rect } from '@xyflow/react';

// ============ LASSO RETANGULAR (marquee) ============
// Overlay transparente captura o pointer e desenha um retângulo;
// nodes são selecionados por INTERSEÇÃO COM O RECT (em coords de flow,
// zoom/pan-aware) e edges entram na seleção junto (full: ambos os
// terminais dentro; parcial: qualquer terminal).
// Substitui o laço freehand (canvas + perfect-freehand) pelo marquee.

type Box = { x: number; y: number; width: number; height: number };
type MarqueeRect = { left: number; top: number; width: number; height: number };

export function Lasso({ partial, onDone }: { partial: boolean; onDone?: () => void }) {
  const { screenToFlowPosition, setNodes, setEdges } = useReactFlow();
  const { nodeLookup, edges } = useStore((state) => ({
    nodeLookup: state.nodeLookup,
    edges: state.edges,
  }));

  const wrapper = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);   // client coords
  const overlayBox = useRef<DOMRect | null>(null);
  // snapshots de flow-coords tomados no pointerdown
  const nodeBoxes = useRef<Record<string, Box>>({});
  const edgeList = useRef<{ id: string; source: string; target: string }[]>([]);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const drewRect = useRef(false); // marquee realmente desenhado? (uso único)

  function snapshot() {
    nodeBoxes.current = {};
    for (const [id, node] of nodeLookup) {
      const { x, y } = node.internals.positionAbsolute;
      const { width = 0, height = 0 } = node.measured ?? {};
      nodeBoxes.current[id] = { x, y, width, height };
    }
    edgeList.current = edges.map((e: Edge) => ({ id: e.id, source: e.source, target: e.target }));
  }

  function rectInFlow(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
    const p1 = screenToFlowPosition(a);
    const p2 = screenToFlowPosition(b);
    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.abs(p1.x - p2.x),
      height: Math.abs(p1.y - p2.y),
    };
  }

  function applySelection(r: Rect) {
    const selectedNodes = new Set<string>();
    const selectedEdges = new Set<string>();

    for (const [id, box] of Object.entries(nodeBoxes.current)) {
      const hit = partial
        ? box.x < r.x + r.width && box.x + box.width > r.x && box.y < r.y + r.height && box.y + box.height > r.y
        : box.x >= r.x && box.y >= r.y && box.x + box.width <= r.x + r.width && box.y + box.height <= r.y + r.height;
      if (hit) selectedNodes.add(id);
    }

    for (const e of edgeList.current) {
      const hit = partial
        ? selectedNodes.has(e.source) || selectedNodes.has(e.target)
        : selectedNodes.has(e.source) && selectedNodes.has(e.target);
      if (hit) selectedEdges.add(e.id);
    }

    setNodes((nodes) => nodes.map((node) => ({ ...node, selected: selectedNodes.has(node.id) })));
    setEdges((es) => es.map((edge) => ({ ...edge, selected: selectedEdges.has(edge.id) })));
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
    overlayBox.current = wrapper.current?.getBoundingClientRect() ?? null;
    origin.current = { x: e.clientX, y: e.clientY };
    drewRect.current = false;
    snapshot();
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.buttons !== 1 || !origin.current || !overlayBox.current) return;

    // retângulo desenhado (coords locais do overlay, só visual)
    const l = overlayBox.current;
    const left = Math.min(origin.current.x, e.clientX) - l.left;
    const top = Math.min(origin.current.y, e.clientY) - l.top;
    setMarquee({
      left,
      top,
      width: Math.abs(origin.current.x - e.clientX),
      height: Math.abs(origin.current.y - e.clientY),
    });
    drewRect.current = true;

    // hit-test em coords de FLOW (zoom/pan-aware)
    applySelection(rectInFlow(origin.current, { x: e.clientX, y: e.clientY }));
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    (e.target as HTMLDivElement).releasePointerCapture(e.pointerId);
    origin.current = null;
    overlayBox.current = null;
    setMarquee(null); // seleção permanece (o traço que some)
    // uso único: terminou um traço real → volta pro modo Select
    if (drewRect.current) onDone?.();
    drewRect.current = false;
  }

  return (
    <div
      ref={wrapper}
      className="tool-overlay"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {marquee && (
        <div
          className="lasso-rect"
          style={{ left: marquee.left, top: marquee.top, width: marquee.width, height: marquee.height }}
        />
      )}
    </div>
  );
}