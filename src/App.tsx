import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Panel,
  addEdge,
  useReactFlow,
  useEdgesState,
  useNodesState,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type EdgeTypes,
} from '@xyflow/react';
import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent, type DragEvent as HTMLDragEvent } from 'react';
import { TextUpdaterNode } from './nodes/TextUpdaterNode';
import { ResizableNode } from './nodes/ResizableNode';
import BiDirectionalNode from './nodes/BiDirectionalNode';
import UniversalNode from './nodes/UniversalNode';
import FloatingEdge from './edges/FloatingEdge';
import FloatingConnectionLine from './edges/FloatingConnectionLine';
import ContextMenu from './components/ContextMenu';
import NodeToolbar from './components/NodeToolbar';
import { Lasso } from './components/Lasso';
import { DnDProvider, useDnD } from './components/DnDContext';
import { initialElements } from './edges/initialElements';

// registrado FORA do App pra não re-criar o objeto a cada render (doc)
const nodeTypes = {
  universal: UniversalNode,
  // legados registrados (nodes antigos em initialElements ainda os usam)
  textUpdater: TextUpdaterNode,
  resizable: ResizableNode,
  biDirectional: BiDirectionalNode,
};
const edgeTypes: EdgeTypes = { floating: FloatingEdge };

// TODAS as edges: floating (borda mais próxima) + seta sempre (markerEnd)
const defaultEdgeOptions = {
  type: 'floating',
  markerEnd: { type: MarkerType.ArrowClosed },
} as const;

// nodes/edges de teste (teus)
const testNodes = [
  { id: 'n1', type: 'universal', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', type: 'universal', position: { x: 0, y: 120 }, data: { label: 'Node 2' } },
  { id: 'n3', type: 'universal', position: { x: 220, y: 0 }, data: { label: 'texto aqui' } },
  { id: 'n4', type: 'universal', position: { x: 450, y: 0 }, data: { label: 'puxa minhas alças 👋' } },
  // par pro bidirecional
  { id: 'n5', type: 'universal', position: { x: 450, y: 160 }, data: { label: 'N5' } },
  { id: 'n6', type: 'universal', position: { x: 650, y: 160 }, data: { label: 'N6' } },
];
const testEdges: Edge[] = [
  { id: 'n1-n2', source: 'n1', target: 'n2' },
  { id: 'e5-6', source: 'n5', target: 'n6' },
  { id: 'e6-5', source: 'n6', target: 'n5' }, // edge de volta: ambas curvam ± offset
];

// elementos gerados: Target central + 8 Sources em círculo (edges floating c/ seta)
const { nodes: floatingNodes, edges: floatingEdges } = initialElements();

// tudo junto: teus de teste + o cluster floating
const initialNodes = [...testNodes, ...floatingNodes];
const initialEdges: Edge[] = [...testEdges, ...floatingEdges];

// posição do context menu (edge-aware: não abre colado na borda da janela)
type MenuState = { id: string; top?: number; left?: number; right?: number; bottom?: number };

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type, setType] = useDnD();
  // lasso: modo desenha o laço; selection modo interage normal (drag/pan)
  const [partial, setPartial] = useState(false);
  const [isLassoActive, setIsLassoActive] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges],
  );

  // botão direito num node → abre o menu na posição do cursor (clampado)
  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node) => {
      event.preventDefault();
      const pane = ref.current?.getBoundingClientRect();
      if (!pane) return;
      const clamp = (v: number, ok: boolean) => (ok ? v : undefined);
      setMenu({
        id: node.id,
        top: clamp(event.clientY, event.clientY < pane.height - 200),
        left: clamp(event.clientX, event.clientX < pane.width - 200),
        right: clamp(pane.width - event.clientX, event.clientX >= pane.width - 200),
        bottom: clamp(pane.height - event.clientY, event.clientY >= pane.height - 200),
      });
    },
    [setMenu],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  // DnD da toolbar: soltou → nasce um node UNIVERSAL do tipo arrastado
  const onDragOver = useCallback((event: HTMLDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: HTMLDragEvent) => {
      event.preventDefault();
      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'universal', // TODO node novo é universal (resize + handles 2 lados)
        position: { x: position.x - 75, y: position.y - 25 },
        data:
          type === 'textUpdater'
            ? { label: 'novo texto' }
            : type === 'resizable'
              ? { label: 'redimensiona 👋' }
              : { label: 'bidirecional ⇄' },
      };
      setNodes((nds) => [...nds, newNode]);
      setType(null);
    },
    [type, screenToFlowPosition, setNodes, setType],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }} ref={ref}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineComponent={FloatingConnectionLine}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={closeMenu}
        onNodeContextMenu={onNodeContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        colorMode="system"
      >
        <Panel position="top-center">
          <NodeToolbar />
        </Panel>
        <Panel position="top-left" className="lasso-controls">
          <div className="xy-theme__button-group">
            <button
              className={`xy-theme__button ${isLassoActive ? 'active' : ''}`}
              onClick={() => setIsLassoActive(true)}
            >
              Lasso
            </button>
            <button
              className={`xy-theme__button ${!isLassoActive ? 'active' : ''}`}
              onClick={() => setIsLassoActive(false)}
            >
              Select
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={partial}
              onChange={() => setPartial((p) => !p)}
              className="xy-theme__checkbox"
            />
            parcial
          </label>
        </Panel>
        {isLassoActive && <Lasso partial={partial} />}
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        {menu && <ContextMenu onClick={closeMenu} {...menu} />}
      </ReactFlow>
    </div>
  );
}

// Provider em volta: contexto DnD + hooks do flow
export default function App() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <Flow />
      </DnDProvider>
    </ReactFlowProvider>
  );
}