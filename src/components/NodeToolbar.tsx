import { useDnD } from './DnDContext';

// Toolbar NO TOPO (via <Panel position="top-center"> no App):
// arrasta um card pra qualquer lugar do canvas e ele nasce ali
export default function NodeToolbar() {
  const [, setType] = useDnD();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType as 'textUpdater' | 'resizable' | 'biDirectional');
    // payload é OBRIGATÓRIO em alguns engines pro drop completar
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-toolbar">
      <div className="dndnode" onDragStart={(e) => onDragStart(e, 'textUpdater')} draggable>
        ✏️ Texto
      </div>
      <div className="dndnode" onDragStart={(e) => onDragStart(e, 'resizable')} draggable>
        ⬛ Redimensionável
      </div>
      <div className="dndnode" onDragStart={(e) => onDragStart(e, 'biDirectional')} draggable>
        ⇄ Bidirecional
      </div>
    </div>
  );
}