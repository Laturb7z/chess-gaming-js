// Fase 12.25: replays grandes no IndexedDB; índice leve no localStorage.
// Arquivos legados continuam legíveis e nunca são removidos automaticamente.
const LEGACY_KEY = 'chess-gaming-js:finished-games:v1';
const INDEX_KEY = 'chess-gaming-js:finished-games:index:v2';
const DB_NAME = 'chess-gaming-js:finished-games';
const STORE = 'games';

function legacyGames() {
  try {
    const list = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return Array.isArray(list) ? list.filter(g => g?.id && g?.finalState && Array.isArray(g.states)) : [];
  } catch (error) { console.warn('Arquivo antigo indisponível:', error); return []; }
}
function indexGames() {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
function metadata(game) {
  return {
    id: game.id, endedAt: game.endedAt, mode: game.mode,
    variant: game.variant, chess960Position: game.chess960Position,
    humanColor: game.humanColor, result: game.result,
    moveCount: game.finalState?.moveHistory?.length ?? game.moveCount ?? 0,
    storage: 'indexeddb'
  };
}
function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function transaction(mode, operation) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = operation(tx.objectStore(STORE));
      let value;
      req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export function getFinishedGames() {
  const legacy = legacyGames();
  const seen = new Set(legacy.map(g => g.id));
  return [...indexGames().filter(g => !seen.has(g.id)), ...legacy]
    .sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || ''));
}
export async function loadFinishedGame(id) {
  const old = legacyGames().find(g => g.id === id);
  if (old) return old;
  try { return await transaction('readonly', store => store.get(id)); }
  catch (error) { console.error('Não foi possível carregar replay:', error); return null; }
}
export async function archiveFinishedGame(game) {
  if (!game?.id || !game?.finalState || !Array.isArray(game.states)) return false;
  if (getFinishedGames().some(item => item.id === game.id)) return true;
  try {
    await transaction('readwrite', store => store.put(structuredClone(game)));
    const next = [metadata(game), ...indexGames().filter(item => item.id !== game.id)];
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
    document.dispatchEvent(new Event('chess:finished-games-updated'));
    return true;
  } catch (error) {
    console.error('Falha ao arquivar partida:', error);
    // A escrita pode ter concluído no IndexedDB antes da falha do índice.
    // Não afirmamos sucesso até a partida ficar acessível na lista.
    return false;
  }
}
export async function deleteFinishedGame(id) {
  try {
    await transaction('readwrite', store => store.delete(id));
    const nextLegacy = legacyGames().filter(g => g.id !== id);
    localStorage.setItem(LEGACY_KEY, JSON.stringify(nextLegacy));
    localStorage.setItem(INDEX_KEY, JSON.stringify(indexGames().filter(g => g.id !== id)));
    return true;
  } catch (error) { console.error('Falha ao excluir partida:', error); return false; }
}
export async function clearFinishedGames() {
  try {
    await transaction('readwrite', store => store.clear());
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(INDEX_KEY);
    return true;
  } catch (error) { console.error('Falha ao limpar partidas:', error); return false; }
}
