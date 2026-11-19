import { planChess960Castle, applyChess960Castle } from './chess960.js';
import { createChess960AttackEvaluator } from './chess960Attack.js';

/** Integração entre o tabuleiro existente no DOM e as regras de roque do Chess960.
 * O estado do jogo só é alterado quando execute() recebe um plano validado.
 */
export function createChess960CastlingAdapter({ squareAt, rights }) {
  if (typeof squareAt !== 'function' || typeof rights !== 'function') {
    throw new TypeError('squareAt and rights callbacks are required');
  }
  const at = (row, col) => squareAt(row, col)?.querySelector(':scope > .chess-piece') ?? null;
  const attacked = createChess960AttackEvaluator(at);

  function plan(color, side) {
    if (!['white', 'black'].includes(color) || !['king', 'queen'].includes(side)) return null;
    const row = color === 'white' ? 7 : 0;
    const suffix = color === 'white' ? 'W' : 'B';
    let kingCol = -1;
    let rookCol = -1;
    for (let col = 0; col < 8; col++) {
      const piece = at(row, col);
      if (piece?.dataset.type === `King-${suffix}`) kingCol = col;
      if (piece?.dataset.type === `Rook-${side === 'king' ? 'K' : 'Q'}-${suffix}` &&
          !piece.classList.contains('promoted')) rookCol = col;
    }
    const flags = rights(color, side);
    if (!flags || kingCol < 0 || rookCol < 0) return null;
    return planChess960Castle({ color, side, kingCol, rookCol, at, attacked,
      kingHasMoved: Boolean(flags.kingMoved), rookHasMoved: Boolean(flags.rookMoved) });
  }

  function execute(validatedPlan) {
    return applyChess960Castle(validatedPlan, squareAt);
  }

  return { plan, execute };
}
