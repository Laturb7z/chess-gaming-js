import assert from 'node:assert/strict';
import { normalizeChessSession } from '../../src/script/chess960/chess960Session.js';
import { getChess960BackRank } from '../../src/script/chess960/chess960.js';
assert.deepEqual(normalizeChessSession({variant:'classic',chess960Position:999}), {variant:'classic',chess960Position:518});
assert.throws(() => normalizeChessSession({variant:'chess960',chess960Position:960}), RangeError);
assert.throws(() => normalizeChessSession({variant:'chess960',chess960Position:1.5}), RangeError);
assert.throws(() => normalizeChessSession({variant:'unknown'}), TypeError);
for (let n=0;n<960;n++) {
 const session=normalizeChessSession({variant:'chess960',chess960Position:n});
 assert.equal(session.chess960Position,n);
 assert.equal(getChess960BackRank(n,'white').length,8);
}
console.log('Chess960 session: 960 posições e validações OK');
