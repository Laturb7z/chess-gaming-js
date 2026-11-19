import {
  playCheckSound,
  playPromotionSound
} from "../systems/sounds.js";

import {
  isSquareAttacked,
  isCheck
} from "./gameRules.js";

export function createPromotion({
  createPiece,
  getSelectedPiece,
  setSelectedPiece,
  clearHighlightedSquares,
  clearHighlightedSquaresCapture,
  syncClock,
  isGameOver,
  isTimeExpired,
  isCheckmate,
  registerMove,
  getPendingPromotionNotation,
  setPendingPromotionNotation,
  getPendingPromotionSAN,
  setPendingPromotionSAN,
  setCurrentPlayer,
  switchClock,
  registerPosition,
  evaluateGameState,
  checkFivefoldRepetition,
  updateDrawButton,
  isAnalysisMode = () => false,
  onAnalysisPromotionComplete = () => {},
  onPromotionComplete = () => {}
}) {
  const promotionOverlay = document.getElementById(
    'promotion-overlay'
  );
  
  let promotionPending = false;
  let pendingPromotion = null;
  
  function isPromotionPending() {
    return promotionPending;
  }
  
  function createPromotedPiece(color, row, col, chosenPiece) {
    const suffix = color === 'white' ? 'W' : 'B';
    
    const pieceType = chosenPiece === 'Rook' ?
      `Rook-Q-${suffix}` :
      `${chosenPiece}-${suffix}`;
    
    return createPiece(pieceType, color, row, col, true);
  }
  
  function showPromotionPanel(piece, row, col) {
    console.log(
      'Painel de promoção chamado:',
      piece.dataset.type,
      row,
      col
    );
    
    const color = piece.classList.contains('white') ?
      'white' :
      'black';
    
    promotionPending = true;
    pendingPromotion = { piece, row, col, color };
    
    const suffix = color === 'white' ? 'w' : 'b';
    
    document.querySelectorAll('.promotion-option')
      .forEach(button => {
        const chosenPiece = button.dataset.promotion;
        
        const filename = chosenPiece === 'Rook' ?
          `${color}_rook-q-${suffix}.svg` :
          `${color}_${chosenPiece.toLowerCase()}-${suffix}.svg`;
        
        const img = button.querySelector('img');
        
        if (img) {
          img.src = `assets/svg/${filename}`;
        }
      });
    
    promotionOverlay.hidden = false;
  }
  
  function Promotion(chosenPiece) {
    console.log('PEÇA ESCOLHIDA:', chosenPiece);
    
    if (!promotionPending || !pendingPromotion) return;
    
    if (!isAnalysisMode()) syncClock();
    
    if (!isAnalysisMode() && (isGameOver() || isTimeExpired())) return;
    
    const { piece, row, col, color } = pendingPromotion;
    
    const square = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    
    if (!square || !square.contains(piece)) {
      console.error(
        'Peão não encontrado na casa de promoção.'
      );
      return;
    }
    
    const promotedPiece = createPromotedPiece(
      color,
      row,
      col,
      chosenPiece
    );
    
    piece.remove();
    square.appendChild(promotedPiece);
    
    promotionPending = false;
    pendingPromotion = null;
    
    updateDrawButton();
    promotionOverlay.hidden = true;
    
    const selectedPiece = getSelectedPiece();
    
    if (selectedPiece) {
      selectedPiece.classList.remove('selected');
    }
    
    setSelectedPiece(null);
    
    clearHighlightedSquares();
    clearHighlightedSquaresCapture();
    
    const opponentColor = color === 'white' ?
      'black' :
      'white';
    
    const opponentKing = document.querySelector(
      `.chess-piece.${opponentColor}.king`
    );
    
    if (opponentKing) {
      const kingRow = Number(opponentKing.dataset.row);
      const kingCol = Number(opponentKing.dataset.col);
      
      if (
        isSquareAttacked(kingRow, kingCol, color) &&
        !isCheckmate(opponentColor)
      ) {
        playCheckSound();
        
        console.log(
          `${opponentColor} king is in check after promotion!`
        );
      } else {
        playPromotionSound();
      }
    } else {
      playPromotionSound();
      console.warn('Rei adversário não encontrado.');
    }
    
    const promotionLetters = {
      Queen: 'D',
      Rook: 'T',
      Bishop: 'B',
      Knight: 'C'
    };
    
    const sanPromotionLetters = {
  Queen: 'Q',
  Rook: 'R',
  Bishop: 'B',
  Knight: 'N'
};
    
    const pendingNotation = getPendingPromotionNotation();
const pendingSAN = getPendingPromotionSAN();

if (pendingNotation !== null) {
  const promotionLetter = promotionLetters[chosenPiece];
  const sanLetter = sanPromotionLetters[chosenPiece];
  
  let notation = `${pendingNotation}=${promotionLetter}`;
  
  let san = pendingSAN !== null ?
    `${pendingSAN}=${sanLetter}` :
    null;
  
  let suffix = '';
  
  if (isCheckmate(opponentColor)) {
    suffix = '#';
  } else if (isCheck(opponentColor)) {
    suffix = '+';
  }
  
  notation += suffix;
  
  if (san !== null) {
    san += suffix;
  }
  
  registerMove(color, notation, san);
  
  setPendingPromotionNotation(null);
  setPendingPromotionSAN(null);
}
    
    setCurrentPlayer(opponentColor);
    if (isAnalysisMode()) {
      onAnalysisPromotionComplete();
      return;
    }
    switchClock(opponentColor);
    
    registerPosition();
    
    evaluateGameState(opponentColor);
    
    console.log(`Turno atual: ${opponentColor}`);
    
    if (checkFivefoldRepetition()) return;
    
    updateDrawButton();
    onPromotionComplete();
  }
  
  function resetPromotion() {
    promotionPending = false;
    pendingPromotion = null;
    promotionOverlay.hidden = true;
  }
  
  document.querySelectorAll('.promotion-option')
    .forEach(button => {
      button.addEventListener('click', () => {
        Promotion(button.dataset.promotion);
      });
    });
  
  return {
    showPromotionPanel,
    isPromotionPending,
    resetPromotion
  };
}