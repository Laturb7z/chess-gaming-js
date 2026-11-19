import { getChess960BackRank } from './chess960.js';

/** Valida a variante escolhida antes de modificar o tabuleiro da partida. */
export function normalizeChessSession(settings = {}) {
  const variant = settings.variant ?? 'classic';
  if (variant !== 'classic' && variant !== 'chess960') {
    throw new TypeError('Variante de xadrez desconhecida');
  }
  if (variant === 'classic') return { variant, chess960Position: 518 };
  const index = settings.chess960Position;
  if (!Number.isInteger(index) || index < 0 || index > 959) {
    throw new RangeError('A posição Chess960 deve estar entre 0 e 959');
  }
  // Valida as duas fileiras iniciais antes de permitir a substituição do tabuleiro.
  getChess960BackRank(index, 'white');
  getChess960BackRank(index, 'black');
  return { variant, chess960Position: index };
}
