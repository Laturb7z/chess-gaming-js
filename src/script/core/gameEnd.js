
import {
  isCheck,
  isInsufficientMaterial,
  hasPotentialMatingMaterial
} from "./gameRules.js";

import {
  playVictorySound,
  playGameOverSound,
  playDrawSound
} from "../systems/sounds.js";

export function createGameEnd({
  playerColor,
  setGameResult,
  getGameOver,
  setGameOver,
  getHalfmoveClock,
  getCurrentPlayer,
  isCheckmate,
  isStalemate,
  stopClock,
  updateUndoButton,
  updateDrawButton,
  canUndo
}) {
  const checkmateOverlay =
    document.getElementById('checkmate-overlay');

  const checkmateWinner =
    document.getElementById('checkmate-winner');

  const checkmateTitle =
    document.getElementById('checkmate-title');


  function showCheckmatePanel(winner) {
  const winnerName =
    winner === 'white' ? 'Brancas' : 'Pretas';

  checkmateTitle.textContent = 'XEQUE-MATE!';
  checkmateWinner.textContent = `${winnerName} venceram!`;



  const showFinishedResultBtn = document.getElementById(
    'show-finished-result-btn'
  );

  if (showFinishedResultBtn) {
    showFinishedResultBtn.hidden = true;
  }

  checkmateOverlay.hidden = false;
}

  function showDrawPanel(
    reason = 'Empate por afogamento!'
  ) {
    setGameResult('1/2-1/2');
    checkmateTitle.textContent = 'EMPATE!';
    checkmateWinner.textContent = reason;

  
    checkmateOverlay.hidden = false;
  }

  function showResignationPanel(winner) {
    const winnerName =
      winner === 'white' ? 'Brancas' : 'Pretas';

    checkmateTitle.textContent = 'DESISTÊNCIA!';
    checkmateWinner.textContent =
      `${winnerName} venceram por desistência!`;

    checkmateOverlay.hidden = false;
  }

  function playWinnerSound(winner) {
    if (winner === playerColor()) {
        playVictorySound();
    } else {
        playGameOverSound();
    }
}

  function handleTimeOut(loser) {
    if (getGameOver()) return;

    const winner =
      loser === 'white' ? 'black' : 'white';
      setGameResult(
  hasPotentialMatingMaterial(winner)
    ? (winner === 'white' ? '1-0' : '0-1')
    : '1/2-1/2'
);

    setGameOver(true);
    stopClock();

    if (!hasPotentialMatingMaterial(winner)) {
      playDrawSound();

      showDrawPanel(
        'Empate por tempo e impossibilidade de xeque-mate!'
      );
    } else {
      playWinnerSound(winner);

      checkmateTitle.textContent = 'TEMPO ESGOTADO!';

      checkmateWinner.textContent =
        `${winner === 'white' ? 'Brancas' : 'Pretas'} venceram por tempo!`;

    
      checkmateOverlay.hidden = false;
    }

    updateUndoButton();
    updateDrawButton();
  }

  function resignGame() {
    if (getGameOver()) return;

    const currentPlayer = getCurrentPlayer();
    const winner =
      currentPlayer === 'white' ? 'black' : 'white';
      setGameResult(winner === 'white' ? '1-0' : '0-1');

    setGameOver(true);
    stopClock();
    updateUndoButton();

    playWinnerSound(winner);
    showResignationPanel(winner);
    updateDrawButton();

    console.log(
      `${currentPlayer} desistiu. ${winner} venceu a partida!`
    );
  }

  function evaluateGameState(color) {
    if (getGameOver()) return;

    if (isCheckmate(color)) {
      setGameOver(true);
      stopClock();

      const winner =
        color === 'white' ? 'black' : 'white';
        
        setGameResult(winner === 'white' ? '1-0' : '0-1');

      playWinnerSound(winner);

      console.log(
        `XEQUE-MATE! ${winner === 'white' ? 'Brancas' : 'Pretas'} venceram!`
      );

      showCheckmatePanel(winner);
      return;
    }

    if (isStalemate(color)) {
      setGameOver(true);
      stopClock();
      playDrawSound();

      console.log('EMPATE POR AFOGAMENTO!');

      showDrawPanel();
      return;
    }

    if (isInsufficientMaterial()) {
      setGameOver(true);
      stopClock();

      playDrawSound();

      showDrawPanel(
        'Empate por material insuficiente!'
      );

      updateDrawButton();

      console.log('EMPATE: MATERIAL INSUFICIENTE!');
      return;
    }

    if (getHalfmoveClock() >= 150) {
      setGameOver(true);
      stopClock();

      updateDrawButton();
      playDrawSound();

      showDrawPanel(
        'Empate automático pela regra dos 75 movimentos!'
      );

      updateDrawButton();
      return;
    }

    if (isCheck(color)) {
      console.log(`${color} está em xeque!`);
    }
  }

  return {
    handleTimeOut,
    resignGame,
    evaluateGameState,
    showCheckmatePanel,
    showDrawPanel,
    showResignationPanel
  };
}
