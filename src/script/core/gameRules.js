import {
  isPathClear,
  isOccupiedSquare,
  isPieceMoved
} from "../utils/additional.js";

import { playCheckSound } from "../systems/sounds.js";

/**
 * Verifica se uma casa está sendo atacada
 * por alguma peça da cor informada.
 */
export function isSquareAttacked(row, col, attackerColor) {
  const pieces = document.querySelectorAll(
    `#chessboard .chess-piece.${attackerColor}`
  );
  
  for (const piece of pieces) {
    const pieceRow = Number(piece.dataset.row);
    const pieceCol = Number(piece.dataset.col);
    const pieceType = piece.dataset.type;
    
    const rowDiff = row - pieceRow;
    const colDiff = col - pieceCol;
    
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    
    if (pieceType === "Pawn") {
      const direction = attackerColor === "white" ? -1 : 1;
      
      if (rowDiff === direction && absColDiff === 1) {
        return true;
      }
    }
    
    if (pieceType.startsWith("Knight")) {
      if (
        (absRowDiff === 2 && absColDiff === 1) ||
        (absRowDiff === 1 && absColDiff === 2)
      ) {
        return true;
      }
    }
    
    if (pieceType.startsWith("Bishop")) {
      if (
        absRowDiff === absColDiff &&
        absRowDiff > 0 &&
        isPathClear(pieceRow, pieceCol, row, col)
      ) {
        return true;
      }
    }
    
    if (pieceType.startsWith("Rook")) {
      if (
        (rowDiff === 0 || colDiff === 0) &&
        (rowDiff !== 0 || colDiff !== 0) &&
        isPathClear(pieceRow, pieceCol, row, col)
      ) {
        return true;
      }
    }
    
    if (pieceType.startsWith("Queen")) {
      if (
        (
          rowDiff === 0 ||
          colDiff === 0 ||
          absRowDiff === absColDiff
        ) &&
        (rowDiff !== 0 || colDiff !== 0) &&
        isPathClear(pieceRow, pieceCol, row, col)
      ) {
        return true;
      }
    }
    
    if (pieceType.startsWith("King")) {
      if (Math.max(absRowDiff, absColDiff) === 1) {
        return true;
      }
    }
  }
  
  return false;
}


/**
 * Verifica se o rei da cor informada
 * está em xeque.
 */
export function isCheck(color) {
  const king = document.querySelector(
    `#chessboard .chess-piece.${color}.king`
  );
  
  if (!king) return false;
  
  const kingRow = Number(king.dataset.row);
  const kingCol = Number(king.dataset.col);
  
  const opponentColor =
    color === "white" ? "black" : "white";
  
  return isSquareAttacked(
    kingRow,
    kingCol,
    opponentColor
  );
}

export function isCheckmate(color, hasLegalMoves) {
  return isCheck(color) && !hasLegalMoves(color);
}


/**
 * Verifica se o jogador está afogado.
 *
 * O afogamento acontece quando o jogador:
 * - Não está em xeque;
 * - Não possui movimentos legais.
 */
export function isStalemate(color, hasLegalMoves) {
  return !isCheck(color) && !hasLegalMoves(color);
}


/**
 * Verifica se existe material insuficiente
 * para realizar um xeque-mate.
 */
export function isInsufficientMaterial() {
  const pieces = [
    ...document.querySelectorAll('#chessboard .chess-piece')
  ];
  
  // Ignorar os reis
  const remainingPieces = pieces.filter(
    piece => !piece.dataset.type.includes('King')
  );
  
  // Rei contra rei
  if (remainingPieces.length === 0) {
    return true;
  }
  
  // Rei + bispo contra rei
  // Rei + cavalo contra rei
  if (remainingPieces.length === 1) {
    const type = remainingPieces[0].dataset.type;
    
    return type.includes('Bishop') ||
      type.includes('Knight');
  }
  
  // Rei + bispo contra rei + bispo,
  // com bispos em casas da mesma cor
  if (
    remainingPieces.length === 2 &&
    remainingPieces.every(
      piece => piece.dataset.type.includes('Bishop')
    )
  ) {
    const bishopColors = remainingPieces.map(piece => {
      const row = Number(piece.dataset.row);
      const col = Number(piece.dataset.col);
      
      return (row + col) % 2;
    });
    
    return bishopColors[0] === bishopColors[1];
  }
  
  return false;
}


