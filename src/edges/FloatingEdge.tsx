import type { CSSProperties } from 'react';
import { useStore, useInternalNode, getBezierPath, type EdgeProps } from '@xyflow/react';
import { getEdgeParams } from './initialElements';

// ============ FLOATING EDGE v2 ============
// 1) floating: sai da BORDA mais próxima do vizinho (getEdgeParams) — recalcula ao mover
// 2) bidirecional: se existe a edge de volta (B→A), AMBAS curvam pra lados opostos
//    (getSpecialPath do BiDirectionalEdge integrado)
// 3) seta na ponta: markerEnd passa direto (definido na edge ou default no App)

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
  markerEnd,
  style,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  // existe a edge de volta? (B→A) — se sim, curva pro lado
  const isBidirectional = useStore((s) =>
    s.edges.some((e) => e.source === target && e.target === source),
  );

  if (!sourceNode?.measured || !targetNode?.measured) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  let path: string;
  if (isBidirectional) {
    // curva de lado conforme a direção esquerda→direita (igual BiDirectionalEdge)
    path = getSpecialPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty }, sx < tx ? 25 : -25);
  } else {
    [path] = getBezierPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
  }

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={path}
      markerEnd={markerEnd}
      style={style as CSSProperties}
    />
  );
}

export default FloatingEdge;