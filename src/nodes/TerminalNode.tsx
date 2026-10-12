import { memo, useEffect, useRef, useState } from 'react';
import { Handle, NodeResizer, Position, type NodeProps } from '@xyflow/react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke, Channel } from '@tauri-apps/api/core';
import '@xterm/xterm/css/xterm.css';

// ============ O NODE TERMINAL (PTY REAL via portable-pty) ============
// xterm.js <-> PTY de verdade: zsh LOGIN INTERATIVO no node (prompt/cores
// nativas do teu .zshrc, vim, histórico). Spawn/write/resize/close por
// comandos nossos no Rust (portable-pty), stdout via Channel binário.
// RENDER: DOM renderer (DEFAULT do xterm) — o WebGL no WKWebView do macOS
// inverte/embacia texto com color-scheme dark (workaround do typeboard);
// fonte mono via CSS garantida.
// No browser (vite puro): fallback echo local.
// Classes de comportamento OBRIGATÓRIAS no container do xterm:
// - nodrag: o canvas não rouba o arraste do mouse dentro do terminal
// - nowheel: scroll do terminal não zooma o canvas
// - nopan: pan do canvas desliga dentro do terminal
type TerminalNodeProps = NodeProps & { data: { label?: string } };

// dentro do Tauri? (vite puro = browser, sem __TAURI_INTERNALS__ global)
const isTauri = '__TAURI_INTERNALS__' in window;

// decodifica QUALQUER binário que o Channel solte (string | ArrayBuffer |
// TypedArray) — nunca lança TypeError; desconhecido => null (o chamador
// passa cru pro xterm, que também aceita)
function toBytes(data: unknown): Uint8Array | null {
  try {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer as ArrayBuffer);
    if (Array.isArray(data)) return Uint8Array.from(data as number[]);
    if (typeof data === 'string') return new TextEncoder().encode(data);
    return null;
  } catch {
    return null;
  }
}

const TerminalNode = ({ id, selected }: TerminalNodeProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  // cwd reportado pelo zsh (OSC 7) — footer tipo open-maestri
  const [cwd, setCwdState] = useState('');

  useEffect(() => {
    if (!hostRef.current) return;
    const MONO = '"SF Mono", Menlo, Monaco, "Cascadia Mono", monospace';
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: MONO,
      lineHeight: 1.2,
      allowProposedApi: true,
      macOptionIsMeta: true,
      scrollback: 10_000,
      theme: { background: '#101012' },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();

    const origWrite = term.write.bind(term);
    let ptyId: number | null = null;
    let cleanupPty: (() => void) | null = null;

    // cwd em tempo real (open-maestri): zsh emite OSC 7 a cada prompt;
    // intercepto o write e extraio o path pro footer
    const OSC7 = '\x1b]7;';
    term.write = (data: string | Uint8Array, cb?: () => void) => {
      const bytes = toBytes(data);
      if (bytes) {
        const s = new TextDecoder().decode(bytes);
        const idx = s.indexOf(OSC7);
        if (idx >= 0) {
          const endBELL = s.indexOf('\x07', idx);
          const endST = s.indexOf('\x1b\\', idx);
          const end = endBELL >= 0 && (endST < 0 || endBELL < endST) ? endBELL : endST;
          if (end > idx) {
            // formato: "file://host/caminho"
            let path = s.slice(idx + OSC7.length, end);
            try {
              path = decodeURIComponent(new URL(path).pathname);
            } catch {
              /* payload cru */
            }
            setCwdState(path);
          }
        }
      }
      return origWrite(data, cb);
    };

    async function boot() {
      // ==== PTY REAL ====
      const on_data = new Channel<unknown>();
      on_data.onmessage = (message) => {
        const bytes = toBytes(message);
        if (bytes) term.write(bytes);
      };
      try {
        ptyId = await invoke<number>('pty_spawn', {
          cols: term.cols,
          rows: term.rows,
          cwd: null,
          on_data,
        });
        const offTerm = term.onData((d) => {
          void invoke('pty_write', { id: ptyId, data: d }).catch(() => {});
        });
        cleanupPty = () => {
          offTerm.dispose();
          if (ptyId !== null) void invoke('pty_close', { id: ptyId }).catch(() => {});
        };
      } catch (err) {
        term.writeln(`[pty falhou: ${String(err)}]`);
      }
    }

    if (isTauri) {
      void boot();
    } else {
      // ==== FALLBACK browser: echo ====
      term.writeln('terminal pronto (browser: sem tauri, só echo)');
      const prompt = () => term.write('\r\n$ ');
      prompt();
      term.onData((d) => {
        if (d === '\r') prompt();
        else term.write(d);
      });
    }

    // re-fit + resize do PTY com DEBOUNCE 200ms (open-maestri: evita
    // SIGWINCH 60fps enquanto arrasta a alça)
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      fit.fit();
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (ptyId !== null) {
          void invoke('pty_resize', {
            id: ptyId,
            cols: term.cols,
            rows: term.rows,
          }).catch(() => {});
        }
      }, 200);
    });
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      cleanupPty?.();
      term.dispose();
    };
  }, [id]);

  return (
    <>
      {/* min abaixo do natural (evita o clamp-cresce-sozinho do resizer) */}
      <NodeResizer isVisible={selected} minWidth={40} minHeight={28} maxWidth={4000} maxHeight={4000} color="#6c8cff" />
      <Handle type="target" position={Position.Left} id="left" />
      <div className="terminal-node nodrag nowheel nopan" ref={hostRef} />
      {cwd && (
        <div className="terminal-footer nodrag nopan" title={cwd}>
          {cwd.split('/').slice(-2).join('/')}
        </div>
      )}
      <Handle type="source" position={Position.Right} id="right" />
    </>
  );
};

export default memo(TerminalNode);