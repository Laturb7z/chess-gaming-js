/** Detecção de casas atacadas para o roque Chess960, sem modificar o DOM. */
export function isChess960SquareAttacked(row, col, attackerColor, at) {
  if (typeof at !== 'function') return false;
  const clear = (r, c, tr, tc) => {
    const dr = Math.sign(tr - r), dc = Math.sign(tc - c);
    r += dr; c += dc;
    while (r !== tr || c !== tc) {
      if (at(r, c)) return false;
      r += dr; c += dc;
    }
    return true;
  };
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const piece = at(r, c);
    if (!piece || piece.color !== attackerColor) continue;
    const type = piece.type.split('-')[0];
    const dr = row - r, dc = col - c, ar = Math.abs(dr), ac = Math.abs(dc);
    if (type === 'Pawn' && dr === (attackerColor === 'white' ? -1 : 1) && ac === 1) return true;
    if (type === 'Knight' && ((ar === 2 && ac === 1) || (ar === 1 && ac === 2))) return true;
    if (type === 'King' && Math.max(ar, ac) === 1) return true;
    if (type === 'Bishop' && ar === ac && ar > 0 && clear(r, c, row, col)) return true;
    if (type === 'Rook' && ((dr === 0 && dc !== 0) || (dc === 0 && dr !== 0)) && clear(r, c, row, col)) return true;
    if (type === 'Queen' && (ar === ac && ar > 0 || dr === 0 && dc !== 0 || dc === 0 && dr !== 0) && clear(r, c, row, col)) return true;
  }
  return false;
}

/** Cria uma função de avaliação de ataques para planChess960Castle sem mover as peças reais. */
export function createChess960AttackEvaluator(at) {
  return (row, col, plan) => {
    const enemy = plan.color === 'white' ? 'black' : 'white';
    // Antes do roque, o rei não pode estar em xeque. Para a casa inicial,
    // avalia a posição original, sem simular o movimento da torre.
    if (col === plan.kingFrom) {
      return isChess960SquareAttacked(row, col, enemy, (r, c) => {
        const piece = at(r, c);
        return piece ? { type: piece.dataset.type, color: piece.classList.contains('white') ? 'white' : 'black' } : null;
      });
    }
    const read = (r, c) => {
      const home = plan.color === 'white' ? 7 : 0;
      if (r === home) {
        if (c === col) return { type: 'King', color: plan.color };
        if (col !== plan.kingFrom && c === plan.rookTo) return { type: 'Rook', color: plan.color };
        if (c === plan.kingFrom && col !== plan.kingFrom) return null;
        if (c === plan.rookFrom && col !== plan.kingFrom) return null;
      }
      const piece = at(r, c);
      if (!piece) return null;
      return { type: piece.dataset.type, color: piece.classList.contains('white') ? 'white' : 'black' };
    };
    return isChess960SquareAttacked(row, col, enemy, read);
  };
}
