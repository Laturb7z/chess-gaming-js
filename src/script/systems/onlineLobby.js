import { firebaseConfig } from './firebaseConfig.js';

// Fase 13.1: infraestrutura de salas. A sincronização de lances será integrada
// ao controlador de partidas em etapa posterior; NÃO inicia partidas falsas.
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
let servicesPromise;
async function services() {
  if (servicesPromise) return servicesPromise;
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Configure src/script/systems/firebaseConfig.js antes de usar o modo online.');
  }
  servicesPromise = (async () => {
    const [app, auth, db] = await Promise.all([
      import(`${SDK}firebase-app.js`),
      import(`${SDK}firebase-auth.js`),
      import(`${SDK}firebase-database.js`)
    ]);
    const firebaseApp = app.getApps().length ? app.getApp() : app.initializeApp(firebaseConfig);
    const authentication = auth.getAuth(firebaseApp);
    if (!authentication.currentUser) await auth.signInAnonymously(authentication);
    return { auth, db, authentication, database: db.getDatabase(firebaseApp) };
  })().catch(error => { servicesPromise = null; throw error; });
  return servicesPromise;
}
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');

export function setupOnlineLobby() {
  const panel = document.getElementById('online-lobby');
  const open = document.getElementById('open-online-lobby');
  const close = document.getElementById('close-online-lobby');
  const create = document.getElementById('create-online-room');
  const join = document.getElementById('join-online-room');
  const leave = document.getElementById('leave-online-room');
  const input = document.getElementById('online-room-code');
  const status = document.getElementById('online-room-status');
  const current = document.getElementById('online-current-room');
  let unsubscribe = null;
  let room = null;
  let busy = false;
  const message = text => { status.textContent = text; };
  const setBusy = value => { busy = value; create.disabled = value; join.disabled = value; leave.disabled = value; };
  const watch = (svc, roomCode) => {
    unsubscribe?.();
    unsubscribe = svc.db.onValue(svc.db.ref(svc.database, `rooms/${roomCode}`), snapshot => {
      const data = snapshot.val();
      if (!data) { room = null; current.textContent = ''; message('Sala indisponível.'); return; }
      const members = Object.keys(data.players || {}).length;
      current.textContent = `Sala: ${roomCode} · ${members}/2 jogadores`;
      message(members === 2 ? 'Dois jogadores conectados. Sincronização de lances será liberada na próxima etapa.' : 'Aguardando o segundo jogador. Compartilhe o código da sala.');
    }, error => message(`Erro ao acompanhar sala: ${error.message}`));
  };
  open.addEventListener('click', () => { panel.hidden = false; });
  close.addEventListener('click', () => { panel.hidden = true; });
  create.addEventListener('click', async () => {
    if (busy || room) return;
    setBusy(true);
    try {
      const svc = await services();
      const id = code();
      const path = svc.db.ref(svc.database, `rooms/${id}`);
      const result = await svc.db.runTransaction(path, existing => existing === null ? {
        createdAt: Date.now(), status: 'waiting', variant: 'classic',
        players: { white: svc.authentication.currentUser.uid }
      } : undefined, { applyLocally: false });
      if (!result.committed) throw new Error('Código ocupado. Tente novamente.');
      room = id; input.value = id; watch(svc, id);
    } catch (error) { message(`Não foi possível criar: ${error.message}`); }
    finally { setBusy(false); }
  });
  join.addEventListener('click', async () => {
    if (busy || room) return;
    const id = input.value.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(id)) { message('Informe um código de 6 caracteres.'); return; }
    setBusy(true);
    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;
      const path = svc.db.ref(svc.database, `rooms/${id}`);
      const result = await svc.db.runTransaction(path, existing => {
        if (!existing || existing.status !== 'waiting') return;
        if (existing.players?.white === uid || existing.players?.black === uid) return existing;
        if (existing.players?.black) return;
        return { ...existing, players: { ...existing.players, black: uid }, status: 'ready' };
      }, { applyLocally: false });
      if (!result.committed) throw new Error('Sala não existe ou está cheia.');
      room = id; watch(svc, id);
    } catch (error) { message(`Não foi possível entrar: ${error.message}`); }
    finally { setBusy(false); }
  });
  leave.addEventListener('click', async () => {
    if (!room || busy) return;
    setBusy(true);
    try {
      const svc = await services();
      const id = room;
      const uid = svc.authentication.currentUser.uid;
      await svc.db.runTransaction(svc.db.ref(svc.database, `rooms/${id}`), data => {
        if (!data) return data;
        const players = { ...(data.players || {}) };
        for (const side of ['white', 'black']) if (players[side] === uid) delete players[side];
        return Object.keys(players).length ? { ...data, players, status: 'waiting' } : null;
      });
      unsubscribe?.(); unsubscribe = null; room = null; current.textContent = ''; message('Você saiu da sala.');
    } catch (error) { message(`Erro ao sair: ${error.message}`); }
    finally { setBusy(false); }
  });
}
