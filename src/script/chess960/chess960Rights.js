/** Identifica o direito de roque da torre original após uma captura.
 * Torres promovidas não concedem nem retiram direitos de roque originais.
 * No Chess960, a coluna inicial da torre não precisa ser a ou h.
 */
export function capturedOriginalRookRight(piece, row, variant = 'classic') {
  if (!piece || piece.classList?.contains('promoted')) return null;
  const match = /^Rook-([KQ])-([WB])$/.exec(piece.dataset?.type ?? '');
  if (!match) return null;
  const color = match[2] === 'W' ? 'white' : 'black';
  const homeRow = color === 'white' ? 7 : 0;
  if (row !== homeRow) return null;
  if (variant === 'classic') {
    const originalFile = match[1] === 'K' ? 7 : 0;
    if (Number(piece.dataset.col) !== originalFile) return null;
  }
  return `${match[2]}${match[1]}rookMoved`;
}
