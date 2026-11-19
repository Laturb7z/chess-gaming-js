import { getChess960BackRank } from "../chess960/chess960.js";

import {
  addNumbersToBoard,
  addLettersToBoard
} from "../ui/boardUI.js";

import {
  getChessCoordinates
} from "../utils/additional.js";

import {
  PlayilegalSound
} from "../systems/sounds.js";

export function createBoardManager({
  chessboard,
  getSelectedPiece,
  isPromotionPending,
  handlePieceClick
}) {
  function createPiece(piece, color, row, col, promoted = false) {
    const pieceElement = document.createElement('div');
    
    pieceElement.className =
      `chess-piece ${color}${promoted ? ' promoted' : ''}`;
    
    pieceElement.dataset.type = piece;
    pieceElement.dataset.row = row;
    pieceElement.dataset.col = col;
    
    if (piece.includes('King')) {
      pieceElement.classList.add('king');
    }
    
    const imgElement = document.createElement('img');
    
    imgElement.src =
      `assets/svg/${color}_${piece.toLowerCase()}.svg`;
    
    imgElement.alt = piece;
    
    imgElement.style.width = '60px';
    imgElement.style.height = '60px';
    imgElement.style.display = 'block';
    
    pieceElement.appendChild(imgElement);
    
    pieceElement.addEventListener(
      'click',
      handlePieceClick
    );
    
    return pieceElement;
  }
  
  function createBoard({ variant = "classic", chess960Position = 518 } = {}) {
    if (variant !== "classic" && variant !== "chess960") {
      throw new TypeError("Unknown chess variant");
    }
    // Validate before modifying the DOM. The menu will enable Chess960 only
    // after the move, castling and persistence integrations are complete.
    const white960 = variant === "chess960" ? getChess960BackRank(chess960Position, "white") : null;
    const black960 = variant === "chess960" ? getChess960BackRank(chess960Position, "black") : null;
    const piecesOrderBlack = [
      'Rook-Q-B',
      'Knight-B',
      'Bishop-B',
      'Queen-B',
      'King-B',
      'Bishop-B',
      'Knight-B',
      'Rook-K-B'
    ];
    
    const piecesOrderWhite = [
      'Rook-Q-W',
      'Knight-W',
      'Bishop-W',
      'Queen-W',
      'King-W',
      'Bishop-W',
      'Knight-W',
      'Rook-K-W'
    ];
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        
        square.className =
          (row + col) % 2 === 0 ?
          'light-square' :
          'darker-square';
        
        
square.dataset.row = row;
square.dataset.col = col;

square.dataset.chessCoordinates =
  getChessCoordinates(row, col);

// Posiciona a casa dentro da grade,
// reservando espaço para as coordenadas.
square.style.gridRow = row + 2;
square.style.gridColumn = col + 2;

chessboard.appendChild(square);

        square.addEventListener('click', event => {
          if (isPromotionPending()) return;
          
          const selectedPiece = getSelectedPiece();
          
          if (!selectedPiece) return;
          
          const selectedColor =
            selectedPiece.classList.contains('white') ?
            'white' :
            'black';
          
          const clickedPiece =
            event.target.closest('.chess-piece');
          
          if (clickedPiece === selectedPiece) return;
          
          if (
            clickedPiece &&
            clickedPiece.classList.contains(selectedColor)
          ) {
            return;
          }
          
          const isHighlighted =
            square.classList.contains('highlighted-square') ||
            square.classList.contains('highlighted-square-capture');
          
          if (!isHighlighted) {
            PlayilegalSound();
          }
        }, true);
        
        let piece = null;
        
        if (row === 0) {
          piece = createPiece(
            (black960 ?? piecesOrderBlack)[col],
            'black',
            row,
            col
          );
        } else if (row === 1) {
          piece = createPiece('Pawn', 'black', row, col);
        } else if (row === 6) {
          piece = createPiece('Pawn', 'white', row, col);
        } else if (row === 7) {
          piece = createPiece(
            (white960 ?? piecesOrderWhite)[col],
            'white',
            row,
            col
          );
        }
        
        if (piece) {
          square.appendChild(piece);
        }
      }
    }
    
    addLettersToBoard();
    addNumbersToBoard();
  }
  
  return {
    createBoard,
    createPiece
  };
}