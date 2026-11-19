
const STATS_STORAGE_KEY = 'chess-game-statistics';
const REGISTERED_GAMES_KEY = 'chess-game-registered-results';

const defaultStats = {
  computer: {
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0
  },
  pvp: {
    played: 0,
    whiteWins: 0,
    blackWins: 0,
    draws: 0
  }
};

export function getGameStats() {
  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    if (!saved) return structuredClone(defaultStats);

    const parsed = JSON.parse(saved);

    return {
      computer: {
        ...defaultStats.computer,
        ...parsed.computer
      },
      pvp: {
        ...defaultStats.pvp,
        ...parsed.pvp
      }
    };
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    return structuredClone(defaultStats);
  }
}

export function saveGameStats(stats) {
  try {
    localStorage.setItem(
      STATS_STORAGE_KEY,
      JSON.stringify(stats)
    );
    return true;
  } catch (error) {
    console.error('Erro ao salvar estatísticas:', error);
    return false;
  }
}

export function isGameResultRegistered(gameId) {
  if (!gameId) return false;

  try {
    const ids = JSON.parse(
      localStorage.getItem(REGISTERED_GAMES_KEY) || '[]'
    );
    return Array.isArray(ids) && ids.includes(gameId);
  } catch (error) {
    console.error('Erro ao verificar resultado:', error);
    return false;
  }
}

export function registerGameResult(mode, result, gameId) {
  const validResults = {
    computer: ['wins', 'losses', 'draws'],
    pvp: ['whiteWins', 'blackWins', 'draws']
  };

  if (!validResults[mode]?.includes(result)) return false;

  // O registro automático exige um ID válido.
  if (typeof gameId !== 'string' || !gameId) return false;

  try {
    const ids = JSON.parse(
      localStorage.getItem(REGISTERED_GAMES_KEY) || '[]'
    );

    if (!Array.isArray(ids)) return false;
    if (ids.includes(gameId)) return false;

    const stats = getGameStats();
    stats[mode].played++;
    stats[mode][result]++;

    // Mantém estatísticas e IDs no mesmo registro.
    // Isso evita divergência entre duas chaves separadas.
    const previousStats = localStorage.getItem(STATS_STORAGE_KEY);

    if (!saveGameStats(stats)) return false;

    try {
      localStorage.setItem(
        REGISTERED_GAMES_KEY,
        JSON.stringify([...ids, gameId])
      );
    } catch (error) {
      if (previousStats === null) {
        localStorage.removeItem(STATS_STORAGE_KEY);
      } else {
        localStorage.setItem(STATS_STORAGE_KEY, previousStats);
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar resultado:', error);
    return false;
  }
}

export function clearGameStats() {
  try {
    localStorage.removeItem(STATS_STORAGE_KEY);
    localStorage.removeItem(REGISTERED_GAMES_KEY);
    return true;
  } catch (error) {
    console.error('Erro ao limpar estatísticas:', error);
    return false;
  }
}
