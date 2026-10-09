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
      {/* alças de resize: só quando o card está selecionado.
          min ABAIXO do tamanho natural (58x34) — se o min for maior,
          arrastar pra encolher CLAMPA e o node cresce sozinho (bug).
          max generoso: 4x a viewport típica. */}
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={28}
        maxWidth={4000}
        maxHeight={4000}
        color="#6c8cff"
      />
      <Handle type="target" position={Position.Left} id="left" />
      <div style={{ userSelect: 'none' }}>{data?.label ?? id}</div>
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
};

export default memo(UniversalNode);