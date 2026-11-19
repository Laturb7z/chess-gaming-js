
import { firebaseConfig } from './firebaseConfig.js';

// Fase 13.1 — Salas online e presença.
// A sincronização de lances será implementada posteriormente.

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';

let servicesPromise = null;

// Identificador exclusivo desta instância da página.
// Não depende do UID compartilhado pelo Firebase.
const sessionId = crypto.randomUUID();

async function services() {
  if (servicesPromise) return servicesPromise;

  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.databaseURL ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    throw new Error('Configuração do Firebase incompleta.');
  }

  servicesPromise = (async () => {
    const [app, auth, db] = await Promise.all([
      import(`${SDK}firebase-app.js`),
      import(`${SDK}firebase-auth.js`),
      import(`${SDK}firebase-database.js`)
    ]);

    const firebaseApp = app.getApps().length
      ? app.getApp()
      : app.initializeApp(firebaseConfig);

    const authentication = auth.getAuth(firebaseApp);

    // Espera o Firebase recuperar a sessão anterior.
await authentication.authStateReady();

if (!authentication.currentUser) {
  await auth.signInAnonymously(authentication);
}

    return {
      auth,
      db,
      authentication,
      database: db.getDatabase(firebaseApp)
    };
  })().catch(error => {
    servicesPromise = null;
    throw error;
  });

  return servicesPromise;
}

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    n => chars[n % chars.length]
  ).join('');
};

// Aceita participantes antigos (UID em string)
// e novos (objeto com UID e sessão).
function getPlayerUid(player) {
  return typeof player === 'string'
    ? player
    : player?.uid ?? null;
}

function isOwnPlayer(player, uid) {
  if (!player) return false;

  if (typeof player === 'string') {
    // Salas legadas não possuem identificador de aba.
    return false;
  }

  return player.uid === uid &&
    player.sessionId === sessionId;
}

