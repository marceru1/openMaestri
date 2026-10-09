import { memo } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';

// ============ O NODE UNIVERSAL ============
// resize (alças quando selecionado) + handles nas duas laterais
// (recebe à esquerda, envia à direita — par que permite A→B e B→A)
// O chrome (fundo/borda/padding/flex) vem do tema (.react-flow__node)

type UniversalNodeProps = NodeProps & { data: { label?: string } };

const UniversalNode = ({ id, data, selected }: UniversalNodeProps) => {
  return (
    <>
      {/* alças de resize: só quando o card está selecionado */}
      <NodeResizer isVisible={selected} minWidth={140} minHeight={80} color="#6c8cff" />
      <Handle type="target" position={Position.Left} id="left" />
      <div style={{ userSelect: 'none' }}>{data?.label ?? id}</div>
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
};

export default memo(UniversalNode);