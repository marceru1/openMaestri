import type { CSSProperties } from 'react';
import {
  useStore,
  useInternalNode,
  useReactFlow,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { getEdgeParams } from './initialElements';

// ============ FLOATING EDGE v3 ============
// 1) floating: sai da BORDA mais próxima do vizinho (getEdgeParams) — recalcula ao mover
// 2) bidirecional: se existe a edge de volta (B→A), AMBAS curvam pra lados opostos
//    (getSpecialPath do BiDirectionalEdge integrado)
// 3) botão × no meio da linha (EdgeLabelRenderer) pra deletar a edge
//    (getBezierPath tb devolve labelX/labelY — centro do path)

export const getSpecialPath = (
  { sourceX, sourceY, targetX, targetY }: { sourceX: number; sourceY: number; targetX: number; targetY: number },
  offset: number,
) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  return `M ${sourceX} ${sourceY} Q ${centerX} ${centerY + offset} ${targetX} ${targetY}`;
};

function FloatingEdge({
  id,
  source,
  target,
  style,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { setEdges } = useReactFlow();

  // existe a edge de volta? (B→A) — se sim, curva pro lado
  const isBidirectional = useStore((s) =>
    s.edges.some((e) => e.source === target && e.target === source),
  );

  if (!sourceNode?.measured || !targetNode?.measured) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  let path: string;
  let labelX: number;
  let labelY: number;
  if (isBidirectional) {
    // curva de lado conforme a direção esquerda→direita (igual BiDirectionalEdge)
    path = getSpecialPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty }, sx < tx ? 25 : -25);
    // centro da quadrática: B(t=0.5) = (P0 + 2*P1 + P2) / 4
    labelX = (sx + 2 * ((sx + tx) / 2) + tx) / 4;
    labelY = (sy + 2 * (((sy + ty) / 2) + (sx < tx ? 25 : -25)) + ty) / 4;
  } else {
    [path, labelX, labelY] = getBezierPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
  }

  // × no meio da edge: remove SÓ esta edge
  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={path} style={style as CSSProperties} />
      <EdgeLabelRenderer>
        <div
          className="button-edge__label nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button className="button-edge__button" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default FloatingEdge;