/**
 * Verifica se o jogador possui material
 * com potencial para realizar xeque-mate.
 *
 * Utilizada no encerramento por tempo.
 */
export function hasPotentialMatingMaterial(color) {
  const pieces = [
    ...document.querySelectorAll(
      `#chessboard .chess-piece.${color}`
    )
  ].filter(piece => !piece.dataset.type.includes('King'));
  
  if (pieces.length === 0) return false;
  
  // Peões, torres e damas permitem possibilidades de mate.
  if (pieces.some(piece =>
      piece.dataset.type === 'Pawn' ||
      piece.dataset.type.includes('Rook') ||
      piece.dataset.type.includes('Queen')
    )) {
    return true;
  }
  
  const bishops = pieces.filter(piece =>
    piece.dataset.type.includes('Bishop')
  );
  
  const knights = pieces.filter(piece =>
    piece.dataset.type.includes('Knight')
  );
  
  // Dois cavalos podem dar mate com colaboração adversária.
  if (knights.length >= 2) return true;
  
  // Bispo e cavalo podem dar mate.
  if (bishops.length > 0 && knights.length > 0) return true;
  
  // Dois bispos em casas de cores diferentes podem dar mate.
  const bishopSquareColors = new Set(
    bishops.map(piece =>
      (Number(piece.dataset.row) + Number(piece.dataset.col)) % 2
    )
  );
  
  if (bishopSquareColors.size >= 2) return true;
  
  // Com material adversário adicional, um bispo ou cavalo
  // isolado pode participar de uma posição de mate.
  const opponent = color === 'white' ? 'black' : 'white';
  
  const opponentHasOtherPieces = [
    ...document.querySelectorAll(
      `#chessboard .chess-piece.${opponent}`
    )
  ].some(piece => !piece.dataset.type.includes('King'));
  
  return opponentHasOtherPieces && pieces.length > 0;
}


/**
 * Verifica se o jogador possui pelo menos
 * um movimento legal disponível.
 *
 * A função canMovePiece é recebida como
 * dependência do controlador principal.
 */
export function hasLegalMoves(color, canMovePiece) {
  const pieces = document.querySelectorAll(
    `.chess-piece.${color}`
  );
  
  for (const piece of pieces) {
    const currentRow = Number(piece.dataset.row);
    const currentCol = Number(piece.dataset.col);
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        
        if (row === currentRow && col === currentCol) {
          continue;
        }
        
        // Roque não pode ser utilizado para escapar de xeque.
        // A validação do roque será tratada separadamente.
        if (
          piece.dataset.type.startsWith('King') &&
          Math.abs(col - currentCol) === 2
        ) {
          continue;
        }
        
        if (canMovePiece(piece, row, col)) {
          return true;
        }
      }
    }
  }
  
  return false;
}


/**
 * Verifica se o rei pode ocupar uma casa
 * sem ficar sob ataque adversário.
 *
 * Simula o movimento e depois restaura
 * a posição original do tabuleiro.
 */
export function isKingDestinationSafe(
  startRow,
  startCol,
  endRow,
  endCol,
  color
) {
  const startSquare = document.querySelector(
    `[data-row="${startRow}"][data-col="${startCol}"]`
  );
  
  const endSquare = document.querySelector(
    `[data-row="${endRow}"][data-col="${endCol}"]`
  );
  
  if (!startSquare || !endSquare) return false;
  
  const king = startSquare.firstChild;
  const capturedPiece = endSquare.firstChild;
  
  if (!king) return false;
  
  if (capturedPiece && capturedPiece.classList.contains(color)) {
    return false;
  }
  
  if (capturedPiece) {
    endSquare.removeChild(capturedPiece);
  }
  
  // Simular o movimento do rei
  endSquare.appendChild(king);
  
  king.dataset.row = endRow;
  king.dataset.col = endCol;
  
  const opponentColor =
    color === 'white' ? 'black' : 'white';
  
  const safe = !isSquareAttacked(
    endRow,
    endCol,
    opponentColor
  );
  
  // Restaurar o rei à casa original
  startSquare.appendChild(king);
  
  king.dataset.row = startRow;
  king.dataset.col = startCol;
  
  // Restaurar eventual peça capturada
  if (capturedPiece) {
    endSquare.appendChild(capturedPiece);
  }
  
  return safe;
}


