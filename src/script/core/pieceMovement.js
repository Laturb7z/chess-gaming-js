
import {
  isPathClear,
  isOccupiedSquare,
  isEnemyPiece,
  isEnemyPawn,
  isPromotionRow,
  isPieceMoved
} from "../utils/additional.js";

import { isKingDestinationSafe } from "./gameRules.js";

// =====================================
// CAVALO
// =====================================

export function isValidKnightMove(startRow, startCol, endRow, endCol) {
  const rowDiff = Math.abs(endRow - startRow);
  const colDiff = Math.abs(endCol - startCol);

  return (rowDiff === 2 && colDiff === 1) ||
         (rowDiff === 1 && colDiff === 2);
}

// =====================================
// BISPO
// =====================================

export function isValidBishopMove(currentRow, currentCol, newRow, newCol) {
  const rowDiff = Math.abs(newRow - currentRow);
  const colDiff = Math.abs(newCol - currentCol);

  return rowDiff === colDiff &&
         colDiff > 0 &&
         isPathClear(currentRow, currentCol, newRow, newCol);
}

// =====================================
// TORRE
// =====================================

export function isValidRookMove(currentRow, currentCol, newRow, newCol) {
  return (
    currentRow === newRow ||
    currentCol === newCol
  ) && isPathClear(currentRow, currentCol, newRow, newCol);
}

// =====================================
// DAMA
// =====================================

export function isValidQueenMove(currentRow, currentCol, newRow, newCol) {
  const rowDiff = Math.abs(newRow - currentRow);
  const colDiff = Math.abs(newCol - currentCol);

  return (
    currentRow === newRow ||
    currentCol === newCol ||
    (rowDiff === colDiff && colDiff > 0)
  ) && isPathClear(currentRow, currentCol, newRow, newCol);
}

// =====================================
// PEÃO
// =====================================

export function isValidPawnMove(
  piece,
  currentRow,
  currentCol,
  newRow,
  newCol,
  enPassantTarget
) {
  const forwardDirection = piece.classList.contains('white') ? -1 : 1;
  const rowDiff = newRow - currentRow;
  const colDiff = Math.abs(newCol - currentCol);

  // Avanço de uma casa
  if (
    rowDiff === forwardDirection &&
    colDiff === 0 &&
    !isOccupiedSquare(newRow, newCol)
  ) {
    if (isPromotionRow(newRow, piece.classList)) {
      return true;
    }

    return true;
  }

  // Avanço inicial de duas casas
  if (
    rowDiff === forwardDirection * 2 &&
    colDiff === 0 &&
    currentRow === (piece.classList.contains('white') ? 6 : 1) &&
    !isOccupiedSquare(newRow, newCol)
  ) {
    const intermediateRow = currentRow + forwardDirection;

    return !isOccupiedSquare(intermediateRow, currentCol) &&
           !isOccupiedSquare(newRow, newCol);
  }

  // Captura diagonal
  if (
    rowDiff === forwardDirection &&
    colDiff === 1 &&
    isEnemyPiece(newRow, newCol, piece.classList)
  ) {
    return true;
  }

  // En Passant
  if (
    enPassantTarget &&
    newRow === enPassantTarget.row &&
    newCol === enPassantTarget.col &&
    Math.abs(newCol - currentCol) === 1 &&
    newRow === currentRow + forwardDirection &&
    !isOccupiedSquare(newRow, newCol) &&
    isEnemyPawn(
      currentRow,
      newCol,
      piece.classList.contains('white') ? 'white' : 'black'
    )
  ) {
    return true;
  }

  return false;
}

// =====================================
// REI BRANCO
// =====================================

export function isValidWhiteKingMove(startRow, startCol, endRow, endCol) {
  const rowDiff = Math.abs(endRow - startRow);
  const colDiff = Math.abs(endCol - startCol);

  if (Math.max(rowDiff, colDiff) === 1) {
    return isKingDestinationSafe(
      startRow, startCol, endRow, endCol, 'white'
    );
  }

  // Roque curto
  if (rowDiff === 0 && colDiff === 2 && endCol === 6) {
    const rookCol = 7;

    if (
      isOccupiedSquare(startRow, rookCol, 'Rook-K-W') &&
      !isPieceMoved('white', 'Rook-K-W', startRow, rookCol)
    ) {
      return !isOccupiedSquare(startRow, 5) &&
             !isOccupiedSquare(startRow, 6);
    }
  }

  // Roque longo
  if (rowDiff === 0 && colDiff === 2 && endCol === 2) {
    const rookCol = 0;

    if (
      isOccupiedSquare(startRow, rookCol, 'Rook-Q-W') &&
      !isPieceMoved('white', 'Rook-Q-W', startRow, rookCol)
    ) {
      return !isOccupiedSquare(startRow, 1) &&
             !isOccupiedSquare(startRow, 2) &&
             !isOccupiedSquare(startRow, 3);
    }
  }

  return false;
}

// =====================================
// REI PRETO
// =====================================

export function isValidBlackKingMove(startRow, startCol, endRow, endCol) {
  const rowDiff = Math.abs(endRow - startRow);
  const colDiff = Math.abs(endCol - startCol);

  if (Math.max(rowDiff, colDiff) === 1) {
    return isKingDestinationSafe(
      startRow, startCol, endRow, endCol, 'black'
    );
  }

  // Roque curto
  if (rowDiff === 0 && colDiff === 2 && endCol === 6) {
    const rookCol = 7;

    if (
      isOccupiedSquare(startRow, rookCol, 'Rook-K-B') &&
      !isPieceMoved('black', 'Rook-K-B', startRow, rookCol)
    ) {
      return !isOccupiedSquare(startRow, 5) &&
             !isOccupiedSquare(startRow, 6);
    }
  }

  // Roque longo
  if (rowDiff === 0 && colDiff === 2 && endCol === 2) {
    const rookCol = 0;

    if (
      isOccupiedSquare(startRow, rookCol, 'Rook-Q-B') &&
      !isPieceMoved('black', 'Rook-Q-B', startRow, rookCol)
    ) {
      return !isOccupiedSquare(startRow, 1) &&
             !isOccupiedSquare(startRow, 2) &&
             !isOccupiedSquare(startRow, 3);
    }
  }

  return false;
}
