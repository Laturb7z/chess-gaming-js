function isOccupiedSquare(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    // Verifica se a casa está vazia ou se tem qualquer outra peça na casa
    return square && square.firstChild;
}

function isOccupiedByBlack(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (square) {
        const piece = square.firstChild;
        // Verifica se a casa está vazia ou se a casa tem a peça de cor preta
        return piece && piece.classList.contains('black');
    }
    return false;
}

function isOccupiedByWhite(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (square) {
        const piece = square.firstChild;
        // Verifica se a casa está vazia ou se a peça é da cor oposta
        return piece && piece.classList.contains('white');
    }
    return false;
}

function isOccupiedByOpponent(opponentColor, row, col, pieceType) {
    if (isValidSquare(row, col)) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const piece = square.firstChild;

        return piece && piece.classList.contains(opponentColor) && piece.dataset.type === pieceType;
    }

    return false;
}

function isPathClear(startRow, startCol, endRow, endCol) {
    const rowIncrement = endRow > startRow ? 1 : endRow < startRow ? -1 : 0;
    const colIncrement = endCol > startCol ? 1 : endCol < startCol ? -1 : 0;
    let currentRow = startRow + rowIncrement;
    let currentCol = startCol + colIncrement;

    while (currentRow !== endRow || currentCol !== endCol) {
        if (isOccupiedSquare(currentRow, currentCol)) {
            return false; // o caminho está bloqueado
        }

        currentRow += rowIncrement;
        currentCol += colIncrement;
    }
    return true; // o caminho está livre
}

function getChessCoordinates(row, col) {
    const chessColumns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const chessRow = 8 - row;
    const chessCol = chessColumns[col];
    return chessCol + chessRow;
}

function isEnemyPiece(row, col, currentColor) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const targetPiece = square && square.firstChild;

    if (targetPiece) {
        const targetPieceColor = targetPiece.classList.contains('black') ? 'black' : 'white';
        return currentColor !== targetPieceColor;
    }

    return false;
}

function isPromotionRow(row, pieceColor) {
    return (pieceColor.contains('white') && row === 0) || (pieceColor.contains('black') && row === 7);
}

function isPieceMoved(color, type) {
    const pieces = document.querySelectorAll(`.chess-piece.${color}[data-type="${type}"]`);
    return pieces.length === 0;
}

function isEnemyPawn(row, col, currentColor) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const targetPiece = square && square.firstChild;

    if (targetPiece && targetPiece.dataset.type === 'Pawn') {
        const targetPieceColor = targetPiece.classList.contains('black') ? 'black' : 'white';
        return currentColor !== targetPieceColor;
    }

    return false;
}

export { isEnemyPawn, isPieceMoved, isEnemyPiece, isPromotionRow, getChessCoordinates, isPathClear, isOccupiedByOpponent, isOccupiedSquare, isOccupiedByBlack, isOccupiedByWhite }