/**
 * Verifica se um movimento deixa o próprio rei seguro.
 *
 * Simula o movimento, verifica o ataque ao rei
 * e restaura o tabuleiro ao estado original.
 */
export function isMoveKingSafe(piece, newRow, newCol, enPassantTarget) {
  const color = piece.classList.contains('white') ? 'white' : 'black';
  const opponentColor = color === 'white' ? 'black' : 'white';
  
  const currentRow = Number(piece.dataset.row);
  const currentCol = Number(piece.dataset.col);
  
  const currentSquare = document.querySelector(
    `[data-row="${currentRow}"][data-col="${currentCol}"]`
  );
  
  const newSquare = document.querySelector(
    `[data-row="${newRow}"][data-col="${newCol}"]`
  );
  
  if (!currentSquare || !newSquare) return false;
  if (currentSquare === newSquare) return false;
  
  const capturedPiece = newSquare.querySelector(':scope > .chess-piece');
  
  // Não pode capturar uma peça aliada nem o rei adversário
  if (capturedPiece) {
    if (capturedPiece.classList.contains(color)) return false;
    if (capturedPiece.dataset.type.includes('King')) return false;
  }
  
  // Verificar captura por En Passant
  const isEnPassant =
    piece.dataset.type === 'Pawn' &&
    enPassantTarget !== null &&
    newRow === enPassantTarget.row &&
    newCol === enPassantTarget.col &&
    Math.abs(newCol - currentCol) === 1 &&
    !capturedPiece;
  
  let enPassantPawn = null;
  let enPassantSquare = null;
  
  if (isEnPassant) {
    enPassantSquare = document.querySelector(
      `[data-row="${enPassantTarget.pawnRow}"][data-col="${enPassantTarget.pawnCol}"]`
    );
    
    enPassantPawn = enPassantSquare?.querySelector(':scope > .chess-piece');
    
    if (!enPassantPawn) return false;
  }
  
  // Simular a captura
  if (capturedPiece) capturedPiece.remove();
  if (enPassantPawn) enPassantPawn.remove();
  
  // Simular o movimento
  newSquare.appendChild(piece);
  piece.dataset.row = newRow;
  piece.dataset.col = newCol;
  
  // Encontrar o próprio rei na posição simulada
  const king = Array.from(
    document.querySelectorAll(`.chess-piece.${color}`)
  ).find(p => p.dataset.type.includes('King'));
  
  let safe = false;
  
  if (king) {
    const kingRow = Number(king.dataset.row);
    const kingCol = Number(king.dataset.col);
    
    safe = !isSquareAttacked(kingRow, kingCol, opponentColor);
  }
  
  // Restaurar o tabuleiro
  currentSquare.appendChild(piece);
  piece.dataset.row = currentRow;
  piece.dataset.col = currentCol;
  
  if (capturedPiece) {
    newSquare.appendChild(capturedPiece);
  }
  
  if (enPassantPawn && enPassantSquare) {
    enPassantSquare.appendChild(enPassantPawn);
  }
  
  return safe;
}



/**
 * Verifica se o roque curto é permitido.
 */
export function isShortCastleValid(
  color,
  kingMoved,
  rookShortMoved,
  kingAlreadyMoved,
  rookAlreadyMoved
) {
  const row = color === 'white' ? 7 : 0;
  
  const opponentColor = color === 'white' ?
    'black' :
    'white';
  
  const kingType = color === 'white' ?
    'King-W' :
    'King-B';
  
  const rookType = color === 'white' ?
    'Rook-K-W' :
    'Rook-K-B';
  
  const kingSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="4"]`
  );
  
  const rookSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="7"]`
  );
  
  const kingPiece = kingSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  const rookPiece = rookSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  // Verificar se o rei e a torre corretos
  // estão presentes nas casas iniciais.
  if (
    !kingPiece ||
    !rookPiece ||
    kingPiece.dataset.type !== kingType ||
    rookPiece.dataset.type !== rookType ||
    !kingPiece.classList.contains(color) ||
    !rookPiece.classList.contains(color) ||
    rookPiece.classList.contains('promoted')
  ) {
    return false;
  }
  
  // Verificar os direitos de roque.
  if (
    kingMoved ||
    rookShortMoved ||
    kingAlreadyMoved ||
    rookAlreadyMoved
  ) {
    return false;
  }
  
  // Verificar se as casas entre o rei
  // e a torre estão livres.
  if (!isPathClear(row, 4, row, 6)) {
    return false;
  }
  
  // O rei não pode estar em xeque,
  // atravessar ou terminar em casa atacada.
  for (const col of [4, 5, 6]) {
    if (isSquareAttacked(row, col, opponentColor)) {
      return false;
    }
  }
  
  return true;
}



