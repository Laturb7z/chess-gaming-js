// Fase 12.26: salvamento completo no IndexedDB, com leitura de backups legados.
const SAVE_KEY = 'chess-gaming-js:save:v1';
const DB_NAME = 'chess-gaming-js:active-save';
const STORE = 'active';
const RECORD_ID = 'current';

function valid(saved) {
  if (saved?.version !== 1 || !Array.isArray(saved.state?.pieces) ||
      !saved.state.clockState || !['pvp', 'computer'].includes(saved.mode) ||
      !['white', 'black'].includes(saved.humanColor)) return false;
  const variant = saved.chessVariant ?? saved.state.chessVariant ?? 'classic';
  const position = saved.chess960Position ?? saved.state.chess960Position ?? 518;
  return ['classic', 'chess960'].includes(variant) &&
    Number.isInteger(position) && position >= 0 && position <= 959;
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function databaseOperation(mode, callback) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = callback(tx.objectStore(STORE));
      let result;
      if (request) request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function createGameStorage({ canPersist, isGameOver, getPayload, isPromotionPending }) {
  // Serializar operações evita que um salvamento antigo sobrescreva um novo.
  let pending = Promise.resolve();
  let generation = 0;
  let lastError = '';

  function enqueue(operation) {
    const task = pending.catch(() => {}).then(operation);
    pending = task.catch(error => {
      const message = `${error?.name || 'Erro'}: ${error?.message || error}`;
      if (message !== lastError) console.warn('Falha no armazenamento da partida:', error);
      lastError = message;
    });
    return task;
  }

  function legacySavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return valid(saved) ? saved : null;
    } catch (error) {
      console.warn('Não foi possível ler o salvamento antigo:', error);
      return null;
    }
  }

  async function readSavedGame() {
    await pending;
    try {
      const saved = await databaseOperation('readonly', store => store.get(RECORD_ID));
      if (valid(saved)) return saved;
    } catch (error) {
      console.warn('Não foi possível consultar o salvamento IndexedDB:', error);
    }
    return legacySavedGame();
  }

  async function updateContinueButton() {
    const button = document.getElementById('continue-game-btn');
    if (!button) return;
    const currentGeneration = generation;
    const saved = await readSavedGame();
    if (currentGeneration === generation) button.hidden = !saved;
  }

  function clearSavedGame() {
    generation++;
    // Remover legado imediatamente impede que ele reapareça após uma limpeza.
    localStorage.removeItem(SAVE_KEY);
    return enqueue(async () => {
      await databaseOperation('readwrite', store => store.delete(RECORD_ID));
      lastError = '';
    });
  }

  function persistGame() {
    if (!canPersist() || isPromotionPending()) return;
    if (isGameOver()) {
      void clearSavedGame().then(updateContinueButton).catch(() => {});
      return;
    }
    let payload;
    try {
      payload = getPayload();
    } catch (error) {
      console.warn('Não foi possível preparar o salvamento:', error);
      return;
    }
    const capturedGeneration = generation;
    return enqueue(async () => {
      if (capturedGeneration !== generation) return;
      await databaseOperation('readwrite', store => store.put(payload, RECORD_ID));
      // O legado só é removido após a confirmação de escrita no IndexedDB.
      localStorage.removeItem(SAVE_KEY);
      lastError = '';
    });
  }

  function startAutoSave() {
    setInterval(persistGame, 1500);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void persistGame();
    });
    window.addEventListener('pagehide', () => { void persistGame(); });
  }

  return { readSavedGame, updateContinueButton, persistGame, clearSavedGame, startAutoSave };
}
