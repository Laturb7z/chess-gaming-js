import assert from 'node:assert/strict';
import { capturedOriginalRookRight as right } from '../../src/script/chess960/chess960Rights.js';
const rook = (type, col, promoted=false) => ({dataset:{type,col:String(col)},classList:{contains:cls=>promoted&&cls==='promoted'}});
for (const col of [0,1,2,3,4,5,6,7]) {
  assert.equal(right(rook('Rook-K-W',col),7,'chess960'),'WKrookMoved');
  assert.equal(right(rook('Rook-Q-B',col),0,'chess960'),'BQrookMoved');
}
assert.equal(right(rook('Rook-K-W',4),7,'classic'),null);
assert.equal(right(rook('Rook-K-W',7),7,'classic'),'WKrookMoved');
assert.equal(right(rook('Rook-Q-B',0),0,'classic'),'BQrookMoved');
assert.equal(right(rook('Rook-Q-W',2,true),7,'chess960'),null);
assert.equal(right(rook('Rook-Q-W',2),6,'chess960'),null);
assert.equal(right(rook('Knight-W',2),7,'chess960'),null);
console.log('Chess960: direitos de roque após capturas aprovados');
