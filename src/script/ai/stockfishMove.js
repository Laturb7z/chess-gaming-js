// Traduz a resposta UCI do Stockfish em uma jogada no tabuleiro.
// O controlador continua responsável pelo ciclo assíncrono do motor e pelos turnos.
export function applyStockfishMove(move, {
  chessboard,
  canMovePiece,
  selectPiece,
  handleSquareClick,
  isPromotionPending
}) {
  const colFrom = move.charCodeAt(0) - 97,
    rowFrom = 8 - Number(move[1]);
  const colTo = move.charCodeAt(2) - 97,
    rowTo = 8 - Number(move[3]);
  const piece = chessboard.querySelector(`[data-row="${rowFrom}"][data-col="${colFrom}"] > .chess-piece`);
  const square = chessboard.querySelector(`[data-row="${rowTo}"][data-col="${colTo}"]`);
  if (!piece || !square || !canMovePiece(piece, rowTo, colTo)) {
    throw new Error(`Lance inválido do motor: ${move}`);
  }
  selectPiece(piece);
  handleSquareClick({ currentTarget: square });
  if (isPromotionPending() && move[4]) {
    const types = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };
    const target = types[move[4]];
    const option = document.querySelector(`#promotion-overlay [data-promotion="${target}"]`);
    if (option) option.click();
    else console.warn('Selecione manualmente a promoção do Stockfish:', target);
  }
}
