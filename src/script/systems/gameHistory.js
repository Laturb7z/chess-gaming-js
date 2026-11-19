
export function createGameHistory() {
  let moveHistory = [];
  let capturedPieces = {
    white: [],
    black: []
  };

  let undoHistory = [];
  let redoHistory = [];

  // Copia os dados para não compartilhar
  // referências mutáveis entre os históricos.
  function clone(data) {
    return structuredClone(data);
  }

  function getMoveHistory() {
    return clone(moveHistory);
  }

  function registerMove(color, notation, san = null) {
  moveHistory.push({
    color,
    notation,
    san
  });
}

  function getCapturedPieces() {
    return clone(capturedPieces);
  }

  function registerCapturedPiece(piece, capturedBy) {
    if (!piece || !capturedPieces[capturedBy]) return;

    const image = piece.querySelector('img');
    if (!image) return;

    capturedPieces[capturedBy].push({
      type: piece.dataset.type,
      image: image.getAttribute('src')
    });
  }

  function setRecords(moves, captures) {
    moveHistory = clone(moves);

    capturedPieces = clone(captures);
  }

  function saveUndoState(state) {
    undoHistory.push(clone(state));

    // Uma jogada nova invalida o Refazer.
    redoHistory = [];
  }

  function undo(currentState) {
    if (undoHistory.length === 0) return null;

    redoHistory.push(clone(currentState));

    return undoHistory.pop();
  }

  function redo(currentState) {
    if (redoHistory.length === 0) return null;

    undoHistory.push(clone(currentState));

    return redoHistory.pop();
  }

  function canUndo() {
    return undoHistory.length > 0;
  }

  function canRedo() {
    return redoHistory.length > 0;
  }

  function reset() {
    moveHistory = [];

    capturedPieces = {
      white: [],
      black: []
    };

    undoHistory = [];
    redoHistory = [];
  }

  function restoreUndoStates(states = []) {
    undoHistory = Array.isArray(states) ? clone(states) : [];
    redoHistory = [];
  }

  return {
    restoreUndoStates,
    getUndoStates: () => clone(undoHistory),
    getMoveHistory,
    registerMove,
    getCapturedPieces,
    registerCapturedPiece,
    setRecords,
    saveUndoState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset
  };
}
