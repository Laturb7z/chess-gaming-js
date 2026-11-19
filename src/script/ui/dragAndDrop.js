export function createDragAndDrop({
  chessboard,
  getCurrentPlayer,
  getSelectedPiece,
  handlePieceClick,
  handleSquareClick,
  isGameOver,
  isPromotionPending,
  canCastleInPlace = () => false
}) {
  let drag = null;

  const DRAG_THRESHOLD = 6;

  function getSquareAt(x, y) {
    const element = document.elementFromPoint(x, y);

    const square = element?.closest(
      '#chessboard [data-row][data-col]'
    );

    return square && chessboard.contains(square)
      ? square
      : null;
  }

  function clearDrag() {
    if (!drag) return;

    drag.preview?.remove();

    drag.piece.classList.remove('dragging');

    drag = null;
  }

  function onPointerDown(event) {
    if (drag || event.button !== 0) return;
    if (isGameOver() || isPromotionPending()) return;

    const piece = event.target.closest('.chess-piece');

    if (!piece || !chessboard.contains(piece)) return;

    const color = piece.classList.contains('white')
      ? 'white'
      : 'black';

    if (color !== getCurrentPlayer()) return;

    drag = {
      piece,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      preview: null
    };
  }

  function startDragging(event) {
    if (!drag || drag.active) return;

    drag.active = true;

    const piece = drag.piece;

    // Selecionar a peça usando a lógica existente.
    if (getSelectedPiece() !== piece) {
      handlePieceClick({
        currentTarget: piece
      });
    }

    if (getSelectedPiece() !== piece) {
      clearDrag();
      return;
    }

    const preview = piece.cloneNode(true);

    preview.classList.remove('selected');
    preview.classList.add('drag-preview');

    document.body.appendChild(preview);

    drag.preview = preview;

    piece.classList.add('dragging');

    updatePreview(event);

    // Impedir seleção de texto e gestos durante o arraste.
    event.preventDefault();
  }

  function updatePreview(event) {
    if (!drag?.preview) return;

    drag.preview.style.left = `${event.clientX}px`;
    drag.preview.style.top = `${event.clientY}px`;
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    if (!drag.active) {
      const distance = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY
      );

      if (distance < DRAG_THRESHOLD) return;

      startDragging(event);
    }

    if (drag?.active) {
      updatePreview(event);
      event.preventDefault();
    }
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    if (!drag.active) {
      clearDrag();
      return;
    }

    const square = getSquareAt(
      event.clientX,
      event.clientY
    );

    const piece = drag.piece;

    const originRow = Number(piece.dataset.row);
    const originCol = Number(piece.dataset.col);

    const destinationRow = square
      ? Number(square.dataset.row)
      : null;

    const destinationCol = square
      ? Number(square.dataset.col)
      : null;

    // Limpar a representação visual antes da jogada.
    clearDrag();

    // Não movimentar se soltou fora do tabuleiro
    // ou na própria casa de origem.
    if (
      !square ||
      (
        destinationRow === originRow &&
        destinationCol === originCol &&
        !canCastleInPlace(piece, originRow, originCol)
      )
    ) {
      return;
    }

    // Executar a jogada pela lógica já existente.
    handleSquareClick({
      currentTarget: square
    });
  }

  function onPointerCancel(event) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    clearDrag();
  }

  // Evitar que o clique gerado após o arraste
  // selecione ou desmarque peças acidentalmente.
  let suppressNextClick = false;

  function suppressClick(event) {
    if (!suppressNextClick) return;

    suppressNextClick = false;

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function onPointerUpWithSuppression(event) {
    const wasDragging = Boolean(
      drag && drag.active &&
      event.pointerId === drag.pointerId
    );

    onPointerUp(event);

    if (wasDragging) {
      suppressNextClick = true;
    }
  }

  chessboard.addEventListener(
    'pointerdown',
    onPointerDown
  );

  document.addEventListener(
    'pointermove',
    onPointerMove,
    { passive: false }
  );

  document.addEventListener(
    'pointerup',
    onPointerUpWithSuppression
  );

  document.addEventListener(
    'pointercancel',
    onPointerCancel
  );

  chessboard.addEventListener(
    'click',
    suppressClick,
    true
  );

  return {
    cancelDrag: clearDrag
  };
}