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
  type Connection,
  type Edge,
  type Node,
  type EdgeTypes,
} from '@xyflow/react';
import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
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

// TODAS as edges: floating (borda mais próxima), SEM seta (linha nua)
const defaultEdgeOptions = {
  type: 'floating',
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
  const [type, selectType] = useDnD();
  // lasso: modo desenha o laço (marquee); seleção é sempre PARCIAL
  // (qualquer node que cruza o rect entra), por isso sem checkbox.
  // Chip único dentro da toolbar: entra no lasso, termina o traço → Select.
  const [isLassoActive, setIsLassoActive] = useState(false);
  const setLasso = useCallback((active: boolean) => setIsLassoActive(active), []);

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
  // clique no PANE com ferramenta escolhida: nasce o node ali + one-shot
  // (volta pro modo seleção). Clique simples sem ferramenta = deselect normal.
  const onPaneClick = useCallback(
    (event: ReactMouseEvent) => {
      closeMenu();
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
      selectType(null); // one-shot: consome a escolha
    },
    [type, screenToFlowPosition, setNodes, selectType, closeMenu],
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
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        colorMode="system"
        className={type ? 'placing-node' : undefined}
      >
        <Panel position="top-center">
          <NodeToolbar isLassoActive={isLassoActive} onSetLasso={setLasso} />
        </Panel>
        {isLassoActive && <Lasso partial onDone={() => setLasso(false)} />}
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