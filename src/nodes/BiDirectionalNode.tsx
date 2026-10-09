import { memo } from 'react';
import { type NodeProps, Handle, Position } from '@xyflow/react';

// Handles nas duas laterais: target à esquerda (recebe) + source à direita (envia).
// É esse par que permite A→B e B→A (cada edge conecta source de um → target do outro)
const BiDirectionalNode = ({ data }: NodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Left} id="left" />
      {data?.label}
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
};

export default memo(BiDirectionalNode);