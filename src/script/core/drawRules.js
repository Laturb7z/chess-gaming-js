
export function createDrawRules({
  getCurrentPlayer,
  getEnPassantTarget,
  getCastlingState,
  getPositionHistory,
  getHalfmoveClock,
  getDrawOfferAvailable,
  setDrawOfferAvailable,
  isGameOver,
  isPromotionPending,
  isMoveKingSafe,
  finishDraw,
  openDrawAgreement,
  isAnalysisMode
}) {

  // =====================================
  // EN PASSANT NA CHAVE DA POSIÇÃO
  // =====================================

  function getLegalEnPassantKey() {
    const enPassantTarget = getEnPassantTarget();

    if (!enPassantTarget) return '-';

    const { row, col } = enPassantTarget;
    const currentPlayer = getCurrentPlayer();

    const pawnRow = currentPlayer === 'white'
      ? row + 1
      : row - 1;

    for (const offset of [-1, 1]) {
      const pawnCol = col + offset;

      if (pawnCol < 0 || pawnCol > 7) continue;

      const square = document.querySelector(
        `#chessboard [data-row="${pawnRow}"][data-col="${pawnCol}"]`
      );

      const pawn = square?.querySelector(
        ':scope > .chess-piece'
      );

      if (
        !pawn ||
        pawn.dataset.type !== 'Pawn' ||
        !pawn.classList.contains(currentPlayer)
      ) {
        continue;
      }

      if (isMoveKingSafe(pawn, row, col)) {
        return `${row},${col}`;
      }
    }

    return '-';
  }

  // =====================================
  // IDENTIFICAÇÃO DA POSIÇÃO
  // =====================================

  function getPositionKey() {
    const pieces = [
      ...document.querySelectorAll(
        '#chessboard .chess-piece'
      )
    ]
      .map(piece => ({
        type: piece.dataset.type,
        color: piece.classList.contains('white')
          ? 'white'
          : 'black',
        row: Number(piece.dataset.row),
        col: Number(piece.dataset.col)
      }))
      .sort((a, b) =>
        a.row - b.row ||
        a.col - b.col ||
        a.type.localeCompare(b.type)
      );

    function hasOriginalPiece(row, col, type, color) {
      const square = document.querySelector(
        `#chessboard [data-row="${row}"][data-col="${col}"]`
      );

      const piece = square?.querySelector(
        ':scope > .chess-piece'
      );

      return Boolean(
        piece &&
        piece.dataset.type === type &&
        piece.classList.contains(color) &&
        !piece.classList.contains('promoted')
      );
    }

    const {
      WkingMoved,
      BkingMoved,
      WKrookMoved,
      WQrookMoved,
      BKrookMoved,
      BQrookMoved
    } = getCastlingState();

    const whiteKing = hasOriginalPiece(
      7, 4, 'King-W', 'white'
    );

    const blackKing = hasOriginalPiece(
      0, 4, 'King-B', 'black'
    );

    const castlingRights = [
      !WkingMoved &&
      !WKrookMoved &&
      whiteKing &&
      hasOriginalPiece(
        7, 7, 'Rook-K-W', 'white'
      ),

      !WkingMoved &&
      !WQrookMoved &&
      whiteKing &&
      hasOriginalPiece(
        7, 0, 'Rook-Q-W', 'white'
      ),

      !BkingMoved &&
      !BKrookMoved &&
      blackKing &&
      hasOriginalPiece(
        0, 7, 'Rook-K-B', 'black'
      ),

      !BkingMoved &&
      !BQrookMoved &&
      blackKing &&
      hasOriginalPiece(
        0, 0, 'Rook-Q-B', 'black'
      )
    ];

    const enPassant = getLegalEnPassantKey();

    return JSON.stringify({
      pieces,
      currentPlayer: getCurrentPlayer(),
      castlingRights,
      enPassant
    });
  }

  // =====================================
  // CONTAGEM DE REPETIÇÕES
  // =====================================

  function countPositionRepetitions() {
    const currentPosition = getPositionKey();

    return getPositionHistory().filter(
      position => position === currentPosition
    ).length;
  }

  // =====================================
  // BOTÃO DE EMPATE
  // =====================================

  
function updateDrawButton() {
  const claimDrawBtn = document.getElementById(
    'claim-draw-btn'
  );

  if (!claimDrawBtn) return;

  const repetitions = countPositionRepetitions();
  const fiftyMoves = getHalfmoveClock() >= 100;

  // O botão permanece visível durante a partida.
  claimDrawBtn.hidden = isAnalysisMode();

  // Desabilitar apenas quando não puder ser utilizado.
  claimDrawBtn.disabled =
  isGameOver() ||
  isPromotionPending() ||
  isAnalysisMode();

  // Atualizar a descrição conforme a situação.
  if (fiftyMoves) {
    claimDrawBtn.title = 'Reivindicar empate por 50 movimentos';
  } else if (repetitions >= 3) {
    claimDrawBtn.title = 'Reivindicar empate por 3 repetições';
  } else {
    claimDrawBtn.title = 'Propor empate por acordo';
  }
}


  // =====================================
  // REPETIÇÃO QUÍNTUPLA
  // =====================================

  function checkFivefoldRepetition() {
    if (isGameOver() || isPromotionPending()) {
      return false;
    }

    if (countPositionRepetitions() >= 5) {
      finishDraw(
        'Empate automático por repetição quíntupla!'
      );

      console.log(
        'EMPATE AUTOMÁTICO: 5 REPETIÇÕES!'
      );

      return true;
    }

    return false;
  }

  // =====================================
  // REIVINDICAÇÃO DE EMPATE
  // =====================================


function claimFiftyMoveDraw() {
  if (isGameOver() || isPromotionPending()) return;

  const repetitions = countPositionRepetitions();
  const halfmoves = getHalfmoveClock();

  // Regra dos 50 movimentos
  if (halfmoves >= 100) {
    finishDraw(
      'Empate pela regra dos 50 movimentos!'
    );

    console.log('EMPATE: 50 MOVIMENTOS!');
    return;
  }

  // Regra das 3 repetições
  if (repetitions >= 3) {
    finishDraw(
      'Empate por repetição tripla!'
    );

    console.log('EMPATE: 3 REPETIÇÕES!');
    return;
  }

  // Caso contrário, propor empate por acordo
  openDrawAgreement();

  
  console.log('PROPOSTA DE EMPATE ABERTA!');
}

return {
  getLegalEnPassantKey,
  getPositionKey,
  countPositionRepetitions,
  updateDrawButton,
  checkFivefoldRepetition,
  claimFiftyMoveDraw
};

}
