import { setupOnlineLobby } from './systems/onlineLobby.js';
import { archiveFinishedGame, getFinishedGames, loadFinishedGame } from "./systems/finishedGames.js";
import { capturedOriginalRookRight } from "./chess960/chess960Rights.js";
import { completeTurn, oppositeColor } from "./systems/turnFlow.js";
import { renderCapturedPiecesUI, updatePanelsVisibilityUI } from "./ui/capturedPiecesUI.js";
import { captureGameState, restoreBoardPieces } from "./systems/gameState.js";
import { createGameExport } from "./systems/gameExport.js";
import { createGameStorage } from "./systems/gameStorage.js";
import { createChessAI } from "./ai/chessAI.js";
import { applyStockfishMove } from "./ai/stockfishMove.js";
import { normalizeChess960UciMove } from "./chess960/chess960Uci.js";
import { createBoardManager } from "./core/board.js";
import { createChess960CastlingAdapter } from "./chess960/chess960Integration.js";
import { normalizeChessSession } from "./chess960/chess960Session.js";
import { createGameMenu } from "./ui/gameMenu.js";
import { createGameHistory } from "./systems/gameHistory.js";
import { createMoveHighlights } from "./ui/moveHighlights.js";
import { createDrawRules } from "./core/drawRules.js";
import { createPromotion } from "./core/promotion.js";
import { createGameEnd } from "./core/gameEnd.js";
import { createDragAndDrop } from "./ui/dragAndDrop.js";
import {
  registerGameResult,
  isGameResultRegistered
} from './systems/gameStats.js';
import {
  isValidKnightMove,
  isValidBishopMove,
  isValidRookMove,
  isValidQueenMove,
  isValidPawnMove,
  isValidWhiteKingMove,
  isValidBlackKingMove
} from "./core/pieceMovement.js";
import {
  isCheck,
  isCheckmate as checkmateRule,
  isStalemate as stalemateRule,
  hasLegalMoves as legalMovesRule,
  isMoveKingSafe as moveKingSafeRule,
  isShortCastleValid as shortCastleRule,
  isLongCastleValid as longCastleRule,
  isShortCastleMove as shortCastleMoveRule,
  isLongCastleMove as longCastleMoveRule,
  performShortCastle as performShortCastleRule,
  performLongCastle as performLongCastleRule
} from "./core/gameRules.js";
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playDrawSound,
  playClickSound,
  playCastlingSound,
  PlayilegalSound,
  playPromotionSound,
  playCheckmateSound,
} from "./systems/sounds.js";
import {
  isPieceMoved,
  isOccupiedSquare,
  getChessCoordinates,
  isPromotionRow
} from "./utils/additional.js";
import { createChessClock } from "./systems/clock.js"

