import { getBezierPath, type ConnectionLineComponentProps, type InternalNode } from '@xyflow/react';

import { getEdgeParams } from './initialElements';

function FloatingConnectionLine({
  toX,
  toY,
  fromPosition,
  toPosition,
  fromNode,
  fromHandle,
}: ConnectionLineComponentProps) {
  if (!fromNode || !fromHandle) {
    return null;
  }

  // linha AZUL quando a conexão SAI do node (handle source / direita);
  // conexões que saem do target (arrastou o esquerdo pra buscar) = padrão
  const isOutgoing = fromHandle.type === 'source';
  const stroke = isOutgoing ? '#3b82f6' : '#222';

  // Create a mock target node at the cursor position
  const targetNode = {
    id: 'connection-target',
    measured: {
      width: 1,
      height: 1,
    },
    internals: {
      positionAbsolute: { x: toX, y: toY },
    },
  };

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    fromNode,
    targetNode as unknown as InternalNode,
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos || fromPosition,
    targetPosition: targetPos || toPosition,
    targetX: tx || toX,
    targetY: ty || toY,
  });

  return (
    <g>
      <path
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        className="animated"
        d={edgePath}
      />
      <circle
        cx={tx || toX}
        cy={ty || toY}
        fill="#fff"
        r={3}
        stroke={stroke}
        strokeWidth={1.5}
      />
    </g>
  );
}

export default FloatingConnectionLine;