/**
 * Verifica se o roque longo é permitido.
 */
export function isLongCastleValid(
  color,
  kingMoved,
  rookLongMoved,
  kingAlreadyMoved,
  rookAlreadyMoved
) {
  const row = color === 'white' ? 7 : 0;
  
  const opponentColor = color === 'white' ?
    'black' :
    'white';
  
  const kingType = color === 'white' ?
    'King-W' :
    'King-B';
  
  const rookType = color === 'white' ?
    'Rook-Q-W' :
    'Rook-Q-B';
  
  const kingSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="4"]`
  );
  
  const rookSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="0"]`
  );
  
  const kingPiece = kingSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  const rookPiece = rookSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  // Verificar a presença do rei e da torre corretos.
  if (
    !kingPiece ||
    !rookPiece ||
    kingPiece.dataset.type !== kingType ||
    rookPiece.dataset.type !== rookType ||
    !kingPiece.classList.contains(color) ||
    !rookPiece.classList.contains(color) ||
    rookPiece.classList.contains('promoted')
  ) {
    return false;
  }
  
  // Verificar os direitos de roque.
  if (
    kingMoved ||
    rookLongMoved ||
    kingAlreadyMoved ||
    rookAlreadyMoved
  ) {
    return false;
  }
  
  // As casas b, c e d precisam estar vazias.
  for (const col of [1, 2, 3]) {
    if (isOccupiedSquare(row, col)) {
      return false;
    }
  }
  
  // O rei não pode estar em xeque,
  // atravessar ou terminar em casa atacada.
  for (const col of [4, 3, 2]) {
    if (isSquareAttacked(row, col, opponentColor)) {
      return false;
    }
  }
  
  return true;
}


/**
 * Identifica se o movimento corresponde
 * a um roque pequeno válido.
 */
export function isShortCastleMove(
  piece,
  newRow,
  newCol,
  currentPlayer,
  isShortCastleValid
) {
  const currentRow = parseInt(piece.dataset.row);
  const currentCol = parseInt(piece.dataset.col);
  
  const pieceSuffix = piece.dataset.type.split('-')[1];
  
  if (
    !piece.dataset.type.startsWith('King') ||
    Math.abs(newCol - currentCol) !== 2
  ) {
    return false;
  }
  
  return (
    currentPlayer === 'white' &&
    currentRow === 7 &&
    currentCol === 4 &&
    newRow === 7 &&
    newCol === 6 &&
    isShortCastleValid(
      'white',
      isPieceMoved('white', 'King-' + pieceSuffix),
      isPieceMoved('white', 'Rook-K-' + pieceSuffix)
    )
  ) || (
    currentPlayer === 'black' &&
    currentRow === 0 &&
    currentCol === 4 &&
    newRow === 0 &&
    newCol === 6 &&
    isShortCastleValid(
      'black',
      isPieceMoved('black', 'King-' + pieceSuffix),
      isPieceMoved('black', 'Rook-K-' + pieceSuffix)
    )
  );
}


/**
 * Identifica se o movimento corresponde
 * a um roque longo válido.
 */
export function isLongCastleMove(
  piece,
  newRow,
  newCol,
  currentPlayer,
  isLongCastleValid
) {
  const currentRow = parseInt(piece.dataset.row);
  const currentCol = parseInt(piece.dataset.col);
  
  const pieceSuffix = piece.dataset.type.split('-')[1];
  
  if (
    !piece.dataset.type.startsWith('King') ||
    Math.abs(newCol - currentCol) !== 2
  ) {
    return false;
  }
  
  return (
    currentPlayer === 'white' &&
    currentRow === 7 &&
    currentCol === 4 &&
    newRow === 7 &&
    newCol === 2 &&
    isLongCastleValid(
      'white',
      isPieceMoved('white', 'King-' + pieceSuffix),
      isPieceMoved('white', 'Rook-Q-' + pieceSuffix)
    )
  ) || (
    currentPlayer === 'black' &&
    currentRow === 0 &&
    currentCol === 4 &&
    newRow === 0 &&
    newCol === 2 &&
    isLongCastleValid(
      'black',
      isPieceMoved('black', 'King-' + pieceSuffix),
      isPieceMoved('black', 'Rook-Q-' + pieceSuffix)
    )
  );
}