document.addEventListener('DOMContentLoaded', function() {
  
  const chessboard = document.getElementById('chessboard');
  const gameHistory = createGameHistory();
  // O modo de análise usa cópias das posições; nunca altera o resultado oficial.
  let analysisMode = false;
  let reviewingArchivedGame = false;
  let officialFinalState = null;
  let analysisUndo = [];
  let analysisRedo = [];
  let replayStates = [];
  let replayNavigating = false;
  
  const gameControls = document.querySelector('.game-controls');
  const undoMoveBtn = document.getElementById('undo-move-btn');
  const replayStartBtn = document.getElementById('replay-start-btn');
  const replayEndBtn = document.getElementById('replay-end-btn');
  const redoMoveBtn = document.getElementById('redo-move-btn');
  const drawAgreementOverlay = document.getElementById('draw-agreement-overlay');
  const resignGameBtn = document.getElementById('resign-game-btn');
  const resignOverlay = document.getElementById('resign-overlay');
  const confirmResignBtn = document.getElementById('confirm-resign-btn');
  const cancelResignBtn = document.getElementById('cancel-resign-btn');
  const acceptDrawBtn = document.getElementById('accept-draw-btn');
  const declineDrawBtn = document.getElementById('decline-draw-btn');
  
  let selectedPiece = null;
  let gameMode = 'pvp';
  // Reserved for the Chess960 menu integration. Classic remains the only active variant.
  let chessVariant = 'classic';
  let chess960Position = 518;
  let humanColor = 'white';
  const computerColor = () => oppositeColor(humanColor);
  let aiBusy = false;
  let gameGeneration = 0;
  const chessAI = createChessAI({
    workerUrl: new URL('../../assets/stockfish/stockfish-19-lite-single.js', import.meta.url).href
  });
  
  const { buildFEN, exportFEN, exportPGN } = createGameExport({
    chessboard,
    getGameHistory: () => gameHistory,
    getState: () => ({
      WkingMoved, WKrookMoved, WQrookMoved,
      BkingMoved, BKrookMoved, BQrookMoved,
      enPassantTarget, currentPlayer, halfmoveClock,
      analysisMode, officialFinalState, gameResult, chessVariant
    })
  });

  document
    .getElementById("export-pgn-btn")
    .addEventListener("click", exportPGN);

  document
    .getElementById('export-finished-pgn-btn')
    .addEventListener('click', exportPGN);

  document
    .getElementById('export-fen-btn')
    .addEventListener('click', exportFEN);

  async function playComputerTurn() {
    if (analysisMode || gameMode !== 'computer' || currentPlayer !== computerColor() || gameOver || isPromotionPending() || aiBusy) return;
    aiBusy = true;
    const generation = gameGeneration;
    try {
      await chessAI.initialize();
      if (generation !== gameGeneration || gameMode !== 'computer') return;
      if (!isClockRunning()) startClock();
      chessAI.setChess960(chessVariant === 'chess960');
      const move = await chessAI.getBestMove({ fen: buildFEN(), moveTime: aiMoveTimeSetting });
      if (generation !== gameGeneration || gameMode !== 'computer' || currentPlayer !== computerColor() || gameOver || !move) return;
      const normalizedMove = chessVariant === 'chess960'
        ? normalizeChess960UciMove(move, square => {
            const col = square.charCodeAt(0) - 97;
            const row = 8 - Number(square[1]);
            return chessboard.querySelector(`[data-row="${row}"][data-col="${col}"] > .chess-piece`);
          })
        : { move, castle: null };
      applyStockfishMove(normalizedMove.castle
        ? normalizedMove.castle.kingFrom + normalizedMove.castle.kingTo
        : normalizedMove.move, {
        chessboard,
        canMovePiece,
        selectPiece: piece => { selectedPiece = piece; },
        handleSquareClick,
        isPromotionPending
      });
    } catch (error) {
      if (generation === gameGeneration) console.error('Falha na jogada do Stockfish:', error);
    } finally { aiBusy = false; }
  }
  
  function scheduleComputerTurn() {
    if (!analysisMode && gameMode === 'computer' && currentPlayer === computerColor() && !gameOver && !isPromotionPending()) {
      setTimeout(playComputerTurn, 50);
    }
  }
  
  const {
    createBoard,
    createPiece
  } = createBoardManager({
    chessboard,
    
    getSelectedPiece: () => selectedPiece,
    
    isPromotionPending: () => isPromotionPending(),
    
    handlePieceClick
  });
  
  createBoard();
  
  const { cancelDrag } = createDragAndDrop({
    chessboard,
    
    getCurrentPlayer: () => currentPlayer,
    
    getSelectedPiece: () => selectedPiece,
    
    handlePieceClick,
    handleSquareClick,
    
    isGameOver: () => gameOver && !analysisMode,
    
    isPromotionPending: () => isPromotionPending(),
    // Soltar o rei na própria casa nunca executa roque automaticamente.
    canCastleInPlace: () => false
  });
  
  const playerColor = () => humanColor;
  // The adapter reads live DOM pieces and existing castling-right flags.
  // It is intentionally inactive until variant selection and state persistence are ready.
  const chess960Castling = createChess960CastlingAdapter({
    squareAt: (row, col) => chessboard.querySelector(
      `:scope > [data-row="${row}"][data-col="${col}"]`
    ),
    rights: (color, side) => ({
      kingMoved: color === 'white' ? WkingMoved : BkingMoved,
      rookMoved: color === 'white'
        ? (side === 'king' ? WKrookMoved : WQrookMoved)
        : (side === 'king' ? BKrookMoved : BQrookMoved)
    })
  });

  function chess960CastlePlan(piece, row, col) {
    if (chessVariant !== 'chess960' || !piece.dataset.type.startsWith('King-')) return null;
    const color = piece.classList.contains('white') ? 'white' : 'black';
    if (row !== (color === 'white' ? 7 : 0)) return null;
    const side = col === 6 ? 'king' : col === 2 ? 'queen' : null;
    if (!side) return null;
    const plan = chess960Castling.plan(color, side);
    return plan && plan.king === piece ? plan : null;
  }

  function executeChess960Castle(plan) {
    if (!chess960Castling.execute(plan)) return false;
    if (plan.color === 'white') {
      WkingMoved = true;
      if (plan.side === 'king') WKrookMoved = true;
      else WQrookMoved = true;
    } else {
      BkingMoved = true;
      if (plan.side === 'king') BKrookMoved = true;
      else BQrookMoved = true;
    }
    enPassantTarget = null;
    playCastlingSound();
    return true;
  }

  let currentPlayer = 'white';
  let currentPlayer2 = 'black';
  let enPassantTarget = null;
  let gameOver = false;
  let gameResult = '*';
  let resultRegistered = false;
  let currentGameId = crypto.randomUUID();
  let pendingFinishedGameId = null;

  let archiveInProgress = null;
  async function archivePendingFinishedGame() {
    if (analysisMode || !gameOver || gameResult === '*' || !resultRegistered) return;
    if (archiveInProgress) return archiveInProgress;
    const id = currentGameId;
    // Capturar o estado final antes de qualquer reinício ou navegação.
    const finalState = structuredClone(saveGameState());
    const record = {
      id, endedAt: new Date().toISOString(), mode: gameMode,
      variant: chessVariant, chess960Position, humanColor,
      result: finalState.gameResult, finalState,
      states: [...gameHistory.getUndoStates(), finalState]
    };
    archiveInProgress = archiveFinishedGame(record);
    try {
      const ok = await archiveInProgress;
      if (ok && pendingFinishedGameId === id) pendingFinishedGameId = null;
      if (!ok) console.error('Arquivo pendente; tente abrir o histórico novamente:', id);
      return ok;
    } finally { archiveInProgress = null; }
  }

  window.addEventListener('pagehide', () => { void archivePendingFinishedGame(); });

  function setGameResult(result) {
    gameResult = result;
    
    if (result === '*' || resultRegistered || analysisMode) {
      return;
    }
    
    const validResults = ['1-0', '0-1', '1/2-1/2'];
    
    if (!validResults.includes(result)) return;
    
    let statsResult;
    
    if (gameMode === 'computer') {
      if (result === '1/2-1/2') {
        statsResult = 'draws';
      } else {
        const winner = result === '1-0' ? 'white' : 'black';
        
        statsResult = winner === humanColor ?
          'wins' :
          'losses';
      }
    } else {
      statsResult = result === '1-0' ?
        'whiteWins' :
        result === '0-1' ?
        'blackWins' :
        'draws';
    }
    
    if (registerGameResult(gameMode, statsResult, currentGameId)) {
      resultRegistered = true;
      console.log('Resultado registrado nas estatísticas!');
      // O resultado já foi registrado. O arquivo é salvo ao concluir o
      // encerramento, independentemente do botão usado em seguida.
      pendingFinishedGameId = currentGameId;
      queueMicrotask(() => { void archivePendingFinishedGame(); });
    }
  }
  
  function resultFromWinner(winner) {
    return winner === 'white' ? '1-0' : '0-1';
  }
  let drawOfferAvailable = false;
  let pendingPromotionNotation = null;
  let pendingPromotionSAN = null;
  let BkingMoved = false;
  let BKrookMoved = false;
  let BQrookMoved = false;
  let WkingMoved = false;
  let WKrookMoved = false;
  let WQrookMoved = false;
  const {
    calculateValidMoves,
    clearHighlightedSquares,
    clearHighlightedSquaresCapture
  } = createMoveHighlights({
    getSelectedPiece: () => selectedPiece,
    getEnPassantTarget: () => enPassantTarget,
    handleSquareClick,
    isMoveKingSafe,
    isShortCastleValid,
    isLongCastleValid,
    getChessVariant: () => chessVariant,
    getChess960CastlePlan: chess960CastlePlan
  });
  // RELÓGIOS DE XADREZ
  const chessClock = createChessClock({
    initialTime: 10 * 60 * 1000,
    
    onTimeout: (loser) => {
      handleTimeOut(loser);
    }
  });
  
  const {
    startClock,
    stopClock,
    switchClock,
    resetClocks,
    syncClock,
    getClockState,
    restoreClockState,
    isClockRunning,
    isTimeExpired,
    updateClockDisplay,
    setInitialTime,
    setIncrementTime
  } = chessClock;
  
  let halfmoveClock = 0;
  let positionHistory = [];
  
  const claimDrawBtn = document.getElementById(
    'claim-draw-btn'
  );
  
  const {
    getLegalEnPassantKey,
    getPositionKey,
    countPositionRepetitions,
    updateDrawButton,
    checkFivefoldRepetition,
    claimFiftyMoveDraw
  } = createDrawRules({
    
    isAnalysisMode: () => analysisMode,
    
    getCurrentPlayer: () => currentPlayer,
    
    getEnPassantTarget: () => enPassantTarget,
    
    getCastlingState: () => ({
      WkingMoved,
      BkingMoved,
      WKrookMoved,
      WQrookMoved,
      BKrookMoved,
      BQrookMoved
    }),
    
    getPositionHistory: () => positionHistory,
    
    getHalfmoveClock: () => halfmoveClock,
    
    getDrawOfferAvailable: () => drawOfferAvailable,
    
    setDrawOfferAvailable: value => {
      drawOfferAvailable = value;
    },
    
    isGameOver: () => gameOver,
    
    isPromotionPending: () => isPromotionPending(),
    
    isMoveKingSafe,
    
    finishDraw: reason => {
      gameOver = true;
      stopClock();
      playDrawSound();
      showDrawPanel(reason);
      updateUndoButton();
      updateDrawButton();
    },
    
    openDrawAgreement: () => {
      drawAgreementOverlay.hidden = false;
    }
  });
  
  positionHistory.push(getPositionKey());
  
  const {
    handleTimeOut,
    resignGame,
    evaluateGameState,
    showCheckmatePanel,
    showDrawPanel,
    showResignationPanel
  } = createGameEnd({
    playerColor,
    setGameResult,
    
    getGameOver: () => gameOver,
    
    setGameOver: value => {
      gameOver = value;
    },
    
    getHalfmoveClock: () => halfmoveClock,
    
    getCurrentPlayer: () => currentPlayer,
    
    isCheckmate,
    isStalemate,
    
    stopClock,
    
    updateUndoButton,
    updateDrawButton,
    
    canUndo: () => gameHistory.canUndo()
  });
  
  
  const {
    showPromotionPanel,
    isPromotionPending,
    resetPromotion
  } = createPromotion({
    createPiece,
    
    getSelectedPiece: () => selectedPiece,
    
    setSelectedPiece: piece => {
      selectedPiece = piece;
    },
    
    clearHighlightedSquares,
    clearHighlightedSquaresCapture,
    
    syncClock,
    
    isGameOver: () => gameOver,
    isTimeExpired,
    
    isCheckmate,
    
    registerMove,
    
    getPendingPromotionNotation: () =>
      pendingPromotionNotation,
    
    setPendingPromotionNotation: notation => {
      pendingPromotionNotation = notation;
    },
    
    getPendingPromotionSAN: () =>
      pendingPromotionSAN,
    
    setPendingPromotionSAN: san => {
      pendingPromotionSAN = san;
    },
    
    setCurrentPlayer: color => {
      currentPlayer = color;
    },
    
    switchClock,
    
    registerPosition: () => {
      positionHistory.push(getPositionKey());
      
      console.log(
        'Repetições:',
        countPositionRepetitions()
      );
    },
    
    evaluateGameState,
    checkFivefoldRepetition,
    updateDrawButton,
    isAnalysisMode: () => analysisMode,
    onAnalysisPromotionComplete: () => {
      // A promoção experimental não encerra nem retoma a partida oficial.
      gameOver = true;
      stopClock();
      updateUndoButton();
    },
    onPromotionComplete: scheduleComputerTurn
  });
  
  const moveHistoryList = document.getElementById('move-history-list');
  const whiteCaptures = document.getElementById('white-captures');
  const blackCaptures = document.getElementById('black-captures');
  
  const restartMatchBtn = document.getElementById('restart-match-btn');
  restartMatchBtn.addEventListener('click', () => {
    restartGame();
  });
  claimDrawBtn.addEventListener('click', claimFiftyMoveDraw);
  
  const checkmateOverlay = document.getElementById('checkmate-overlay');
  const checkmateWinner = document.getElementById('checkmate-winner');
  const restartGameBtn = document.getElementById('restart-game-btn');
  const moveHistoryPanel = document.querySelector('.move-history');
  const capturedPiecesPanel = document.querySelector('.captured-pieces');
  const viewFinishedHistoryBtn = document.getElementById(
    'view-finished-history-btn'
  );
  const showFinishedResultBtn = document.getElementById(
    'show-finished-result-btn'
  );
  
  // Entrar na análise: preservar a posição final e as posições anteriores.
  function enterAnalysis() {
    if (!gameOver || analysisMode) return;
    void archivePendingFinishedGame();
    officialFinalState = structuredClone(saveGameState());
    analysisUndo = gameHistory.getUndoStates();
    analysisRedo = [];
    
    replayStates = [
      ...structuredClone(analysisUndo),
      structuredClone(officialFinalState)
    ];
    analysisMode = true;
    gameGeneration++;
    chessAI.stop();
    aiBusy = false;
    stopClock();
    checkmateOverlay.hidden = true;
    showFinishedResultBtn.hidden = false;
    moveHistoryPanel.hidden = false;
    updateUndoButton();
    moveHistoryList.scrollLeft = moveHistoryList.scrollWidth;
  }
  
  // Sair da análise: descartar TODAS as alterações experimentais.
  function exitAnalysis() {
    if (!analysisMode || !officialFinalState) return;
    cancelDrag();
    resetPromotion();
    analysisMode = false;
    restoreGameState(officialFinalState);
    stopClock();
    officialFinalState = null;
    replayStates = [];
    replayNavigating = false;
    checkmateOverlay.hidden = false;
    showFinishedResultBtn.hidden = true;
    updateUndoButton();
  }
  
  viewFinishedHistoryBtn.addEventListener('click', enterAnalysis);
  showFinishedResultBtn.addEventListener('click', exitAnalysis);
  
  acceptDrawBtn.addEventListener('click', () => {
    if (gameOver || isPromotionPending() || drawAgreementOverlay.hidden) return;
    
    drawAgreementOverlay.hidden = true;
    gameOver = true;
    stopClock();
    
    playDrawSound();
    showDrawPanel('Empate por acordo entre os jogadores!');
    
    updateDrawButton();
    
    console.log('EMPATE ACEITO POR ACORDO!');
  });
  
  declineDrawBtn.addEventListener('click', () => {
    drawAgreementOverlay.hidden = true;
    
    console.log('PROPOSTA DE EMPATE RECUSADA!');
  });
  
  // Abrir a confirmação de desistência
  resignGameBtn.addEventListener('click', () => {
    if (gameOver || isPromotionPending()) return;
    
    resignOverlay.hidden = false;
  });
  
  // Cancelar desistência
  cancelResignBtn.addEventListener('click', () => {
    resignOverlay.hidden = true;
  });
  
  // Confirmar desistência
  confirmResignBtn.addEventListener('click', () => {
    if (
      gameOver ||
      isPromotionPending() ||
      resignOverlay.hidden
    ) return;
    
    resignOverlay.hidden = true;
    
    resignGame();
    
  });
  
  // =====================================
  // SISTEMA DE RELÓGIOS
  // =====================================
  
  function saveGameState() {
    syncClock();
    return captureGameState({
      chessboard,
      chessVariant,
      chess960Position,
      currentPlayer,
      currentPlayer2,
      enPassantTarget,
      WkingMoved,
      BkingMoved,
      WKrookMoved,
      WQrookMoved,
      BKrookMoved,
      BQrookMoved,
      moveHistory: gameHistory.getMoveHistory(),
      capturedPieces: gameHistory.getCapturedPieces(),
      gameOver,
      gameResult,
      currentGameId,
      resultRegistered,
      halfmoveClock,
      positionHistory,
      drawOfferAvailable,
      clockState: getClockState(),
      checkmateTitle: document.getElementById('checkmate-title').textContent,
      checkmateWinnerText: checkmateWinner.textContent,
      checkmateOverlayVisible: !checkmateOverlay.hidden
    });
  }

  // FASE 12: armazenamento isolado; restauração e estado continuam no controlador.
  let sessionActive = false;
  let initialTimeSetting = 600000;
  let incrementTimeSetting = 0;
  let aiSkillSetting = 0;
  let aiMoveTimeSetting = 600;
  let aiHashSetting = 32;
  let aiLimitEloSetting = false;
  let aiEloSetting = 1600;

  const gameStorage = createGameStorage({
    canPersist: () => sessionActive,
    isPromotionPending: () => isPromotionPending(),
    isGameOver: () => gameOver,
    getPayload: () => ({
      version: 1,
      chessVariant,
      chess960Position,
      mode: gameMode,
      humanColor,
      aiSkill: aiSkillSetting,
      aiMoveTime: aiMoveTimeSetting,
      aiHash: aiHashSetting,
      aiLimitElo: aiLimitEloSetting,
      aiElo: aiEloSetting,
      initialTime: initialTimeSetting,
      incrementTime: incrementTimeSetting,
      state: saveGameState(),
      undoStates: gameHistory.getUndoStates()
    })
  });
  const { readSavedGame, updateContinueButton, persistGame } = gameStorage;
  gameStorage.startAutoSave();

  async function continueSavedGame() {
    const saved = await readSavedGame();
    if (!saved) return;
    gameGeneration++;
    chessAI.stop();
    aiBusy = false;
    gameHistory.reset();
    gameMode = saved.mode;
    // Salvamentos antigos não incluem metadados de variante.
    chessVariant = saved.chessVariant ?? saved.state.chessVariant ?? "classic";
    chess960Position = saved.chess960Position ?? saved.state.chess960Position ?? 518;
    humanColor = saved.humanColor;
    aiSkillSetting = saved.aiSkill ?? 0;
    aiMoveTimeSetting = [saved.aiMoveTime].filter(v => Number.isInteger(v) && v >= 200 && v <= 5000)[0] ?? 600;
    aiHashSetting = [16, 32, 64].includes(saved.aiHash) ? saved.aiHash : 32;
    aiLimitEloSetting = saved.aiLimitElo === true;
    aiEloSetting = Number.isInteger(saved.aiElo) && saved.aiElo >= 1320 && saved.aiElo <= 3190 ? saved.aiElo : 1600;
initialTimeSetting = saved.initialTime ?? 600000;

incrementTimeSetting =
  saved.incrementTime ??
  saved.state.clockState.incrementTime ??
  0;

chessAI.setSkillLevel(aiSkillSetting);
chessAI.setAdvancedOptions({ hash: aiHashSetting, limitStrength: aiLimitEloSetting, elo: aiEloSetting });
chessAI.setChess960(chessVariant === 'chess960');

setInitialTime(initialTimeSetting);
setIncrementTime(incrementTimeSetting);    // O tempo não deve continuar correndo enquanto o jogo está fechado.
    restoreGameState({
      ...saved.state,
      clockState: { ...saved.state.clockState, clockRunning: false }
    });
    gameHistory.restoreUndoStates(saved.undoStates ?? []);
    chessboard.classList.toggle('black-perspective', humanColor === 'black');
    sessionActive = true;
    gameMenu.showGame();
    
// Retomar o relógio somente se a partida
// já havia começado e ainda não terminou.
if (
  !gameOver &&
  !isTimeExpired() &&
  saved.state.clockState.clockRunning
) {
  startClock();
}
    scheduleComputerTurn();
  }
  
  
  function updateUndoButton() {
    if (gameOver && gameResult !== '*' && resultRegistered && !analysisMode) {
      pendingFinishedGameId = currentGameId;
      queueMicrotask(() => { void archivePendingFinishedGame(); });
    }
    resignGameBtn.disabled = gameOver;
    
    claimDrawBtn.disabled =
      analysisMode || gameOver || isPromotionPending();
    
    const hasUndo = analysisMode ?
      analysisUndo.length > 0 :
      gameHistory.canUndo();
    
    const hasRedo = analysisMode ?
      analysisRedo.length > 0 :
      gameHistory.canRedo();
    
    undoMoveBtn.disabled = !hasUndo;
    redoMoveBtn.disabled = !hasRedo;
    
    // Controles exclusivos do replay
    replayStartBtn.hidden = !analysisMode;
    replayEndBtn.hidden = !analysisMode;
    
    // Ações exclusivas da partida normal
    restartMatchBtn.hidden = analysisMode;
    resignGameBtn.hidden = analysisMode;
    claimDrawBtn.hidden = analysisMode;
    
    if (analysisMode && officialFinalState) {
      const currentMoveCount =
        gameHistory.getMoveHistory().length;
      
      replayStartBtn.disabled = currentMoveCount === 0;
      
      replayEndBtn.disabled =
        currentMoveCount === officialFinalState.moveHistory.length;
    }
    
    // No replay, manter a navegação visível.
    gameControls.hidden = !analysisMode && !hasUndo && !hasRedo;
  }
  
  
  function restoreGameState(state) {
    chessVariant = state.chessVariant ?? "classic";
    chess960Position = state.chess960Position ?? 518;
    cancelDrag();
    // Limpar seleção e destaques
    selectedPiece = null;
    
    clearHighlightedSquares();
    clearHighlightedSquaresCapture();
    
    // Reconstruir as peças do snapshot no tabuleiro.
    restoreBoardPieces(chessboard, state.pieces, createPiece);
    
    // Restaurar turnos
    currentPlayer = state.currentPlayer;
    currentPlayer2 = state.currentPlayer2;
    
    restoreClockState(
      analysisMode && officialFinalState ?
      officialFinalState.clockState :
      state.clockState,
      !analysisMode && !state.gameOver
    );
    
    // Restaurar En Passant
    enPassantTarget = state.enPassantTarget ? { ...state.enPassantTarget } :
      null;
    
    // Restaurar direitos de roque
    WkingMoved = state.WkingMoved;
    BkingMoved = state.BkingMoved;
    
    WKrookMoved = state.WKrookMoved;
    WQrookMoved = state.WQrookMoved;
    
    BKrookMoved = state.BKrookMoved;
    BQrookMoved = state.BQrookMoved;
    
    // Restaurar histórico e capturas
    gameHistory.setRecords(
      state.moveHistory,
      state.capturedPieces
    );
    
    // Restaurar regras de empate
    gameOver = analysisMode ? true : state.gameOver;
    
gameResult = state.gameResult ?? '*';

// Recuperar o identificador original da partida.
// Manter compatibilidade com salvamentos antigos.
currentGameId =
  state.currentGameId ??
  state.gameId ??
  crypto.randomUUID();

resultRegistered =
  isGameResultRegistered(currentGameId);
if (!analysisMode && gameOver && gameResult !== '*' && resultRegistered) {
  pendingFinishedGameId = currentGameId;
  queueMicrotask(() => { void archivePendingFinishedGame(); });
}

    halfmoveClock = state.halfmoveClock;
    
    positionHistory = [...state.positionHistory];
    drawOfferAvailable = state.drawOfferAvailable ?? false;
    
    // Limpar estados temporários
    resetPromotion();
    pendingPromotionNotation = null;
    pendingPromotionSAN = null;
    drawAgreementOverlay.hidden = true;
    resignOverlay.hidden = true;
    
    // Restaurar a tela de encerramento
    document.getElementById('checkmate-title').textContent =
      state.checkmateTitle;
    
    checkmateWinner.textContent =
      state.checkmateWinnerText;
    
    checkmateOverlay.hidden = analysisMode ? true : !state.checkmateOverlayVisible;
    showFinishedResultBtn.hidden = analysisMode ? false :
      (!state.gameOver || state.checkmateOverlayVisible);
    // Atualizar interface
    renderMoveHistory();
    renderCapturedPieces();
    updatePanelsVisibility();
    updateUndoButton();
    updateDrawButton();
  }
  
  
  function playHistoryMoveSound(move) {
    if (!move) return;
    
    const san = move.san || move.notation || '';
    
    const isFinalCheckmate =
      analysisMode &&
      officialFinalState &&
      officialFinalState.checkmateTitle === 'XEQUE-MATE!' &&
      gameHistory.getMoveHistory().length ===
      officialFinalState.moveHistory.length &&
      move === officialFinalState.moveHistory.at(-1)?.san;
    
    if (san.includes('#') || isFinalCheckmate) {
      playCheckmateSound();
    } else if (san.includes('+')) {
      playCheckSound();
    } else if (san.includes('=')) {
      playPromotionSound();
    } else if (/^(O-O|0-0)/.test(san)) {
      playCastlingSound();
    } else if (san.includes('x')) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
  }
  
  
  function playUndoMoveSound(move) {
    if (!move) {
      playMoveSound();
      return;
    }
    
    const san = move.san || move.notation || '';
    
    // Xeque, xeque-mate e promoção:
    // ao desfazer, apenas som de movimento.
    if (
      san.includes('#') ||
      san.includes('+') ||
      san.includes('=')
    ) {
      playMoveSound();
    } else if (/^(O-O|0-0)/.test(san)) {
      playCastlingSound();
    } else if (san.includes('x')) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
  }
  
  
  function undoMove() {
    if (analysisMode) {
      if (!analysisUndo.length || isPromotionPending()) return;
      
      const currentState = saveGameState();
      const move = currentState.moveHistory?.at(-1);
      
      analysisRedo.push(currentState);
      restoreGameState(analysisUndo.pop());
      stopClock();
      
      playUndoMoveSound(move);
      return;
    }
    
    if (gameOver || !gameHistory.canUndo() || isPromotionPending()) return;
    
    syncClock();
    
    const currentState = saveGameState();
    const move = currentState.moveHistory?.at(-1);
    const previousState = gameHistory.undo(currentState);
    
    if (!previousState) return;
    
    restoreGameState(previousState);

// Manter o relógio funcionando após desfazer,
// desde que ele estivesse ativo antes da ação.
if (currentState.clockState.clockRunning && !gameOver) {
  startClock();
}

persistGame();

playUndoMoveSound(move);
    
    console.log('Última jogada desfeita!');
  }
  
  
function redoMove() {
  if (analysisMode) {
    if (!analysisRedo.length || isPromotionPending()) return;

    analysisUndo.push(saveGameState());
    restoreGameState(analysisRedo.pop());
    stopClock();

    const move = gameHistory.getMoveHistory().at(-1);
    playHistoryMoveSound(move);
    return;
  }

  if (gameOver || !gameHistory.canRedo() || isPromotionPending()) {
    return;
  }

  syncClock();

  const currentState = saveGameState();
  const nextState = gameHistory.redo(currentState);

  if (!nextState) return;

  restoreGameState(nextState);

  // Se o lance refeito encerrou a partida, arquivar o resultado.
  // A função de arquivamento evita duplicatas pelo ID.
  if (gameOver && gameResult !== '*' && resultRegistered) {
    pendingFinishedGameId = currentGameId;
    archivePendingFinishedGame();
  }

  // Retomar o relógio somente se a partida continuar ativa.
  if (currentState.clockState.clockRunning && !gameOver) {
    startClock();
  }

  persistGame();

  const move = gameHistory.getMoveHistory().at(-1);
  playHistoryMoveSound(move);

  console.log('Última jogada refeita!');
}

  
  // O resultado é definitivo: não há desfazer no painel de encerramento.
  
  function enableHoldToRepeat(button, action) {
    const HOLD_DELAY = 350;
    const REPEAT_INTERVAL = 150;
    
    let holdTimer = null;
    let repeatTimer = null;
    let holding = false;
    let repeating = false;
    let pointerId = null;
    
    function stopHolding() {
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      
      holdTimer = null;
      repeatTimer = null;
      holding = false;
      pointerId = null;
    }
    
    button.addEventListener('pointerdown', event => {
      if (button.disabled || !event.isPrimary) return;
      
      stopHolding();
      
      holding = true;
      repeating = false;
      pointerId = event.pointerId;
      
      // Mantém o controle mesmo se o dedo sair do botão.
      if (button.setPointerCapture) {
        button.setPointerCapture(event.pointerId);
      }
      
      holdTimer = setTimeout(() => {
        if (!holding) return;
        
        repeating = true;
        
        // Primeiro lance após segurar.
        if (!button.disabled) {
          action();
        }
        
        // Continuar navegando automaticamente.
        repeatTimer = setInterval(() => {
          if (button.disabled) {
            stopHolding();
            return;
          }
          
          action();
        }, REPEAT_INTERVAL);
        
      }, HOLD_DELAY);
    });
    
    button.addEventListener('pointerup', event => {
      if (pointerId !== event.pointerId) return;
      
      const wasRepeating = repeating;
      
      stopHolding();
      
      // Clique rápido: apenas um lance.
      if (!wasRepeating && !button.disabled) {
        action();
      }
    });
    
    button.addEventListener('pointercancel', stopHolding);
    button.addEventListener('lostpointercapture', stopHolding);
    
    // Evita que o clique sintético duplique a ação.
    button.addEventListener('click', event => {
      if (event.detail !== 0) {
        event.preventDefault();
      } else if (!button.disabled) {
        // Acessibilidade: Enter/Espaço no teclado.
        action();
      }
    });
    
    // Evita abrir o menu de contexto ao segurar no celular.
    button.addEventListener('contextmenu', event => {
      event.preventDefault();
    });
  }
  
  enableHoldToRepeat(undoMoveBtn, undoMove);
  enableHoldToRepeat(redoMoveBtn, redoMove);
  
  updateUndoButton();
  updateDrawButton();
  
  function handlePieceClick(event) {
    if ((gameOver && !analysisMode) || isPromotionPending() || (!analysisMode && gameMode === 'computer' && currentPlayer === computerColor())) return;
    const clickedPiece = event.currentTarget;
    const clickedRow = parseInt(clickedPiece.dataset.row);
    const clickedCol = parseInt(clickedPiece.dataset.col);
    const pieceType = clickedPiece.dataset.type;
    const pieceColor = clickedPiece.classList.contains('black') ? 'black' : 'white';
    
    if (pieceColor !== currentPlayer) {
      return;
    }

    // Chess960: clicar na torre original com o rei selecionado executa
    // o roque legal. Clicar novamente no rei apenas desmarca a seleção.
    if (chessVariant === 'chess960' && selectedPiece &&
        selectedPiece.dataset.type.startsWith('King-')) {
      const king = selectedPiece;
      const side = clickedPiece === king ? null
        : (pieceType.startsWith('Rook-K-') ? 'king' :
           pieceType.startsWith('Rook-Q-') ? 'queen' : null);
      if (side) {
        const targetCol = side === 'king' ? 6 : 2;
        const plan = chess960CastlePlan(king, clickedRow, targetCol);
        if (plan && clickedPiece === plan.rook) {
          event.stopPropagation?.();
          const target = chessboard.querySelector(
            `:scope > [data-row="${clickedRow}"][data-col="${targetCol}"]`
          );
          if (target) handleSquareClick({ currentTarget: target });
          return;
        }
      }
    }
    
    // Iniciar o relógio na primeira seleção válida
    if (
      !isClockRunning() &&
      gameHistory.getMoveHistory().length === 0 &&
      !gameOver && !analysisMode &&
      !isTimeExpired()
    ) {
      startClock();
    }
    
    if (selectedPiece === clickedPiece) {
      selectedPiece.classList.remove('selected');
      selectedPiece = null;
      clearHighlightedSquares();
      clearHighlightedSquaresCapture()
    } else {
      if (selectedPiece) {
        const selectedPieceColor = selectedPiece.classList.contains('black') ? 'black' : 'white';
        
        if (pieceColor === selectedPieceColor) {
          selectedPiece.classList.remove('selected');
          selectedPiece = clickedPiece;
          clickedPiece.classList.add('selected');
          clearHighlightedSquares();
          clearHighlightedSquaresCapture()
          calculateValidMoves(pieceType, pieceColor, clickedRow, clickedCol);
          console.log('Trocou para:', getChessCoordinates(clickedRow, clickedCol));
          return;
        }
        
        
        selectedPiece.classList.remove('selected');
        clearHighlightedSquares();
        clearHighlightedSquaresCapture()
      }
      
      clickedPiece.classList.add('selected');
      selectedPiece = clickedPiece;
      console.log('Peça clicada em', getChessCoordinates(clickedRow, clickedCol));
      calculateValidMoves(pieceType, pieceColor, clickedRow, clickedCol);
    }
  }
  
  function createSANBase(piece, newRow, newCol, isCapture) {
    const type = piece.dataset.type.split('-')[0];
    const color = piece.classList.contains('white') ? 'white' : 'black';
    
    const originRow = Number(piece.dataset.row);
    const originCol = Number(piece.dataset.col);
    
    const destination = getChessCoordinates(newRow, newCol);
    const origin = getChessCoordinates(originRow, originCol);
    
    const letters = {
      Pawn: '',
      Knight: 'N',
      Bishop: 'B',
      Rook: 'R',
      Queen: 'Q',
      King: 'K'
    };
    
    if (type === 'King' && Math.abs(newCol - originCol) === 2) {
      return newCol > originCol ? 'O-O' : 'O-O-O';
    }
    
    if (type === 'Pawn') {
      return (isCapture ? `${origin[0]}x` : '') + destination;
    }
    
    const candidates = [...document.querySelectorAll('#chessboard .chess-piece')]
      .filter(other => {
        if (other === piece) return false;
        
        const otherType = other.dataset.type.split('-')[0];
        const otherColor = other.classList.contains('white') ? 'white' : 'black';
        
        return (
          otherType === type &&
          otherColor === color &&
          canMovePiece(other, newRow, newCol)
        );
      });
    
    let disambiguation = '';
    
    if (candidates.length > 0) {
      const sameFile = candidates.some(
        other => Number(other.dataset.col) === originCol
      );
      
      const sameRank = candidates.some(
        other => Number(other.dataset.row) === originRow
      );
      
      if (!sameFile) {
        disambiguation = origin[0];
      } else if (!sameRank) {
        disambiguation = origin[1];
      } else {
        disambiguation = origin;
      }
    }
    
    return (
      letters[type] +
      disambiguation +
      (isCapture ? 'x' : '') +
      destination
    );
  }
  
  function handleSquareClick(event) {
    if ((gameOver && !analysisMode) || isPromotionPending() || (!analysisMode && gameMode === 'computer' && currentPlayer === computerColor() && !aiBusy)) return;
    
    const clickedSquare = event.currentTarget;
    const clickedRow = parseInt(clickedSquare.dataset.row);
    const clickedCol = parseInt(clickedSquare.dataset.col);
    
    if (!selectedPiece) return;
    
    const pieceColor = selectedPiece.classList.contains('black') ?
      'black' :
      'white';
    
    const movingPieceType = selectedPiece.dataset.type;
    const originRow = Number(selectedPiece.dataset.row);
    const originCol = Number(selectedPiece.dataset.col);
    
    const destinationPiece = document.querySelector(
      `[data-row="${clickedRow}"][data-col="${clickedCol}"] > .chess-piece`
    );
    
    const isEnPassantCapture =
      movingPieceType === 'Pawn' &&
      enPassantTarget !== null &&
      clickedRow === enPassantTarget.row &&
      clickedCol === enPassantTarget.col &&
      Math.abs(clickedCol - originCol) === 1 &&
      !destinationPiece;
    
    if (pieceColor !== currentPlayer) return;
    
    const chess960Plan = chess960CastlePlan(selectedPiece, clickedRow, clickedCol);
    if (!canMovePiece(selectedPiece, clickedRow, clickedCol)) {
      PlayilegalSound();
      console.log('Movimento inválido. Tente novamente.');
      return;
    }
    
    if (!analysisMode) syncClock();
    
    if (!analysisMode && (gameOver || isTimeExpired())) return;
    
    const previousGameState = saveGameState();
    
    const sanBase = createSANBase(
      selectedPiece,
      clickedRow,
      clickedCol,
      (!chess960Plan && Boolean(destinationPiece)) || isEnPassantCapture
    );
    
    let moveSuccessful = true;
    
    if (chess960Plan) {
      moveSuccessful = executeChess960Castle(chess960Plan);
    } else if (chessVariant !== 'chess960' && isShortCastleMove(selectedPiece, clickedRow, clickedCol)) {
      moveSuccessful = performShortCastle(
        selectedPiece,
        pieceColor
      ) === true;
      
    } else if (chessVariant !== 'chess960' && isLongCastleMove(selectedPiece, clickedRow, clickedCol)) {
      moveSuccessful = performLongCastle(
        selectedPiece,
        pieceColor
      ) === true;
      
    } else {
      moveSuccessful = movePiece(
        selectedPiece,
        clickedRow,
        clickedCol
      ) === true;
    }
    
    if (!moveSuccessful) {
      PlayilegalSound();
      console.log('Movimento não realizado.');
      return;
    }
    
    
    if (analysisMode) {
      analysisUndo.push(previousGameState);
      analysisRedo = [];
      // O registro de análise é descartado ao voltar ao resultado.
      if (isPromotionPending()) {
        pendingPromotionNotation = sanBase;
        pendingPromotionSAN = sanBase;
        return;
      }
      const opponent = oppositeColor(pieceColor);
      const suffix = isCheckmate(opponent) ? '#' : (isCheck(opponent) ? '+' : '');
      registerMove(pieceColor, sanBase + suffix, sanBase + suffix);
      selectedPiece.classList.remove('selected');
      selectedPiece = null;
      clearHighlightedSquares();
      clearHighlightedSquaresCapture();
      currentPlayer = opponent;
      stopClock();
      updateUndoButton();
      return;
    }
    
    gameHistory.saveUndoState(previousGameState);
    
    updateUndoButton();
    
    // Regra dos 50 movimentos
    const isPawnMove = movingPieceType === 'Pawn';
    const isCaptureMove = (!chess960Plan && Boolean(destinationPiece)) || isEnPassantCapture;
    
    if (isPawnMove || isCaptureMove) {
      halfmoveClock = 0;
    } else {
      halfmoveClock++;
    }
    
    console.log(`Contador de meios-lances: ${halfmoveClock}`);
    
    updateDrawButton();
    
    console.log(
      'Peça movida para:',
      getChessCoordinates(clickedRow, clickedCol)
    );
    
    const pieceLetters = {
      Pawn: '',
      Knight: 'C',
      Bishop: 'B',
      Rook: 'T',
      Queen: 'D',
      King: 'R'
    };
    
    const pieceName = movingPieceType.split('-')[0];
    const pieceLetter = pieceLetters[pieceName];
    
    const destination = getChessCoordinates(
      clickedRow,
      clickedCol
    );
    
    
    const isCapture = (!chess960Plan && Boolean(destinationPiece)) || isEnPassantCapture;
    
    let notation;
    
    if (
      pieceName === 'King' &&
      (chess960Plan || Math.abs(clickedCol - originCol) === 2)
    ) {
      notation = chess960Plan ? (chess960Plan.side === 'king' ? 'O-O' : 'O-O-O') : (clickedCol > originCol ? 'O-O' : 'O-O-O');
      
    } else if (pieceName === 'Pawn' && isCapture) {
      const originFile = 'abcdefgh' [originCol];
      
      notation = `${originFile}x${destination}`;
      
    } else {
      notation = `${pieceLetter}${isCapture ? 'x' : ''}${destination}`;
    }
    
    
    if (!isPromotionPending()) {
      const opponentColor = pieceColor === 'white' ?
        'black' :
        'white';
      
      let suffix = '';
      
      if (isCheckmate(opponentColor)) {
        suffix = '#';
      } else if (isCheck(opponentColor)) {
        suffix = '+';
      }
      
      registerMove(
        pieceColor,
        notation + suffix,
        sanBase + suffix
      );
    }
    
    // O peão chegou à última fileira.
    // Aguardar a escolha da promoção antes de trocar o turno.
    if (isPromotionPending()) {
      pendingPromotionNotation = notation;
      pendingPromotionSAN = sanBase;
      return;
    }
    
    selectedPiece.classList.remove('selected');
    selectedPiece = null;
    
    clearHighlightedSquares();
    clearHighlightedSquaresCapture();
    
    completeTurn({
      currentPlayer,
      switchClock,
      isGameOver: () => gameOver,
      isTimeExpired,
      setCurrentPlayer: player => { currentPlayer = player; },
      positionHistory,
      getPositionKey,
      evaluateGameState,
      checkFivefoldRepetition,
      updateDrawButton,
      scheduleComputerTurn
    });
    
  }
  
  function isShortCastleMove(piece, newRow, newCol) {
    return shortCastleMoveRule(
      piece,
      newRow,
      newCol,
      currentPlayer,
      isShortCastleValid
    );
  }
  
  function isShortCastleValid(color, kingMoved, rookShortMoved) {
    return shortCastleRule(
      color,
      kingMoved,
      rookShortMoved,
      color === 'white' ? WkingMoved : BkingMoved,
      color === 'white' ? WKrookMoved : BKrookMoved
    );
  }
  
  
  function performShortCastle(king, color) {
    const successful = performShortCastleRule(
      king,
      color,
      movePiece,
      playCastlingSound,
      playCheckSound
    );
    
    if (successful !== true) {
      return false;
    }
    
    // Registrar que a torre participou do roque curto.
    if (color === 'white') {
      WKrookMoved = true;
    } else {
      BKrookMoved = true;
    }
    
    return true;
  }
  
  
  function isLongCastleMove(piece, newRow, newCol) {
    return longCastleMoveRule(
      piece,
      newRow,
      newCol,
      currentPlayer,
      isLongCastleValid
    );
  }
  
  function isLongCastleValid(color, kingMoved, rookLongMoved) {
    return longCastleRule(
      color,
      kingMoved,
      rookLongMoved,
      color === 'white' ? WkingMoved : BkingMoved,
      color === 'white' ? WQrookMoved : BQrookMoved
    );
  }
  
  
  function performLongCastle(king, color) {
    const successful = performLongCastleRule(
      king,
      color,
      movePiece,
      playCastlingSound,
      playCheckSound
    );
    
    if (successful !== true) {
      return false;
    }
    
    // Registrar que a torre participou do roque longo.
    if (color === 'white') {
      WQrookMoved = true;
    } else {
      BQrookMoved = true;
    }
    
    return true;
  }
  
  function registerCapturedPiece(piece, capturedBy) {
    gameHistory.registerCapturedPiece(piece, capturedBy);
    
    renderCapturedPieces();
    updatePanelsVisibility();
  }
  
  
  
  function renderCapturedPieces() {
    renderCapturedPiecesUI(gameHistory.getCapturedPieces(), whiteCaptures, blackCaptures);
  }

  function isValidMove(piece, newRow, newCol) {
    const currentRow = parseInt(piece.dataset.row);
    const currentCol = parseInt(piece.dataset.col);
    const pieceType = piece.dataset.type;
    
    switch (pieceType) {
      case 'Pawn':
        return isValidPawnMove(
          piece,
          currentRow,
          currentCol,
          newRow,
          newCol,
          enPassantTarget
        );
      case 'Knight-B':
      case 'Knight-W':
        return isValidKnightMove(currentRow, currentCol, newRow, newCol);
      case 'Bishop-W':
      case 'Bishop-B':
        return isValidBishopMove(currentRow, currentCol, newRow, newCol);
      case 'Rook-Q-B':
      case 'Rook-K-B':
      case 'Rook-Q-W':
      case 'Rook-K-W':
        return isValidRookMove(currentRow, currentCol, newRow, newCol);
      case 'Queen-W':
      case 'Queen-B':
        return isValidQueenMove(currentRow, currentCol, newRow, newCol);
      case 'King-W':
        return isValidWhiteKingMove(currentRow, currentCol, newRow, newCol);
      case 'King-B':
        return isValidBlackKingMove(currentRow, currentCol, newRow, newCol);
      default:
        return false;
    }
  }
  
  function updatePanelsVisibility() {
    updatePanelsVisibilityUI(
      gameHistory.getMoveHistory(),
      gameHistory.getCapturedPieces(),
      moveHistoryPanel,
      capturedPiecesPanel
    );
  }

  function isMoveKingSafe(piece, newRow, newCol) {
    return moveKingSafeRule(
      piece,
      newRow,
      newCol,
      enPassantTarget
    );
  }
  
  function canMovePiece(piece, newRow, newCol) {
    const currentRow = Number(piece.dataset.row);
    const currentCol = Number(piece.dataset.col);

    if (chess960CastlePlan(piece, newRow, newCol)) return true;
    
    const pieceType = piece.dataset.type;
    
    const color = piece.classList.contains('white') ?
      'white' :
      'black';
    
    const isKing =
      pieceType === 'King-W' ||
      pieceType === 'King-B';
    
    const isCastlingAttempt =
      isKing &&
      currentRow === newRow &&
      Math.abs(newCol - currentCol) === 2;
    
    // Validar o roque separadamente dos movimentos normais.
    if (isCastlingAttempt && chessVariant === 'chess960') return false;

    if (isCastlingAttempt) {
      const initialRow = color === 'white' ? 7 : 0;
      
      // O rei precisa estar na casa inicial.
      if (
        currentRow !== initialRow ||
        currentCol !== 4
      ) {
        return false;
      }
      
      // Roque curto.
      if (newCol === 6) {
        return isShortCastleValid(
          color,
          isPieceMoved(color, pieceType),
          isPieceMoved(
            color,
            color === 'white' ? 'Rook-K-W' : 'Rook-K-B'
          )
        );
      }
      
      // Roque longo.
      if (newCol === 2) {
        return isLongCastleValid(
          color,
          isPieceMoved(color, pieceType),
          isPieceMoved(
            color,
            color === 'white' ? 'Rook-Q-W' : 'Rook-Q-B'
          )
        );
      }
      
      return false;
    }
    
    // Movimentos normais continuam com a validação existente.
    if (!isValidMove(piece, newRow, newCol)) {
      return false;
    }
    
    return isMoveKingSafe(piece, newRow, newCol);
  }
  
  
  function hasLegalMoves(color) {
    return legalMovesRule(color, canMovePiece);
  }
  
  function isCheckmate(color) {
    return checkmateRule(color, hasLegalMoves);
  }
  
  function isStalemate(color) {
    return stalemateRule(color, hasLegalMoves);
  }
  
  function movePiece(piece, newRow, newCol, silent = false) {
    const currentRow = parseInt(piece.dataset.row);
    const currentCol = parseInt(piece.dataset.col);
    const color = piece.classList.contains('white') ? 'white' : 'black';
    
    const currentSquare = document.querySelector(
      `[data-row="${currentRow}"][data-col="${currentCol}"]`
    );
    
    const newSquare = document.querySelector(
      `[data-row="${newRow}"][data-col="${newCol}"]`
    );
    
    const isPieceInOriginalPosition = currentSquare.contains(piece);
    let capturedPiece = null;
    
    if (!canMovePiece(piece, newRow, newCol)) {
      return false;
    }
    
    const previousEnPassantTarget = enPassantTarget;
    
    const isEnPassantMove =
      piece.dataset.type === 'Pawn' &&
      previousEnPassantTarget !== null &&
      newRow === previousEnPassantTarget.row &&
      newCol === previousEnPassantTarget.col &&
      Math.abs(newCol - currentCol) === 1 &&
      !isOccupiedSquare(newRow, newCol);
    
    const isPawnDoubleMove =
      piece.dataset.type === 'Pawn' &&
      Math.abs(newRow - currentRow) === 2 &&
      currentCol === newCol;
    
    // A oportunidade anterior de En Passant expira após este movimento
    enPassantTarget = null;
    
    if (isPieceInOriginalPosition) {
      capturedPiece = newSquare.firstChild;
      
      // Captura por En Passant
      if (isEnPassantMove) {
        const capturedPawnSquare = document.querySelector(
          `[data-row="${previousEnPassantTarget.pawnRow}"][data-col="${previousEnPassantTarget.pawnCol}"]`
        );
        
        capturedPiece = capturedPawnSquare.firstChild;
      }
      
      // Movimento normal ou captura
      newSquare.appendChild(piece);
      piece.dataset.row = newRow;
      piece.dataset.col = newCol;
      currentSquare.innerHTML = '';
      
      // Criar oportunidade de En Passant após avanço duplo
      if (isPawnDoubleMove) {
        const forwardDirection = piece.classList.contains('white') ?
          -1 :
          1;
        
        enPassantTarget = {
          row: currentRow + forwardDirection,
          col: currentCol,
          pawnRow: newRow,
          pawnCol: newCol
        };
      }
      
    }
    
    // Registrar movimentação do rei e das torres
    if (piece.dataset.type === 'King-W' && piece.classList.contains('white')) {
      WkingMoved = true;
    }
    
    if (piece.dataset.type === 'King-B' && piece.classList.contains('black')) {
      BkingMoved = true;
    }
    
    if (piece.dataset.type === 'Rook-Q-W' && piece.classList.contains('white')) {
      WQrookMoved = true;
    }
    
    if (piece.dataset.type === 'Rook-K-W' && piece.classList.contains('white')) {
      WKrookMoved = true;
    }
    
    if (piece.dataset.type === 'Rook-Q-B' && piece.classList.contains('black')) {
      BQrookMoved = true;
    }
    
    if (piece.dataset.type === 'Rook-K-B' && piece.classList.contains('black')) {
      BKrookMoved = true;
    }
    
    
    
    // Captura de peça adversária
    if (capturedPiece) {
      const capturedType = capturedPiece.dataset.type;
      const capturedRow = Number(capturedPiece.dataset.row);
      const capturedCol = Number(capturedPiece.dataset.col);
      
      // Revogar o direito da torre original capturada. No Chess960,
      // sua coluna inicial pode ser qualquer uma das oito.
      const lostRight = capturedOriginalRookRight(capturedPiece, capturedRow, chessVariant);
      if (lostRight === 'WKrookMoved') WKrookMoved = true;
      if (lostRight === 'WQrookMoved') WQrookMoved = true;
      if (lostRight === 'BKrookMoved') BKrookMoved = true;
      if (lostRight === 'BQrookMoved') BQrookMoved = true;
      
      registerCapturedPiece(capturedPiece, color);
      capturedPiece.remove();
    }
    
    // PROMOÇÃO DO PEÃO
    // A escolha da peça será feita pelo painel de promoção
    if (
      piece.dataset.type === 'Pawn' &&
      isPromotionRow(newRow, piece.classList)
    ) {
      if (capturedPiece) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
      
      showPromotionPanel(piece, newRow, newCol);
      return true;
    }
    // Verificar se a jogada colocou o adversário em xeque.
    const opponentColor = color === 'white' ?
      'black' :
      'white';
    
    if (!silent) {
      if (isCheck(opponentColor)) {
        playCheckSound();
        console.log(`${opponentColor} está em xeque!`);
      } else if (capturedPiece) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    }
    
    return true;
  }
  
  function restartGame(returnToMenu = true) {
    void archivePendingFinishedGame();
    const wasArchivedReview = reviewingArchivedGame;
    reviewingArchivedGame = false;
    chessVariant = "classic";
    chess960Position = 518;
    analysisMode = false;
    officialFinalState = null;
    analysisUndo = [];
    analysisRedo = [];
    gameGeneration++;
    chessAI.stop();
    aiBusy = false;
    cancelDrag();
    // Limpar seleções e destaques
    selectedPiece = null;
    pendingPromotionNotation = null;
    pendingPromotionSAN = null;
    drawOfferAvailable = false;
    drawAgreementOverlay.hidden = true;
    resignOverlay.hidden = true;
    
    clearHighlightedSquares();
    clearHighlightedSquaresCapture();
    gameHistory.reset();
    
    renderMoveHistory();
    renderCapturedPieces();
    updatePanelsVisibility();
    
    halfmoveClock = 0;
    
    updateUndoButton();
    updateDrawButton();
    
    // Restaurar os jogadores
    currentPlayer = 'white';
    currentPlayer2 = 'black';
    resetClocks();
    
    // Restaurar o En Passant
    enPassantTarget = null;
    
    // Restaurar os direitos de roque
    WkingMoved = false;
    BkingMoved = false;
    
    WKrookMoved = false;
    WQrookMoved = false;
    
    BKrookMoved = false;
    BQrookMoved = false;
    
    // Restaurar o estado da partida
    gameOver = false;
    gameResult = '*';
    resultRegistered = false;
    currentGameId = crypto.randomUUID();
    
    // Restaurar a promoção
    resetPromotion();
    
    // Fechar a tela de encerramento
    checkmateOverlay.hidden = true;
    showFinishedResultBtn.hidden = true;
    
    // Remover o tabuleiro anterior
    chessboard.innerHTML = '';
    
    // Criar um novo tabuleiro
    createBoard({ variant: chessVariant, chess960Position });
    positionHistory = [getPositionKey()];
    
    updateUndoButton();
    updateDrawButton();
    
    chessboard.classList.remove('black-perspective');
    
    if (returnToMenu) {
      sessionActive = false;
      if (!wasArchivedReview) gameStorage.clearSavedGame();
      updateContinueButton();
      gameMenu.showMenu();
    }
    
    console.log('Nova partida iniciada!');
  }
  
  function registerMove(color, notation, san = null) {
    gameHistory.registerMove(color, notation, san);
    
    renderMoveHistory();
    updatePanelsVisibility();
  }
  
  
  function jumpToHistoryMove(moveIndex) {
    if (!analysisMode || !officialFinalState) return;
    if (isPromotionPending()) return;
    
    const targetCount = moveIndex + 1;
    const finalCount = officialFinalState.moveHistory.length;
    
    if (targetCount < 0 || targetCount > finalCount) return;
    
    // Procurar a posição correspondente na linha do tempo oficial.
    const targetIndex = replayStates.findIndex(state =>
      state.moveHistory.length === targetCount
    );
    
    if (targetIndex === -1) {
      console.warn('Posição não encontrada no histórico:', targetCount);
      return;
    }
    
    // Recuperar o histórico original, descartando jogadas
    // experimentais feitas durante a análise.
    const targetState = structuredClone(replayStates[targetIndex]);
    
    analysisUndo = structuredClone(
      replayStates.slice(0, targetIndex)
    );
    
    analysisRedo = structuredClone(
      replayStates.slice(targetIndex + 1).reverse()
    );
    
    replayNavigating = true;
    
    restoreGameState(targetState);
    stopClock();
    
    replayNavigating = false;
    
    const move = officialFinalState.moveHistory[moveIndex];
    playHistoryMoveSound(move);
  }
  
  
  
  function jumpToReplayStart() {
    if (!analysisMode || !officialFinalState) return;
    
    if (gameHistory.getMoveHistory().length === 0) return;
    
    jumpToHistoryMove(-1);
    
    // Apenas um som ao voltar para a posição inicial.
    playMoveSound();
  }
  
  function jumpToReplayEnd() {
    if (!analysisMode || !officialFinalState) return;
    
    const lastMoveIndex =
      officialFinalState.moveHistory.length - 1;
    
    if (
      gameHistory.getMoveHistory().length ===
      officialFinalState.moveHistory.length
    ) return;
    
    // O áudio já é reproduzido por jumpToHistoryMove().
    jumpToHistoryMove(lastMoveIndex);
  }
  
  replayStartBtn.addEventListener('click', jumpToReplayStart);
  replayEndBtn.addEventListener('click', jumpToReplayEnd);
  
  
  function renderMoveHistory() {
    const moveHistory = analysisMode && officialFinalState ?
      officialFinalState.moveHistory :
      gameHistory.getMoveHistory();
    
    const currentMoveCount = gameHistory.getMoveHistory().length;
    
    moveHistoryList.innerHTML = '';
    
    for (let i = 0; i < moveHistory.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'history-row';
      
      const number = document.createElement('span');
      number.className = 'history-number';
      number.textContent = `${Math.floor(i / 2) + 1}.`;
      
      const whiteMove = document.createElement('span');
      whiteMove.className = 'history-move';
      whiteMove.textContent = moveHistory[i]?.notation || '';
      
      const blackMove = document.createElement('span');
      blackMove.className = 'history-move';
      blackMove.textContent = moveHistory[i + 1]?.notation || '';
      
      if (analysisMode) {
        [whiteMove, blackMove].forEach((element, offset) => {
          const moveIndex = i + offset;
          
          if (moveIndex >= moveHistory.length) return;
          
          element.classList.add('history-clickable');
          
          if (moveIndex === currentMoveCount - 1) {
            element.classList.add('history-active');
          }
          
          element.addEventListener('click', () => {
            jumpToHistoryMove(moveIndex);
          });
        });
      }
      
      row.append(number, whiteMove, blackMove);
      moveHistoryList.appendChild(row);
    }
    
    if (!analysisMode) {
      moveHistoryList.scrollLeft = moveHistoryList.scrollWidth;
    }
  }
  
  
  // Som de clique nos controles da interface
  
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    if (!(target instanceof Element)) return;
    
    const control = target.closest(
      'button, select, input, label, [role="button"]'
    );
    
    if (!control) return;
    
    // Desfazer e refazer utilizam os sons do tabuleiro.
    if (
      control.closest(
        '#undo-move-btn, #redo-move-btn, ' +
        '#replay-start-btn, #replay-end-btn'
      )
    ) {
      return;
    }
    
    // Evitar som em controles desabilitados.
    if (
      control.matches(':disabled') ||
      control.getAttribute('aria-disabled') === 'true'
    ) {
      return;
    }
    
    playClickSound();
  }, true);
  
  
  restartGameBtn.addEventListener('click', () => {
    restartGame();
  });
  
  setupOnlineLobby();

  const gameMenu = createGameMenu({
    onStart: (settings) => {
      const session = normalizeChessSession(settings);
      sessionActive = false;
      restartGame(false);
      chessVariant = session.variant;
      chess960Position = session.chess960Position;
      if (chessVariant === 'chess960') {
        chessboard.innerHTML = '';
        createBoard({ variant: chessVariant, chess960Position });
        positionHistory = [getPositionKey()];
      }
      gameMode = settings.mode;
      humanColor = settings.boardColor;
      aiSkillSetting = settings.aiSkill;
      aiMoveTimeSetting = settings.aiMoveTime;
      aiHashSetting = settings.aiHash;
      aiLimitEloSetting = settings.aiLimitElo;
      aiEloSetting = settings.aiElo;
      initialTimeSetting = settings.initialTime;
      chessAI.setSkillLevel(settings.aiSkill);
      chessAI.setAdvancedOptions({ hash: aiHashSetting, limitStrength: aiLimitEloSetting, elo: aiEloSetting });
      chessAI.setChess960(chessVariant === 'chess960');
      incrementTimeSetting = settings.incrementTime ?? 0;
      if (gameMode === 'computer') chessAI.initialize().catch(console.error);
      
      setInitialTime(settings.initialTime);
      setIncrementTime(incrementTimeSetting);
      
      chessboard.classList.toggle(
        'black-perspective',
        settings.boardColor === 'black'
      );
      
      sessionActive = true;
      persistGame();
      scheduleComputerTurn();
      console.log('Nova partida configurada:', settings);
    }
  });
  
  document.addEventListener('chess:open-finished-game', async (event) => {
    const game = await loadFinishedGame(event.detail?.id);
    if (!game || !Array.isArray(game.states) || !game.states.length) return;
    gameGeneration++;
    chessAI.stop();
    aiBusy = false;
    cancelDrag();
    resetPromotion();
    stopClock();
    sessionActive = false; // A revisão nunca substitui uma partida em andamento no localStorage.
    reviewingArchivedGame = true;
    gameMode = game.mode;
    humanColor = game.humanColor ?? 'white';
    chessVariant = game.variant ?? 'classic';
    chess960Position = game.chess960Position ?? 518;
    chessboard.classList.toggle('black-perspective', humanColor === 'black');
    officialFinalState = structuredClone(game.finalState);
    replayStates = structuredClone(game.states);
    analysisUndo = structuredClone(replayStates.slice(0, -1));
    analysisRedo = [];
    analysisMode = true;
    replayNavigating = false;
    restoreGameState(officialFinalState);
    stopClock();
    checkmateOverlay.hidden = true;
    showFinishedResultBtn.hidden = false;
    moveHistoryPanel.hidden = false;
    updateUndoButton();
    gameMenu.showGame();
  });

  document.getElementById('continue-game-btn').addEventListener('click', continueSavedGame);
  updateContinueButton();
  updateClockDisplay();
  
});