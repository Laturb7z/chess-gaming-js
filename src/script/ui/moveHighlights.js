
import {
  getChessCoordinates,
  isOccupiedSquare,
  isOccupiedByWhite,
  isOccupiedByBlack,
  isEnemyPiece,
  isEnemyPawn,
  isPieceMoved
} from "../utils/additional.js";

import { isKingDestinationSafe } from "../core/gameRules.js";

export function createMoveHighlights({
  getSelectedPiece,
  getEnPassantTarget,
  handleSquareClick,
  isMoveKingSafe,
  isShortCastleValid,
  isLongCastleValid,
  getChessVariant = () => 'classic',
  getChess960CastlePlan = () => null
}) {

  function isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function hasPawnMoved(row, color) {
    return (color === 'white' && row !== 6) ||
           (color === 'black' && row !== 1);
  }

  // =====================================
  // DESTAQUES
  // =====================================

  function highlightSquare(coordinates) {
    const square = document.querySelector(
      `[data-chess-coordinates="${coordinates}"]`
    );

    const selectedPiece = getSelectedPiece();

    if (!square || !selectedPiece) return;

    const newRow = Number(square.dataset.row);
    const newCol = Number(square.dataset.col);

    if (!getChess960CastlePlan(selectedPiece, newRow, newCol) &&
        !isMoveKingSafe(selectedPiece, newRow, newCol)) {
      return;
    }

    square.classList.add('highlighted-square');
    square.addEventListener('click', handleSquareClick);
  }

  function highlightSquareCapture(coordinates) {
    const square = document.querySelector(
      `[data-chess-coordinates="${coordinates}"]`
    );

    const selectedPiece = getSelectedPiece();

    if (!square || !selectedPiece) return;

    const newRow = Number(square.dataset.row);
    const newCol = Number(square.dataset.col);

    if (!isMoveKingSafe(selectedPiece, newRow, newCol)) {
      return;
    }

    square.classList.add('highlighted-square-capture');
    square.addEventListener('click', handleSquareClick);
  }

  function clearHighlightedSquaresCapture() {
    const highlightedSquares = document.querySelectorAll(
      '.highlighted-square-capture'
    );

    highlightedSquares.forEach(square => {
      square.classList.remove('highlighted-square-capture');
      square.removeEventListener('click', handleSquareClick);
    });
  }

  function clearHighlightedSquares() {
    const highlightedSquares = document.querySelectorAll(
      '.highlighted-square, .highlighted-square-capture'
    );

    highlightedSquares.forEach(square => {
      square.classList.remove('highlighted-square');
      square.classList.remove('highlighted-square-capture');
      square.removeEventListener('click', handleSquareClick);
    });
  }

  // =====================================
  // PEÃO
  // =====================================

  function calculatePawnMoves(color, row, col) {
    const forwardDirection = color === 'white' ? -1 : 1;
    const newRow = row + forwardDirection;
    const nextRow = row + 2 * forwardDirection;

    const nextCoordinates = getChessCoordinates(nextRow, col);
    const leftDiagonalSquare = getChessCoordinates(newRow, col - 1);
    const rightDiagonalSquare = getChessCoordinates(newRow, col + 1);

    if (
      isValidSquare(newRow, col) &&
      !isOccupiedSquare(newRow, col)
    ) {
      highlightSquare(getChessCoordinates(newRow, col));

      if (!hasPawnMoved(row, color)) {
        if (
          isValidSquare(nextRow, col) &&
          !isOccupiedSquare(nextRow, col)
        ) {
          highlightSquare(nextCoordinates);
        }
      }
    }

    if (
      isValidSquare(newRow, col - 1) &&
      isEnemyPiece(newRow, col - 1, color)
    ) {
      highlightSquareCapture(leftDiagonalSquare);
    }

    if (
      isValidSquare(newRow, col + 1) &&
      isEnemyPiece(newRow, col + 1, color)
    ) {
      highlightSquareCapture(rightDiagonalSquare);
    }

    const enPassantTarget = getEnPassantTarget();

    if (
      enPassantTarget &&
      enPassantTarget.row === newRow &&
      enPassantTarget.col === col - 1 &&
      !isOccupiedSquare(newRow, col - 1) &&
      isEnemyPawn(row, col - 1, color)
    ) {
      highlightSquare(leftDiagonalSquare);
    }

    if (
      enPassantTarget &&
      enPassantTarget.row === newRow &&
      enPassantTarget.col === col + 1 &&
      !isOccupiedSquare(newRow, col + 1) &&
      isEnemyPawn(row, col + 1, color)
    ) {
      highlightSquare(rightDiagonalSquare);
    }
  }

  // =====================================
  // MOVIMENTOS DIAGONAIS
  // =====================================

  function calculateDiagonalMovesWhite(
    row, col, rowIncrement, colIncrement
  ) {
    let newRow = row + rowIncrement;
    let newCol = col + colIncrement;

    while (isValidSquare(newRow, newCol)) {
      const isOccupied = isOccupiedSquare(newRow, newCol);

      if (!isOccupied) {
        highlightSquare(getChessCoordinates(newRow, newCol));
      } else {
        if (isOccupiedByBlack(newRow, newCol)) {
          highlightSquareCapture(
            getChessCoordinates(newRow, newCol)
          );
        }
        break;
      }

      newRow += rowIncrement;
      newCol += colIncrement;
    }
  }

  function calculateDiagonalMovesBlack(
    row, col, rowIncrement, colIncrement
  ) {
    let newRow = row + rowIncrement;
    let newCol = col + colIncrement;

    while (isValidSquare(newRow, newCol)) {
      const isOccupied = isOccupiedSquare(newRow, newCol);

      if (!isOccupied) {
        highlightSquare(getChessCoordinates(newRow, newCol));
      } else {
        if (isOccupiedByWhite(newRow, newCol)) {
          highlightSquareCapture(
            getChessCoordinates(newRow, newCol)
          );
        }
        break;
      }

      newRow += rowIncrement;
      newCol += colIncrement;
    }
  }

  // =====================================
  // MOVIMENTOS VERTICAIS E HORIZONTAIS
  // =====================================

  function calculateVerticalHorizontalMovesWhite(
    row, col, rowIncrement, colIncrement
  ) {
    let i = 1;
    let newRow = row + i * rowIncrement;
    let newCol = col + i * colIncrement;

    while (isValidSquare(newRow, newCol)) {
      const isOccupied = isOccupiedSquare(newRow, newCol);

      if (!isOccupied) {
        highlightSquare(getChessCoordinates(newRow, newCol));
      } else {
        if (isOccupiedByBlack(newRow, newCol)) {
          highlightSquareCapture(
            getChessCoordinates(newRow, newCol)
          );
        }
        break;
      }

      i++;
      newRow = row + i * rowIncrement;
      newCol = col + i * colIncrement;
    }
  }

  function calculateVerticalHorizontalMovesBlack(
    row, col, rowIncrement, colIncrement
  ) {
    let i = 1;
    let newRow = row + i * rowIncrement;
    let newCol = col + i * colIncrement;

    while (isValidSquare(newRow, newCol)) {
      const isOccupied = isOccupiedSquare(newRow, newCol);

      if (!isOccupied) {
        highlightSquare(getChessCoordinates(newRow, newCol));
      } else {
        if (isOccupiedByWhite(newRow, newCol)) {
          highlightSquareCapture(
            getChessCoordinates(newRow, newCol)
          );
        }
        break;
      }

      i++;
      newRow = row + i * rowIncrement;
      newCol = col + i * colIncrement;
    }
  }

  // =====================================
  // BISPOS
  // =====================================

  function calculateWhiteBishopMoves(row, col) {
    calculateDiagonalMovesWhite(row, col, -1, 1);
    calculateDiagonalMovesWhite(row, col, 1, 1);
    calculateDiagonalMovesWhite(row, col, -1, -1);
    calculateDiagonalMovesWhite(row, col, 1, -1);
  }

  function calculateBlackBishopMoves(row, col) {
    calculateDiagonalMovesBlack(row, col, -1, 1);
    calculateDiagonalMovesBlack(row, col, 1, 1);
    calculateDiagonalMovesBlack(row, col, -1, -1);
    calculateDiagonalMovesBlack(row, col, 1, -1);
  }

  // =====================================
  // TORRES
  // =====================================

  function calculateWhiteRookMoves(row, col) {
    calculateVerticalHorizontalMovesWhite(row, col, 0, 1);
    calculateVerticalHorizontalMovesWhite(row, col, 0, -1);
    calculateVerticalHorizontalMovesWhite(row, col, 1, 0);
    calculateVerticalHorizontalMovesWhite(row, col, -1, 0);
  }

  function calculateBlackRookMoves(row, col) {
    calculateVerticalHorizontalMovesBlack(row, col, 0, 1);
    calculateVerticalHorizontalMovesBlack(row, col, 0, -1);
    calculateVerticalHorizontalMovesBlack(row, col, 1, 0);
    calculateVerticalHorizontalMovesBlack(row, col, -1, 0);
  }

  // =====================================
  // DAMAS
  // =====================================

  function calculateWhiteQueenMoves(row, col) {
    calculateWhiteRookMoves(row, col);
    calculateWhiteBishopMoves(row, col);
  }

  function calculateBlackQueenMoves(row, col) {
    calculateBlackRookMoves(row, col);
    calculateBlackBishopMoves(row, col);
  }

  // =====================================
  // CAVALOS
  // =====================================

  const knightMoves = [
    { row: -2, col: -1 }, { row: -2, col: 1 },
    { row: -1, col: -2 }, { row: -1, col: 2 },
    { row: 1, col: -2 }, { row: 1, col: 2 },
    { row: 2, col: -1 }, { row: 2, col: 1 }
  ];

  function calculateWhiteKnightMoves(row, col) {
    for (const move of knightMoves) {
      const newRow = row + move.row;
      const newCol = col + move.col;

      if (!isValidSquare(newRow, newCol)) continue;

      const coordinates = getChessCoordinates(newRow, newCol);

      if (isOccupiedByBlack(newRow, newCol)) {
        highlightSquareCapture(coordinates);
      } else if (!isOccupiedByWhite(newRow, newCol)) {
        highlightSquare(coordinates);
      }
    }
  }

  function calculateBlackKnightMoves(row, col) {
    for (const move of knightMoves) {
      const newRow = row + move.row;
      const newCol = col + move.col;

      if (!isValidSquare(newRow, newCol)) continue;

      const coordinates = getChessCoordinates(newRow, newCol);

      if (isOccupiedByWhite(newRow, newCol)) {
        highlightSquareCapture(coordinates);
      } else if (!isOccupiedByBlack(newRow, newCol)) {
        highlightSquare(coordinates);
      }
    }
  }

  // =====================================
  // REIS
  // =====================================

  const kingMoves = [
    { row: -1, col: -1 }, { row: -1, col: 0 },
    { row: -1, col: 1 }, { row: 0, col: -1 },
    { row: 0, col: 1 }, { row: 1, col: -1 },
    { row: 1, col: 0 }, { row: 1, col: 1 }
  ];

  function calculateWhiteKingMoves(row, col) {
    const is960 = getChessVariant() === 'chess960';
    const hasShortCastle = !is960 && isShortCastleValid(
      'white',
      isPieceMoved('white', 'King-W'),
      isPieceMoved('white', 'Rook-K-W')
    );

    const hasLongCastle = !is960 && isLongCastleValid(
      'white',
      isPieceMoved('white', 'King-W'),
      isPieceMoved('white', 'Rook-Q-W')
    );

    for (const move of kingMoves) {
      const newRow = row + move.row;
      const newCol = col + move.col;

      if (!isValidSquare(newRow, newCol)) continue;

      if (
        !isKingDestinationSafe(
          row, col, newRow, newCol, 'white'
        )
      ) {
        continue;
      }

      const coordinates = getChessCoordinates(newRow, newCol);

      if (isOccupiedByBlack(newRow, newCol)) {
        highlightSquareCapture(coordinates);
      } else if (!isOccupiedSquare(newRow, newCol)) {
        highlightSquare(coordinates);
      }
    }

    if (
      row === 7 &&
      col === 4 &&
      hasShortCastle &&
      !isOccupiedSquare(7, 5) &&
      !isOccupiedSquare(7, 6)
    ) {
      highlightSquare(getChessCoordinates(7, 6));
    }

    if (
      row === 7 &&
      col === 4 &&
      hasLongCastle &&
      !isOccupiedSquare(7, 3) &&
      !isOccupiedSquare(7, 2) &&
      !isOccupiedSquare(7, 1)
    ) {
      highlightSquare(getChessCoordinates(7, 2));
    }
    if (is960) {
      const king = getSelectedPiece();
      for (const targetCol of [6, 2]) {
        if (getChess960CastlePlan(king, 7, targetCol)) {
          highlightSquare(getChessCoordinates(7, targetCol));
        }
      }
    }
  }

  function calculateBlackKingMoves(row, col) {
    const is960 = getChessVariant() === 'chess960';
    const hasShortCastle = !is960 && isShortCastleValid(
      'black',
      isPieceMoved('black', 'King-B'),
      isPieceMoved('black', 'Rook-K-B')
    );

    const hasLongCastle = !is960 && isLongCastleValid(
      'black',
      isPieceMoved('black', 'King-B'),
      isPieceMoved('black', 'Rook-Q-B')
    );

    for (const move of kingMoves) {
      const newRow = row + move.row;
      const newCol = col + move.col;

      if (!isValidSquare(newRow, newCol)) continue;

      if (
        !isKingDestinationSafe(
          row, col, newRow, newCol, 'black'
        )
      ) {
        continue;
      }

      const coordinates = getChessCoordinates(newRow, newCol);

      if (isOccupiedByWhite(newRow, newCol)) {
        highlightSquareCapture(coordinates);
      } else if (!isOccupiedSquare(newRow, newCol)) {
        highlightSquare(coordinates);
      }
    }

    if (
      row === 0 &&
      col === 4 &&
      hasShortCastle &&
      !isOccupiedSquare(0, 5) &&
      !isOccupiedSquare(0, 6)
    ) {
      highlightSquare(getChessCoordinates(0, 6));
    }

    if (
      row === 0 &&
      col === 4 &&
      hasLongCastle &&
      !isOccupiedSquare(0, 3) &&
      !isOccupiedSquare(0, 2) &&
      !isOccupiedSquare(0, 1)
    ) {
      highlightSquare(getChessCoordinates(0, 2));
    }
    if (is960) {
      const king = getSelectedPiece();
      for (const targetCol of [6, 2]) {
        if (getChess960CastlePlan(king, 0, targetCol)) {
          highlightSquare(getChessCoordinates(0, targetCol));
        }
      }
    }
  }

  // =====================================
  // SELEÇÃO DOS MOVIMENTOS
  // =====================================

  function calculateValidMoves(pieceType, color, row, col) {
    clearHighlightedSquares();

    switch (pieceType) {
      case 'Pawn':
        calculatePawnMoves(color, row, col);
        break;

      case 'Rook-Q-W':
      case 'Rook-K-W':
        calculateWhiteRookMoves(row, col);
        break;

      case 'Rook-Q-B':
      case 'Rook-K-B':
        calculateBlackRookMoves(row, col);
        break;

      case 'King-W':
        calculateWhiteKingMoves(row, col);
        break;

      case 'King-B':
        calculateBlackKingMoves(row, col);
        break;

      case 'Bishop-W':
        calculateWhiteBishopMoves(row, col);
        break;

      case 'Bishop-B':
        calculateBlackBishopMoves(row, col);
        break;

      case 'Queen-W':
        calculateWhiteQueenMoves(row, col);
        break;

      case 'Queen-B':
        calculateBlackQueenMoves(row, col);
        break;

      case 'Knight-W':
        calculateWhiteKnightMoves(row, col);
        break;

      case 'Knight-B':
        calculateBlackKnightMoves(row, col);
        break;
    }
  }

  return {
    calculateValidMoves,
    clearHighlightedSquares,
    clearHighlightedSquaresCapture
  };
}
