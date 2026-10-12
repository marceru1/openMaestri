import { useDnD } from './DnDContext';

// Toolbar NO TOPO (via <Panel position="top-center"> no App):
// clique num card = ESCOLHE a ferramenta; clique no canvas = coloca lá.
// One-shot: depois de colocar, volta pra seleção. O chip do laço é
// mutuamente exclusivo (escolher card sai do laço e vice-versa).
export default function NodeToolbar({
  isLassoActive,
  onSetLasso,
}: {
  isLassoActive: boolean;
  onSetLasso: (active: boolean) => void;
}) {
  const [selectedType, selectType] = useDnD();

  // clica de novo no mesmo card = cancela a escolha
  const pick = (nodeType: string) => {
    selectType(selectedType === nodeType ? null : (nodeType as typeof selectedType));
    onSetLasso(false);
  };

  return (
    <div className="node-toolbar">
      <div
        className={`dndnode ${selectedType === 'textUpdater' ? 'active' : ''}`}
        onClick={() => pick('textUpdater')}
      >
        ✏️ Texto
      </div>
      <div
        className={`dndnode ${selectedType === 'resizable' ? 'active' : ''}`}
        onClick={() => pick('resizable')}
      >
        ⬛ Redimensionável
      </div>
      <div
        className={`dndnode ${selectedType === 'biDirectional' ? 'active' : ''}`}
        onClick={() => pick('biDirectional')}
      >
        ⇄ Bidirecional
      </div>
      <div
        className={`dndnode ${selectedType === 'terminal' ? 'active' : ''}`}
        onClick={() => pick('terminal')}
      >
        ⌨️ Terminal
      </div>
      <div className="node-toolbar__divider" />
      <button
        type="button"
        className={`dndnode node-toolbar__tool ${isLassoActive ? 'active' : ''}`}
        onClick={() => {
          selectType(null);
          onSetLasso(!isLassoActive);
        }}
        title="Laço: seleciona tudo que o retângulo cruza (volta pro Select ao terminar)"
        aria-pressed={isLassoActive}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3.5 3"
          />
        </svg>
        Laço
      </button>
    </div>
  );
}