import { useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';

// Ações do botão direito: duplicar (offset +50,+50, id único) e deletar
// (remove o node E TODAS as edges ligadas nele, nos dois sentidos)
export default function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onClick,
}: {
  id: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  onClick: () => void;
}) {
  const { getNode, addNodes, setNodes, setEdges } = useReactFlow();

  const duplicateNode = useCallback(() => {
    const node = getNode(id);
    if (!node) return;

    // id único mesmo duplicando várias vezes: n5-copy, n5-copy-copy2, ...
    const copyId = `${node.id}-copy${Date.now()}`;
    addNodes({
      ...node,
      selected: false,
      dragging: false,
      id: copyId,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
    } as Node);
    onClick();
  }, [id, getNode, addNodes, onClick]);

  const deleteNode = useCallback(() => {
    // filtra o node e as edges conectadas (source OU target — o exemplo
    // oficial só filtra source e deixa edge solta apontando pro node morto)
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) =>
      edges.filter((edge) => edge.source !== id && edge.target !== id),
    );
    onClick();
  }, [id, setNodes, setEdges, onClick]);

  // fecha sem executar nada: click nos cantos vazios do menu
  const onBackdrop = useCallback((e: ReactMouseEvent) => e.stopPropagation(), []);

  return (
    <div
      style={{ top, left, right, bottom }}
      className="context-menu"
      onClick={onBackdrop}
    >
      <p style={{ margin: '0.5em' }}>
        <small>node: {id}</small>
      </p>
      <button onClick={duplicateNode}>duplicate</button>
      <button onClick={deleteNode}>delete</button>
    </div>
  );
}