// Fase 12 - Etapa 5: apresentação das peças capturadas e visibilidade dos painéis.
// Recebe os dados do histórico, sem modificar o estado da partida.
export function renderCapturedPiecesUI(capturedPieces, whiteCaptures, blackCaptures) {
  whiteCaptures.innerHTML = '';
  blackCaptures.innerHTML = '';

  for (const color of ['white', 'black']) {
    const container = color === 'white' ? whiteCaptures : blackCaptures;

    for (const piece of capturedPieces[color]) {
      const img = document.createElement('img');
      img.src = piece.image;
      img.alt = piece.type;
      container.appendChild(img);
    }

    container.scrollLeft = container.scrollWidth;
  }
}

export function updatePanelsVisibilityUI(moveHistory, capturedPieces, moveHistoryPanel, capturedPiecesPanel) {
  moveHistoryPanel.hidden = moveHistory.length === 0;
  capturedPiecesPanel.hidden =
    capturedPieces.white.length === 0 && capturedPieces.black.length === 0;
}
