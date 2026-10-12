// ============ TERMINAL (PTY REAL via portable-pty) ============
// Padrão validado pelo typeboard (Tauri 2 + portable-pty + xterm DOM):
// spawn de $SHELL -l (login shell), stdout via Channel binário, reader
// thread, kill no Drop. Resize/cwd no front (TerminalNode).
// NOTA: commands em lib.rs NÃO podem ser `pub fn` (doc oficial do Tauri —
// causa E0255 "__cmd__ defined multiple times" no glue code)

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::ipc::Channel;
use tauri::State;

pub struct PtySession {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    child_killer: Mutex<Box<dyn portable_pty::ChildKiller + Send + Sync>>,
}

impl Drop for PtySession {
    fn drop(&mut self) {
        if let Ok(mut killer) = self.child_killer.lock() {
            let _ = killer.kill();
        }
    }
}

#[derive(Default)]
pub struct PtyState {
    next_id: AtomicU32,
    sessions: Mutex<HashMap<u32, Arc<PtySession>>>,
}

impl PtyState {
    fn insert(&self, id: u32, session: Arc<PtySession>) {
        self.sessions.lock().expect("pty map").insert(id, session);
    }

    fn get(&self, id: u32) -> Result<Arc<PtySession>, String> {
        self.sessions
            .lock()
            .expect("pty map")
            .get(&id)
            .cloned()
            .ok_or_else(|| format!("unknown pty session {id}"))
    }
}

fn default_cwd() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn default_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into())
}

#[tauri::command]
fn pty_spawn(
    state: State<PtyState>,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
    on_data: Channel<Vec<u8>>,
) -> Result<u32, String> {
    let cols = cols.max(2);
    let rows = rows.max(1);
    let id = state.next_id.fetch_add(1, Ordering::Relaxed);

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("open pty: {e}"))?;

    let mut cmd = CommandBuilder::new(default_shell());
    #[cfg(unix)]
    {
        cmd.arg("-l"); // login shell: carrega .zshrc / aliases / PATH real
    }
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("TERM_PROGRAM", "maestriopen");

    let cwd = cwd
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(default_cwd);
    cmd.cwd(cwd);

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn shell: {e}"))?;
    let killer = child.clone_killer();

    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("clone pty reader: {e}"))?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let session = Arc::new(PtySession {
        master: Mutex::new(pair.master),
        writer: Mutex::new(writer),
        child_killer: Mutex::new(killer),
    });
    state.insert(id, session);

    thread::Builder::new()
        .name(format!("pty-read-{id}"))
        .spawn(move || {
            let mut reader = reader;
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        if on_data.send(buf[..n].to_vec()).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        })
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
fn pty_write(state: State<PtyState>, id: u32, data: String) -> Result<(), String> {
    let session = state.get(id)?;
    let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
    writer.write_all(data.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_resize(state: State<PtyState>, id: u32, cols: u16, rows: u16) -> Result<(), String> {
    let session = state.get(id)?;
    let master = session.master.lock().map_err(|e| e.to_string())?;
    master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pty_close(state: State<PtyState>, id: u32) -> Result<(), String> {
    let session = state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&id);
    if let Some(session) = session {
        if let Ok(mut killer) = session.child_killer.lock() {
            let _ = killer.kill();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            pty_spawn,
            pty_write,
            pty_resize,
            pty_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}