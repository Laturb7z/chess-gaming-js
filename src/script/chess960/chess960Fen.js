/** Direitos de roque Chess960 em X-FEN/Shredder-FEN, indicados pela coluna da torre.
 * Quem chama fornece um leitor do tabuleiro; este módulo não o modifica.
 */
export function getChess960CastlingRights(at, flags) {
  if (typeof at !== 'function') throw new TypeError('at must be a function');
  let rights = '';
  for (const [color, row, suffix, letterCase] of [
    ['white', 7, 'W', 'upper'], ['black', 0, 'B', 'lower']
  ]) {
    if (flags[color]?.kingMoved) continue;
    const kingCol = Array.from({length: 8}, (_, c) => c).find(c =>
      at(row, c)?.dataset?.type === `King-${suffix}`);
    if (kingCol === undefined) continue;
    for (const side of ['king', 'queen']) {
      if (flags[color]?.[side + 'RookMoved']) continue;
      const type = `Rook-${side === 'king' ? 'K' : 'Q'}-${suffix}`;
      const rookCol = Array.from({length: 8}, (_, c) => c).find(c => {
        const p = at(row, c);
        return p?.dataset?.type === type && !p.classList?.contains('promoted');
      });
      if (rookCol === undefined || (side === 'king' ? rookCol <= kingCol : rookCol >= kingCol)) continue;
      const letter = String.fromCharCode(65 + rookCol);
      rights += letterCase === 'upper' ? letter : letter.toLowerCase();
    }
  }
  return rights || '-';
}
