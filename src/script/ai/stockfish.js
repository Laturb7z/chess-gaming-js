
const engine = new Worker(
    new URL("../../../assets/stockfish/stockfish-19-lite-single.js", import.meta.url)
);

let engineReady = false;
let pendingMove = null;

engine.onmessage = (event) => {
    const message = String(event.data);

    if (message === "readyok") {
        engineReady = true;
        console.log("Stockfish pronto!");
    }

    if (message.startsWith("bestmove")) {
        const move = message.split(" ")[1];

        if (pendingMove) {
            const resolve = pendingMove;
            pendingMove = null;
            resolve(move === "(none)" ? null : move);
        }
    }
};

engine.onerror = (error) => {
    console.error("Erro no Stockfish:", error);
};

engine.postMessage("uci");
engine.postMessage("isready");

export function getBestMove(fen, depth = 10) {
    if (!engineReady || pendingMove) {
        return Promise.reject(
            new Error("Stockfish indisponível ou ocupado.")
        );
    }

    return new Promise((resolve) => {
        pendingMove = resolve;

        engine.postMessage(`position fen ${fen}`);
        engine.postMessage(`go depth ${depth}`);
    });
}

export function isStockfishReady() {
    return engineReady;
}
