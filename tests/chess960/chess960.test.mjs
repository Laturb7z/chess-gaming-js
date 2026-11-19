import assert from 'node:assert/strict';
import { getChess960Position, getChess960BackRank, planChess960Castle } from '../../src/script/chess960/chess960.js';
import { createChess960AttackEvaluator } from '../../src/script/chess960/chess960Attack.js';
const seen = new Set();
for (let n = 0; n < 960; n++) {
  const rank = getChess960Position(n);
  const key = rank.join(',');
  assert(!seen.has(key)); seen.add(key);
  assert.equal(rank.length, 8);
  const bishops = rank.flatMap((p, i) => p === 'Bishop' ? [i] : []);
  assert.equal(bishops.length, 2);
  assert.notEqual(bishops[0] % 2, bishops[1] % 2);
  const k = rank.indexOf('King');
  assert(rank.indexOf('Rook-Q') < k && k < rank.indexOf('Rook-K'));
  assert.equal(getChess960BackRank(n, 'white').length, 8);
}
assert.equal(seen.size, 960);
assert.deepEqual(getChess960Position(518), ['Rook-Q','Knight','Bishop','Queen','King','Bishop','Knight','Rook-K']);
function piece(type, color) { return { dataset: { type }, classList: { contains: cls => cls === color } }; }
function setup(kingCol, rookCol, side, enemy = []) {
  const board = new Map();
  board.set(`7:${kingCol}`, piece('King-W', 'white'));
  board.set(`7:${rookCol}`, piece(`Rook-${side === 'king' ? 'K' : 'Q'}-W`, 'white'));
  for (const [r,c,type] of enemy) board.set(`${r}:${c}`, piece(type, 'black'));
  const at = (r,c) => board.get(`${r}:${c}`) ?? null;
  return planChess960Castle({ color: 'white', side, kingCol, rookCol, at, attacked: createChess960AttackEvaluator(at) });
}
assert(setup(4,7,'king'));
assert(setup(4,0,'queen'));
assert(setup(6,7,'king')); // stationary king
assert(setup(4,5,'king')); // stationary rook
assert(setup(5,6,'king')); // king and rook swap
assert.equal(setup(4,7,'king',[[0,4,'Rook-K-B']]), null); // king initially in check
assert.equal(setup(4,7,'king',[[0,5,'Rook-K-B']]), null); // attacked transit square
console.log('Chess960: 960 posições + 7 cenários de roque aprovados');
