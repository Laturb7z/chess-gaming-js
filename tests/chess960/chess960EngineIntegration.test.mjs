import assert from 'node:assert/strict';
import { createChessAI } from '../../src/script/ai/chessAI.js';
import { normalizeChess960UciMove } from '../../src/script/chess960/chess960Uci.js';

const commands = [];
const oldWorker = globalThis.Worker;
class FakeWorker {
  constructor(url) { this.url = url; this.terminated = false; }
  postMessage(command) {
    commands.push(command);
    if (command === 'uci') queueMicrotask(() => this.onmessage?.({data:'uciok'}));
    if (command === 'isready') queueMicrotask(() => this.onmessage?.({data:'readyok'}));
    if (command.startsWith('go ')) queueMicrotask(() => this.onmessage?.({data:'bestmove e1h1 ponder e8g8'}));
  }
  terminate() { this.terminated = true; }
}
globalThis.Worker = FakeWorker;
try {
  const ai = createChessAI({workerUrl:'mock-stockfish.js', readyTimeout:1000});
  ai.setChess960(true);
  await ai.initialize();
  assert.ok(commands.includes('setoption name UCI_Chess960 value true'));
  const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w HAha - 0 1';
  assert.equal(await ai.getBestMove({fen,moveTime:25}), 'e1h1');
  assert.ok(commands.includes(`position fen ${fen}`));
  assert.ok(commands.includes('go movetime 25'));
  const piece = (type,color) => ({dataset:{type},classList:{contains: c => c === color}});
  const at = s => ({e1:piece('King-W','white'),h1:piece('Rook-K-W','white')})[s];
  assert.deepEqual(normalizeChess960UciMove('e1h1',at).castle, {side:'king',kingFrom:'e1',rookFrom:'h1',kingTo:'g1'});
  ai.setChess960(false);
  assert.equal(commands.at(-1),'setoption name UCI_Chess960 value false');
  ai.destroy();
  assert.equal(ai.isReady(),false);
  console.log('Chess960 Stockfish mock integration: OK');
} finally { globalThis.Worker = oldWorker; }
