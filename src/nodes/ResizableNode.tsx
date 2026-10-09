import { Handle, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react';

// Tipo do node demo de resize
export type ResizableNodeType = Node<{ label: string }, 'resizable'>;

// Node demo de resize: visual pelo tema + classe; seleção também é do tema
// (borda rosa via .selectable.selected) — nada de estilo inline
export function ResizableNode({ data, selected }: NodeProps<ResizableNodeType>) {
  return (
    <>
      <NodeResizer isVisible={selected} minWidth={140} minHeight={80} color="#6c8cff" />
      <div className="resizable-node">{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}