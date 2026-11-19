import { getChess960CastlingRights } from "../chess960/chess960Fen.js";
import { getChessCoordinates } from "../utils/additional.js";

export function createGameExport({ chessboard, getState, getGameHistory }) {
  function buildFEN() {
    const { WkingMoved, WKrookMoved, WQrookMoved, BkingMoved, BKrookMoved, BQrookMoved, enPassantTarget, currentPlayer, halfmoveClock, chessVariant } = getState();
    const gameHistory = getGameHistory();
    const codes = { Pawn: 'p', Knight: 'n', Bishop: 'b', Rook: 'r', Queen: 'q', King: 'k' };
    const ranks = [];
    for (let row = 0; row < 8; row++) {
      let rank = '',
        empty = 0;
      for (let col = 0; col < 8; col++) {
        const piece = chessboard.querySelector(`[data-row="${row}"][data-col="${col}"] > .chess-piece`);
        if (!piece) { empty++; continue; }
        if (empty) {
          rank += empty;
          empty = 0;
        }
        let code = codes[piece.dataset.type.split('-')[0]];
        if (!code) throw new Error(`Peça desconhecida: ${piece.dataset.type}`);
        rank += piece.classList.contains('white') ? code.toUpperCase() : code;
      }
      if (empty) rank += empty;
      ranks.push(rank);
    }
    let rights = '';
    const at = (row, col, type, color) => {
      const piece = chessboard.querySelector(`[data-row="${row}"][data-col="${col}"] > .chess-piece`);
      return piece?.dataset.type === type && piece.classList.contains(color) && !piece.classList.contains('promoted');
    };
    if (!WkingMoved && at(7, 4, 'King-W', 'white')) {
      if (!WKrookMoved && at(7, 7, 'Rook-K-W', 'white')) rights += 'K';
      if (!WQrookMoved && at(7, 0, 'Rook-Q-W', 'white')) rights += 'Q';
    }
    if (!BkingMoved && at(0, 4, 'King-B', 'black')) {
      if (!BKrookMoved && at(0, 7, 'Rook-K-B', 'black')) rights += 'k';
      if (!BQrookMoved && at(0, 0, 'Rook-Q-B', 'black')) rights += 'q';
    }
    if (chessVariant === 'chess960') {
      const read = (row, col) => chessboard.querySelector(`[data-row="${row}"][data-col="${col}"] > .chess-piece`);
      rights = getChess960CastlingRights(read, {
        white: { kingMoved: WkingMoved, kingRookMoved: WKrookMoved, queenRookMoved: WQrookMoved },
        black: { kingMoved: BkingMoved, kingRookMoved: BKrookMoved, queenRookMoved: BQrookMoved }
      });
    }
    const ep = enPassantTarget ? getChessCoordinates(enPassantTarget.row, enPassantTarget.col) : '-';
    const fullmove = Math.floor(gameHistory.getMoveHistory().length / 2) + 1;
    return `${ranks.join('/')} ${currentPlayer === 'white' ? 'w':'b'} ${rights || '-'} ${ep} ${halfmoveClock} ${fullmove}`;
  }
  
  function exportFEN() {
    const fen = buildFEN();
    
    const blob = new Blob([fen], {
      type: 'text/plain;charset=utf-8'
    });
    
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chess-position.fen';
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  
  function exportPGN() {
    const { analysisMode, officialFinalState, gameResult } = getState();
    const gameHistory = getGameHistory();
    const moves = analysisMode && officialFinalState ?
      officialFinalState.moveHistory :
      gameHistory.getMoveHistory();
    
    if (moves.length === 0) {
      alert("Faça pelo menos uma jogada antes de exportar.");
      return;
    }
    
    const date = new Date();
    const pgnDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join(".");
    
    const headers = [
      '[Event "Chess Gaming JS"]',
      '[Site "Local"]',
      `[Date "${pgnDate}"]`,
      '[Round "?"]',
      '[White "Brancas"]',
      '[Black "Pretas"]',
      `[Result "${gameResult}"]`
    ];
    
    const moveText = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const number = Math.floor(i / 2) + 1;
      const white = moves[i]?.san || moves[i]?.notation || "";
      const black = moves[i + 1]?.san || moves[i + 1]?.notation || "";
      
      moveText.push(`${number}. ${white} ${black}`.trim());
    }
    
    const pgn = [
      ...headers,
      "",
      moveText.join(" ") + " " + gameResult
    ].join("\n");
    
    const blob = new Blob([pgn], {
      type: "application/x-chess-pgn;charset=utf-8"
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = "chess-game.pgn";
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  
  return { buildFEN, exportFEN, exportPGN };
}
