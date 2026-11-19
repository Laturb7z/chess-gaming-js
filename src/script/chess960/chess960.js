/**
 * Chess960 (Fischer Random): numeração de 0 a 959 conforme o sistema
 * padrão de Scharnagl. A posição 518 corresponde ao xadrez clássico.
 * Retorna os nomes das peças da primeira fileira, distinguindo os lados das torres nesta interface.
 */
export function getChess960Position(index) {
  if (!Number.isInteger(index) || index < 0 || index > 959) {
    throw new RangeError('Chess960 position must be an integer from 0 to 959');
  }
  const squares = Array(8).fill(null);
  let n = index;
  squares[(n % 4) * 2 + 1] = 'Bishop';
  n = Math.floor(n / 4);
  squares[(n % 4) * 2] = 'Bishop';
  n = Math.floor(n / 4);
  const empty = () => squares.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
  squares[empty()[n % 6]] = 'Queen';
  n = Math.floor(n / 6);
  const knightPairs = [[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]];
  const [a,b] = knightPairs[n];
  const remaining = empty();
  squares[remaining[a]] = 'Knight';
  squares[remaining[b]] = 'Knight';
  const [left, middle, right] = empty();
  squares[left] = 'Rook-Q';
  squares[middle] = 'King';
  squares[right] = 'Rook-K';
  return squares;
}

export function getRandomChess960Position() {
  return Math.floor(Math.random() * 960);
}

export function getChess960BackRank(index, color) {
  if (color !== 'white' && color !== 'black') {
    throw new TypeError('color must be white or black');
  }
  const suffix = color === 'white' ? 'W' : 'B';
  return getChess960Position(index).map(piece => `${piece}-${suffix}`);
}

/**
 * Planejador de roque do Chess960. Quem chama fornece uma função para consultar
 * a ocupação e outra para verificar casas atacadas na posição atual. O DOM não é alterado.
 * As colunas começam em zero. As peças podem já ocupar suas casas de destino.
 */
export function planChess960Castle({ color, side, kingCol, rookCol, at, attacked,
  kingHasMoved = false, rookHasMoved = false }) {
  if (!['white', 'black'].includes(color) || !['king', 'queen'].includes(side)) return null;
  if (![kingCol, rookCol].every(c => Number.isInteger(c) && c >= 0 && c < 8)) return null;
  if (typeof at !== 'function' || typeof attacked !== 'function') return null;
  if (kingHasMoved || rookHasMoved) return null;
  if (side === 'king' ? rookCol <= kingCol : rookCol >= kingCol) return null;
  const row = color === 'white' ? 7 : 0;
  const suffix = color === 'white' ? 'W' : 'B';
  const king = at(row, kingCol), rook = at(row, rookCol);
  if (!king || !rook || king.dataset?.type !== `King-${suffix}` ||
      rook.dataset?.type !== `Rook-${side === 'king' ? 'K' : 'Q'}-${suffix}` ||
      rook.classList?.contains('promoted')) return null;
  const kingTo = side === 'king' ? 6 : 2;
  const rookTo = side === 'king' ? 5 : 3;
  const line = (a, b) => {
    const step = Math.sign(b - a);
    const result = [a];
    while (result[result.length - 1] !== b) result.push(result[result.length - 1] + step);
    return result;
  };
  // As casas percorridas devem estar vazias, exceto pelas duas peças envolvidas no roque.
  for (const col of new Set([...line(kingCol, kingTo), ...line(rookCol, rookTo)])) {
    const occupant = at(row, col);
    if (occupant && !(col === kingCol && occupant === king) &&
        !(col === rookCol && occupant === rook)) return null;
  }
  // Quem chama deve avaliar os ataques sem o rei na casa de origem;
  // caso contrário, um ataque descoberto no caminho do roque pode ficar oculto.
  for (const col of line(kingCol, kingTo)) {
    if (attacked(row, col, { kingFrom: kingCol, rookFrom: rookCol,
      kingTo, rookTo, king, rook, color, side })) return null;
  }
  return { row, color, side, kingFrom: kingCol, rookFrom: rookCol,
    kingTo, rookTo, king, rook };
}

/** Aplica ao tabuleiro no DOM um plano previamente validado, como uma única operação. */
export function applyChess960Castle(plan, squareAt) {
  if (!plan || typeof squareAt !== 'function') return false;
  const { row, king, rook, kingFrom, rookFrom, kingTo, rookTo } = plan;
  const sources = [squareAt(row, kingFrom), squareAt(row, rookFrom)];
  const targets = [squareAt(row, kingTo), squareAt(row, rookTo)];
  if (sources.some(s => !s) || targets.some(s => !s) ||
      sources[0].querySelector(':scope > .chess-piece') !== king ||
      sources[1].querySelector(':scope > .chess-piece') !== rook) return false;
  for (const square of targets) {
    const occupant = square.querySelector(':scope > .chess-piece');
    if (occupant && occupant !== king && occupant !== rook) return false;
  }
  // Remove primeiro as duas peças, permitindo cruzamentos, trocas e peças que não mudam de casa.
  king.remove();
  rook.remove();
  targets[0].appendChild(king);
  targets[1].appendChild(rook);
  king.dataset.row = rook.dataset.row = String(row);
  king.dataset.col = String(kingTo);
  rook.dataset.col = String(rookTo);
  return true;
}
