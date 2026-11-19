// Fase 12 — Etapa 6: sequência de troca de turno após um lance válido.
// A ordem original é mantida: relógio, expiração, jogador, histórico,
// avaliação, repetição, botão de empate e turno do computador.
export function oppositeColor(color) {
  return color === 'white' ? 'black' : 'white';
}

export function completeTurn({
  currentPlayer,
  switchClock,
  isGameOver,
  isTimeExpired,
  setCurrentPlayer,
  positionHistory,
  getPositionKey,
  evaluateGameState,
  checkFivefoldRepetition,
  updateDrawButton,
  scheduleComputerTurn
}) {
  const nextPlayer = oppositeColor(currentPlayer);
  switchClock(nextPlayer);
  if (isGameOver() || isTimeExpired()) return;
  setCurrentPlayer(nextPlayer);
  positionHistory.push(getPositionKey());
  evaluateGameState(nextPlayer);
  if (checkFivefoldRepetition()) return;
  updateDrawButton();
  scheduleComputerTurn();
}