/**
 * Executa o roque curto.
 * Retorna true somente se o roque for concluído.
 */
export function performShortCastle(
  _king,
  color,
  movePiece,
  playCastlingSound
) {
  const row = color === 'white' ? 7 : 0;
  
  const kingSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="4"]`
  );
  
  const rookSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="7"]`
  );
  
  const rookDestination = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="5"]`
  );
  
  const kingPiece = kingSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  const rookPiece = rookSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  const kingType = color === 'white' ?
    'King-W' :
    'King-B';
  
  const rookType = color === 'white' ?
    'Rook-K-W' :
    'Rook-K-B';
  
  // Confirmar a presença das peças corretas.
  if (
    !kingPiece ||
    !rookPiece ||
    !rookDestination ||
    kingPiece.dataset.type !== kingType ||
    rookPiece.dataset.type !== rookType ||
    !kingPiece.classList.contains(color) ||
    !rookPiece.classList.contains(color) ||
    rookDestination.querySelector(':scope > .chess-piece')
  ) {
    return false;
  }
  
  // Primeiro, tentar movimentar o rei.
  const kingMoved = movePiece(kingPiece, row, 6, true);
  
  // Se o movimento falhar, a torre permanece no lugar.
  if (kingMoved !== true) {
    return false;
  }
  
  // Movimentar a torre somente após o sucesso do rei.
  rookDestination.appendChild(rookPiece);
  
  rookPiece.dataset.row = row;
  rookPiece.dataset.col = 5;
  
  const opponentColor = color === 'white' ? 'black' : 'white';
const causesCheck = isCheck(opponentColor);

playCastlingSound(() => {
  if (causesCheck) {
    playCheckSound();
  }
});
  
  console.log(
    `Roque curto executado por: ${color}`
  );
  
  return true;
}


/**
 * Executa o roque longo.
 * Retorna true somente se o roque for concluído.
 */
export function performLongCastle(
  _king,
  color,
  movePiece,
  playCastlingSound
) {
  const row = color === 'white' ? 7 : 0;
  
  const kingSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="4"]`
  );
  
  const rookSquare = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="0"]`
  );
  
  const rookDestination = document.querySelector(
    `#chessboard [data-row="${row}"][data-col="3"]`
  );
  
  const kingPiece = kingSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  const rookPiece = rookSquare?.querySelector(
    ':scope > .chess-piece'
  );
  
  const kingType = color === 'white' ?
    'King-W' :
    'King-B';
  
  const rookType = color === 'white' ?
    'Rook-Q-W' :
    'Rook-Q-B';
  
  // Confirmar a presença das peças corretas.
  if (
    !kingPiece ||
    !rookPiece ||
    !rookDestination ||
    kingPiece.dataset.type !== kingType ||
    rookPiece.dataset.type !== rookType ||
    !kingPiece.classList.contains(color) ||
    !rookPiece.classList.contains(color) ||
    rookDestination.querySelector(':scope > .chess-piece')
  ) {
    return false;
  }
  
  // Primeiro, tentar movimentar o rei.
  const kingMoved = movePiece(kingPiece, row, 2, true);
  
  // Se o movimento falhar, a torre permanece no lugar.
  if (kingMoved !== true) {
    return false;
  }
  
  // Movimentar a torre somente após o sucesso do rei.
  rookDestination.appendChild(rookPiece);
  
  rookPiece.dataset.row = row;
  rookPiece.dataset.col = 3;
  
  const opponentColor = color === 'white' ? 'black' : 'white';
const causesCheck = isCheck(opponentColor);

playCastlingSound(() => {
  if (causesCheck) {
    playCheckSound();
  }
});
  
  console.log(
    `Roque longo executado por: ${color}`
  );
  
  return true;
}