function makePlayer(uid) {
  return {
    uid,
    sessionId
  };
}

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

  const message = text => {
    status.textContent = text;
  };

  const setBusy = value => {
    busy = value;
    create.disabled = value;
    join.disabled = value;
    leave.disabled = value;
  };

  function stopWatching() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  function watch(svc, roomCode) {
    stopWatching();

    const path = svc.db.ref(
      svc.database,
      `rooms/${roomCode}`
    );

    unsubscribe = svc.db.onValue(
      path,
      snapshot => {
        const data = snapshot.val();

        if (!data) {
          stopWatching();
          room = null;
          current.textContent = '';
          message('Sala indisponível ou encerrada.');
          return;
        }

        const players = data.players || {};
        const members = ['white', 'black']
          .filter(side => Boolean(players[side])).length;

        current.textContent =
          `Sala: ${roomCode} · ${members}/2 jogadores`;

        if (members === 2) {
          message(
            'Dois jogadores conectados! ' +
            'Sala pronta para a próxima fase.'
          );
        } else {
          message(
            'Aguardando o segundo jogador. ' +
            'Compartilhe o código da sala.'
          );
        }
      },
      error => {
        message(
          `Erro ao acompanhar sala: ${error.message}`
        );
      }
    );
  }

  open.addEventListener('click', () => {
    panel.hidden = false;
  });

  close.addEventListener('click', () => {
    panel.hidden = true;
  });

  // CRIAR SALA
  create.addEventListener('click', async () => {
    if (busy || room) return;

    setBusy(true);

    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;

      let result;
      let id;

      // Tenta novamente se gerar um código ocupado.
      for (let attempt = 0; attempt < 5; attempt++) {
        id = generateCode();

        const path = svc.db.ref(
          svc.database,
          `rooms/${id}`
        );

        result = await svc.db.runTransaction(
          path,
          existing => {
            if (existing !== null) return;

            return {
              createdAt: Date.now(),
              status: 'waiting',
              variant: 'classic',
              players: {
                white: makePlayer(uid)
              }
            };
          },
          { applyLocally: false }
        );

        if (result.committed) break;
      }

      if (!result?.committed) {
        throw new Error(
          'Não foi possível gerar uma sala disponível.'
        );
      }

      room = id;
      input.value = id;

      watch(svc, id);

    } catch (error) {
      console.error('[PvP] Criar sala:', error);
      message(`Não foi possível criar: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });

  // ENTRAR NA SALA
  join.addEventListener('click', async () => {
    if (busy || room) return;

    const id = input.value.trim().toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(id)) {
      message('Informe um código válido de 6 caracteres.');
      return;
    }

    setBusy(true);

    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;

      const path = svc.db.ref(
        svc.database,
        `rooms/${id}`
      );

      // Diagnóstico inicial: confirma que a sala existe.
      const initial = await svc.db.get(path);

      if (!initial.exists()) {
        throw new Error('Sala não encontrada no Firebase.');
      }

      const data = initial.val();

      if (isOwnPlayer(data.players?.white, uid)) {
        throw new Error(
          'Esta sessão já ocupa as peças brancas.'
        );
      }

      if (data.status !== 'waiting') {
        throw new Error(
          'A sala não está aguardando jogadores.'
        );
      }

      if (data.players?.black) {
        throw new Error('A sala já possui dois jogadores.');
      }

      const result = await svc.db.runTransaction(
        path,
        existing => {
          if (!existing) return;

          if (existing.status !== 'waiting') {
            return;
          }

          const players = existing.players || {};

          if (players.black) return;

          if (isOwnPlayer(players.white, uid)) {
            return;
          }

          return {
            ...existing,
            players: {
              ...players,
              black: makePlayer(uid)
            },
            status: 'ready'
          };
        },
        { applyLocally: false }
      );

      if (!result.committed) {
        throw new Error(
          'Entrada não concluída. ' +
          'A sala pode ter sido ocupada por outra sessão.'
        );
      }

      const finalData = result.snapshot.val();

      if (!isOwnPlayer(finalData?.players?.black, uid)) {
        throw new Error(
          'A sessão não foi registrada como jogador preto.'
        );
      }

      room = id;
      input.value = id;

      watch(svc, id);

      console.log(
        '[PvP] Entrada concluída:',
        id,
        'UID:',
        getPlayerUid(finalData.players.black)
      );

    } catch (error) {
      console.error('[PvP] Entrar na sala:', error);
      message(`Não foi possível entrar: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });

  // SAIR DA SALA
  leave.addEventListener('click', async () => {
    if (!room || busy) return;

    setBusy(true);

    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;
      const id = room;

      const path = svc.db.ref(
        svc.database,
        `rooms/${id}`
      );

      await svc.db.runTransaction(
        path,
        data => {
          if (!data) return;

          const players = { ...(data.players || {}) };

          for (const side of ['white', 'black']) {
            if (isOwnPlayer(players[side], uid)) {
              delete players[side];
            }
          }

          if (!Object.keys(players).length) {
            return null;
          }

          return {
            ...data,
            players,
            status: 'waiting'
          };
        },
        { applyLocally: false }
      );

      stopWatching();

      room = null;
      current.textContent = '';

      message('Você saiu da sala.');

    } catch (error) {
      console.error('[PvP] Sair da sala:', error);
      message(`Erro ao sair: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });
}
import { firebaseConfig } from './firebaseConfig.js';

// Fase 13.1 — Salas online e presença.
// A sincronização de lances será implementada posteriormente.

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';

let servicesPromise = null;

// Identificador exclusivo desta instância da página.
// Não depende do UID compartilhado pelo Firebase.
const sessionId = crypto.randomUUID();

async function services() {
  if (servicesPromise) return servicesPromise;

  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.databaseURL ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    throw new Error('Configuração do Firebase incompleta.');
  }

  servicesPromise = (async () => {
    const [app, auth, db] = await Promise.all([
      import(`${SDK}firebase-app.js`),
      import(`${SDK}firebase-auth.js`),
      import(`${SDK}firebase-database.js`)
    ]);

    const firebaseApp = app.getApps().length
      ? app.getApp()
      : app.initializeApp(firebaseConfig);

    const authentication = auth.getAuth(firebaseApp);

    // Espera o Firebase recuperar a sessão anterior.
    await auth.authStateReady();

    if (!authentication.currentUser) {
      await auth.signInAnonymously(authentication);
    }

    return {
      auth,
      db,
      authentication,
      database: db.getDatabase(firebaseApp)
    };
  })().catch(error => {
    servicesPromise = null;
    throw error;
  });

  return servicesPromise;
}

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  return Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    n => chars[n % chars.length]
  ).join('');
};

// Aceita participantes antigos (UID em string)
// e novos (objeto com UID e sessão).
function getPlayerUid(player) {
  return typeof player === 'string'
    ? player
    : player?.uid ?? null;
}

function isOwnPlayer(player, uid) {
  if (!player) return false;

  if (typeof player === 'string') {
    // Salas legadas não possuem identificador de aba.
    return false;
  }

  return player.uid === uid &&
    player.sessionId === sessionId;
}

function makePlayer(uid) {
  return {
    uid,
    sessionId
  };
}

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

  const message = text => {
    status.textContent = text;
  };

  const setBusy = value => {
    busy = value;
    create.disabled = value;
    join.disabled = value;
    leave.disabled = value;
  };

  function stopWatching() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  function watch(svc, roomCode) {
    stopWatching();

    const path = svc.db.ref(
      svc.database,
      `rooms/${roomCode}`
    );

    unsubscribe = svc.db.onValue(
      path,
      snapshot => {
        const data = snapshot.val();

        if (!data) {
          stopWatching();
          room = null;
          current.textContent = '';
          message('Sala indisponível ou encerrada.');
          return;
        }

        const players = data.players || {};
        const members = ['white', 'black']
          .filter(side => Boolean(players[side])).length;

        current.textContent =
          `Sala: ${roomCode} · ${members}/2 jogadores`;

        if (members === 2) {
          message(
            'Dois jogadores conectados! ' +
            'Sala pronta para a próxima fase.'
          );
        } else {
          message(
            'Aguardando o segundo jogador. ' +
            'Compartilhe o código da sala.'
          );
        }
      },
      error => {
        message(
          `Erro ao acompanhar sala: ${error.message}`
        );
      }
    );
  }

  open.addEventListener('click', () => {
    panel.hidden = false;
  });

  close.addEventListener('click', () => {
    panel.hidden = true;
  });

  // CRIAR SALA
  create.addEventListener('click', async () => {
    if (busy || room) return;

    setBusy(true);

    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;

      let result;
      let id;

      // Tenta novamente se gerar um código ocupado.
      for (let attempt = 0; attempt < 5; attempt++) {
        id = generateCode();

        const path = svc.db.ref(
          svc.database,
          `rooms/${id}`
        );

        result = await svc.db.runTransaction(
          path,
          existing => {
            if (existing !== null) return;

            return {
              createdAt: Date.now(),
              status: 'waiting',
              variant: 'classic',
              players: {
                white: makePlayer(uid)
              }
            };
          },
          { applyLocally: false }
        );

        if (result.committed) break;
      }

      if (!result?.committed) {
        throw new Error(
          'Não foi possível gerar uma sala disponível.'
        );
      }

      room = id;
      input.value = id;

      watch(svc, id);

    } catch (error) {
      console.error('[PvP] Criar sala:', error);
      message(`Não foi possível criar: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });

  // ENTRAR NA SALA
  join.addEventListener('click', async () => {
    if (busy || room) return;

    const id = input.value.trim().toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(id)) {
      message('Informe um código válido de 6 caracteres.');
      return;
    }

    setBusy(true);

    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;

      const path = svc.db.ref(
        svc.database,
        `rooms/${id}`
      );

      // Diagnóstico inicial: confirma que a sala existe.
      const initial = await svc.db.get(path);

      if (!initial.exists()) {
        throw new Error('Sala não encontrada no Firebase.');
      }

      const data = initial.val();

      if (isOwnPlayer(data.players?.white, uid)) {
        throw new Error(
          'Esta sessão já ocupa as peças brancas.'
        );
      }

      if (data.status !== 'waiting') {
        throw new Error(
          'A sala não está aguardando jogadores.'
        );
      }

      if (data.players?.black) {
        throw new Error('A sala já possui dois jogadores.');
      }

      const result = await svc.db.runTransaction(
        path,
        existing => {
          if (!existing) return;

          if (existing.status !== 'waiting') {
            return;
          }

          const players = existing.players || {};

          if (players.black) return;

          if (isOwnPlayer(players.white, uid)) {
            return;
          }

          return {
            ...existing,
            players: {
              ...players,
              black: makePlayer(uid)
            },
            status: 'ready'
          };
        },
        { applyLocally: false }
      );

      if (!result.committed) {
        throw new Error(
          'Entrada não concluída. ' +
          'A sala pode ter sido ocupada por outra sessão.'
        );
      }

      const finalData = result.snapshot.val();

      if (!isOwnPlayer(finalData?.players?.black, uid)) {
        throw new Error(
          'A sessão não foi registrada como jogador preto.'
        );
      }

      room = id;
      input.value = id;

      watch(svc, id);

      console.log(
        '[PvP] Entrada concluída:',
        id,
        'UID:',
        getPlayerUid(finalData.players.black)
      );

    } catch (error) {
      console.error('[PvP] Entrar na sala:', error);
      message(`Não foi possível entrar: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });

  // SAIR DA SALA
  leave.addEventListener('click', async () => {
    if (!room || busy) return;

    setBusy(true);

    try {
      const svc = await services();
      const uid = svc.authentication.currentUser.uid;
      const id = room;

      const path = svc.db.ref(
        svc.database,
        `rooms/${id}`
      );

      await svc.db.runTransaction(
        path,
        data => {
          if (!data) return;

          const players = { ...(data.players || {}) };

          for (const side of ['white', 'black']) {
            if (isOwnPlayer(players[side], uid)) {
              delete players[side];
            }
          }

          if (!Object.keys(players).length) {
            return null;
          }

          return {
            ...data,
            players,
            status: 'waiting'
          };
        },
        { applyLocally: false }
      );

      stopWatching();

      room = null;
      current.textContent = '';

      message('Você saiu da sala.');

    } catch (error) {
      console.error('[PvP] Sair da sala:', error);
      message(`Erro ao sair: ${error.message}`);
    } finally {
      setBusy(false);
    }
  });
}
