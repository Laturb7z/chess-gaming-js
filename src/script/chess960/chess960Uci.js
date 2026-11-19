/** No protocolo UCI do Chess960, o roque vai da origem do rei à origem da torre, não ao destino do rei. */
export function normalizeChess960UciMove(move, at) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) throw new Error('Lance UCI inválido');
  if (typeof at !== 'function') throw new TypeError('Leitor de tabuleiro obrigatório');
  const from = move.slice(0, 2), to = move.slice(2, 4);
  const king = at(from), rook = at(to);
  if (!king || !rook || !/^King-/.test(king.dataset?.type || '') || !/^Rook-[KQ]-/.test(rook.dataset?.type || '')) {
    return { move, castle: null };
  }
  const kingColor = king.classList.contains('white') ? 'white' : 'black';
  if (!rook.classList.contains(kingColor) || from[1] !== to[1]) return { move, castle: null };
  const side = to.charCodeAt(0) > from.charCodeAt(0) ? 'king' : 'queen';
  if (rook.dataset.type !== `Rook-${side === 'king' ? 'K' : 'Q'}-${kingColor === 'white' ? 'W' : 'B'}`) return { move, castle: null };
  return { move, castle: { side, kingFrom: from, rookFrom: to, kingTo: `${side === 'king' ? 'g' : 'c'}${from[1]}` } };
}
