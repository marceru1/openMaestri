import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, type ChangeEvent } from 'react';

// Tipo do data que esse node recebe (guia TS do React Flow)
export type TextNodeType = Node<{ value: string }, 'textUpdater'>;

// Card de texto: visual 100% pelo tema (xy-theme.css), zero inline style.
// "nodrag" no input segue obrigatório (classe de comportamento, não estilo)
export function TextUpdaterNode({ id, data }: NodeProps<TextNodeType>) {
  const { updateNodeData } = useReactFlow();
  const onChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { value: evt.target.value });
  }, [id, updateNodeData]);

  return (
    <div className="text-updater-node">
      <label htmlFor="text" className="xy-theme__label">
        Text:
      </label>
      <input
        id="text"
        name="text"
        value={data.value ?? ''}
        onChange={onChange}
        className="xy-theme__input nodrag"
      />
      {/* mesma lateral de todos: target esquerda / source direita (bidirecional) */}
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
    </div>
  );
}