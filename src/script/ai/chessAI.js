export function createChessAI({
  workerUrl,
  readyTimeout = 60000
} = {}) {
  if (!workerUrl) {
    throw new Error("Informe o caminho do Stockfish.");
  }

  let worker = null;
  let initialized = false;
  let initialization = null;
  let pending = null;
  let timer = null;
  let skillLevel = 0;
  let chess960Enabled = false;
  let hashSize = 32;
  let limitElo = false;
  let targetElo = 1600;

  function send(command) {
    if (!worker) {
      throw new Error("Worker não iniciado.");
    }

    console.log("[UCI ENVIADO]", command);
    worker.postMessage(command);
  }

  function settlePending(error, move = null) {
    if (!pending) return;

    const request = pending;
    pending = null;

    if (error) request.reject(error);
    else request.resolve(move);
  }

  function destroy() {
    clearTimeout(timer);

    settlePending(
      new Error("Análise cancelada.")
    );

    if (worker) {
      worker.terminate();
      worker = null;
    }

    initialized = false;
    initialization = null;
  }

  function initialize() {
    if (initialized) {
      return Promise.resolve();
    }

    if (initialization) {
      return initialization;
    }

    initialization = new Promise((resolve, reject) => {
      let finished = false;
      let uciReceived = false;

      function fail(error) {
        if (finished) return;
        finished = true;

        console.error("[STOCKFISH FALHOU]", error);

        destroy();
        reject(error);
      }

      function success() {
        if (finished) return;
        finished = true;

        clearTimeout(timer);
        initialized = true;
        // Configura a força após o handshake UCI.
        applyStrengthOptions();
        send(`setoption name Hash value ${hashSize}`);
        send(`setoption name UCI_Chess960 value ${chess960Enabled}`);

        console.log("[STOCKFISH PRONTO]");
        resolve();
      }

      try {
        console.log("[STOCKFISH URL]", workerUrl);

        worker = new Worker(workerUrl);

        worker.onerror = (event) => {
          console.error("[WORKER ERROR]", event);

          fail(new Error(
            event.message || "Erro interno do Worker."
          ));
        };

        worker.onmessageerror = (event) => {
          console.error("[MESSAGE ERROR]", event);

          fail(new Error(
            "Falha na comunicação com o Worker."
          ));
        };

        worker.onmessage = (event) => {
          const lines = String(event.data).split(/\r?\n/);

          for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;

            console.log("[STOCKFISH]", line);

            if (line === "uciok") {
              uciReceived = true;
              send("isready");
            }

            else if (line === "readyok" && uciReceived) {
              success();
            }

            else if (line.startsWith("bestmove ")) {
              const match = /^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?|\(none\))/.exec(line);

              if (match) {
                settlePending(
                  null,
                  match[1] === "(none)" ? null : match[1]
                );
              }
            }
          }
        };

        timer = setTimeout(() => {
          fail(new Error(
            uciReceived
              ? "Stockfish não respondeu ao isready."
              : "Stockfish não respondeu ao uci."
          ));
        }, readyTimeout);

        send("uci");

      } catch (error) {
        fail(error);
      }
    });

    return initialization;
  }

  function applyStrengthOptions() {
    if (!initialized && !worker) return;
    send(`setoption name UCI_LimitStrength value ${limitElo}`);
    if (limitElo) send(`setoption name UCI_Elo value ${targetElo}`);
    else send(`setoption name Skill Level value ${skillLevel}`);
  }

  function setAdvancedOptions({ hash = 32, limitStrength = false, elo = 1600 } = {}) {
    if (![16, 32, 64].includes(hash)) throw new RangeError('Hash inválido.');
    if (typeof limitStrength !== 'boolean') throw new TypeError('Limite de força inválido.');
    if (!Number.isInteger(elo) || elo < 1320 || elo > 3190) throw new RangeError('Elo inválido.');
    if (pending) throw new Error('Não altere as opções durante a análise.');
    hashSize = hash;
    limitElo = limitStrength;
    targetElo = elo;
    if (initialized) {
      send(`setoption name Hash value ${hashSize}`);
      applyStrengthOptions();
    }
  }

  function setSkillLevel(level) {
    if (!Number.isInteger(level) || level < 0 || level > 20) {
      throw new Error('Skill Level deve estar entre 0 e 20.');
    }
    skillLevel = level;
    if (initialized) {
      applyStrengthOptions();
    }
  }

  function setChess960(enabled) {
    if (typeof enabled !== "boolean") throw new TypeError("Chess960 deve ser booleano.");
    if (pending) throw new Error("Não altere a variante durante a análise.");
    chess960Enabled = enabled;
    if (initialized) send(`setoption name UCI_Chess960 value ${enabled}`);
  }

  async function getBestMove({
    fen,
    moveTime = 500
  } = {}) {
    if (typeof fen !== "string" || !fen.trim()) {
      throw new Error("FEN inválida.");
    }

    if (!Number.isInteger(moveTime) || moveTime < 1) {
      throw new Error("moveTime inválido.");
    }

    await initialize();

    if (pending) {
      throw new Error("Stockfish já está analisando.");
    }

    return new Promise((resolve, reject) => {
      pending = { resolve, reject };

      send(`position fen ${fen}`);
      send(`go movetime ${moveTime}`);
    });
  }

  function stop() {
    if (!worker) return;

    send("stop");

    settlePending(
      new Error("Análise cancelada.")
    );
  }

  return {
    initialize,
    getBestMove,
    setSkillLevel,
    setAdvancedOptions,
    setChess960,
    stop,
    destroy,
    isReady: () => initialized
  };
}
