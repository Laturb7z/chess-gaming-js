// Fase 12 / Etapa 3: captura de um snapshot da partida.
// A restauração permanece no controlador, pois atualiza peças, relógio e interface.
export function captureGameState(state) {
  const pieces = [];
  state.chessboard.querySelectorAll('.chess-piece').forEach(piece => {
    pieces.push({
      type: piece.dataset.type,
      color: piece.classList.contains('white') ? 'white' : 'black',
      row: Number(piece.dataset.row),
      col: Number(piece.dataset.col),
      promoted: piece.classList.contains('promoted')
    });
  });

  return {
    pieces,
    chessVariant: state.chessVariant ?? "classic",
    chess960Position: state.chess960Position ?? 518,
    currentPlayer: state.currentPlayer,
    currentPlayer2: state.currentPlayer2,
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    WkingMoved: state.WkingMoved,
    BkingMoved: state.BkingMoved,
    WKrookMoved: state.WKrookMoved,
    WQrookMoved: state.WQrookMoved,
    BKrookMoved: state.BKrookMoved,
    BQrookMoved: state.BQrookMoved,
    moveHistory: state.moveHistory,
    capturedPieces: state.capturedPieces,
    gameOver: state.gameOver,
    gameResult: state.gameResult,
    gameId: state.currentGameId,
    resultRegistered: state.resultRegistered,
    halfmoveClock: state.halfmoveClock,
    positionHistory: [...state.positionHistory],
    drawOfferAvailable: state.drawOfferAvailable,
    clockState: state.clockState,
    checkmateTitle: state.checkmateTitle,
    checkmateWinnerText: state.checkmateWinnerText,
    checkmateOverlayVisible: state.checkmateOverlayVisible
  };
}


// Fase 12 / Etapa 4: restauração visual das peças.
// O controlador mantém o gerenciamento de turnos, relógios, regras e interface.
export function restoreBoardPieces(chessboard, pieces, createPiece) {
  chessboard.querySelectorAll('.chess-piece').forEach(piece => piece.remove());

  for (const data of pieces) {
    const square = chessboard.querySelector(
      `[data-row="${data.row}"][data-col="${data.col}"]`
    );
    if (!square) continue;

    const piece = createPiece(
      data.type,
      data.color,
      data.row,
      data.col,
      data.promoted
    );
    square.appendChild(piece);
  }
}
