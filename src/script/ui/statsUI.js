import { getFinishedGames, deleteFinishedGame, clearFinishedGames } from '../systems/finishedGames.js';
import {
  getGameStats,
  clearGameStats
} from '../systems/gameStats.js';

export function setupStatsUI() {
  const form = document.getElementById('game-menu-form');
  const openBtn = document.getElementById('open-stats-btn');
  const closeBtn = document.getElementById('close-stats-btn');
  const panel = document.getElementById('stats-panel');
  const clearStatsBtn = document.getElementById('clear-stats-btn');
  const finishedList = document.getElementById('finished-games-list');
const clearAllBtn = document.getElementById('clear-all-data-btn');
  const menuPanel = document.querySelector('#game-menu .menu-panel');
  const tabs = document.querySelectorAll('.stats-tab');
  
  const confirmOverlay = document.getElementById('stats-confirm-overlay');
  const confirmTitle = document.getElementById('stats-confirm-title');
  const confirmMessage = document.getElementById('stats-confirm-message');
  const confirmBtn = document.getElementById('stats-confirm-btn');
  const cancelBtn = document.getElementById('stats-cancel-btn');
  
  let pendingDeleteAction = null;
  
  function openStatsConfirm(title, message, action) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    pendingDeleteAction = action;
    confirmOverlay.hidden = false;
  }
  
  function closeStatsConfirm() {
    confirmOverlay.hidden = true;
    pendingDeleteAction = null;
  }
  
  cancelBtn.addEventListener('click', closeStatsConfirm);
  
  confirmBtn.addEventListener('click', () => {
    const action = pendingDeleteAction;
    closeStatsConfirm();
    
    if (action) action();
  });
  
  
  let selectedMode = 'computer';
  
  
  clearStatsBtn.addEventListener('click', () => {
    openStatsConfirm(
      'LIMPAR ESTATÍSTICAS?',
      'Vitórias, derrotas, empates e registros ' +
      'de partidas serão removidos permanentemente.',
      async () => {
        if (await clearFinishedGames() && clearGameStats()) {
          renderStats();
        } else {
          alert('Não foi possível limpar as estatísticas.');
        }
      }
    );
  });
  
  clearAllBtn.addEventListener('click', () => {
    openStatsConfirm(
      'LIMPAR TODOS OS DADOS?',
      'Todas as estatísticas e a partida salva ' +
      'neste navegador serão removidas.',
      async () => {
        if (!(await clearFinishedGames()) || !clearGameStats()) {
          alert('Não foi possível limpar as estatísticas.');
          return;
        }
        
        try {
          localStorage.removeItem('chess-gaming-js:save:v1');
          window.location.reload();
        } catch (error) {
          console.error('Erro ao limpar os dados:', error);
          alert('Erro ao remover o salvamento da partida.');
        }
      }
    );
  });
  
  function renderFinishedGames() {
    if (!finishedList) return;
    finishedList.replaceChildren();
    const games = getFinishedGames().filter(game => game.mode === selectedMode);
    if (!games.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Nenhuma partida encerrada arquivada neste modo.';
      finishedList.append(empty);
      return;
    }
    games.forEach(game => {
      const row = document.createElement('div');
      row.className = 'finished-game-row';
      const label = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${game.result} • ${game.variant === 'chess960' ? 'Chess960' : 'Clássico'}`;
      const date = document.createElement('small');
      date.textContent = ` ${new Date(game.endedAt).toLocaleString('pt-BR')} • ${game.moveCount ?? game.finalState?.moveHistory?.length ?? 0} lances`;
      label.append(title, date);
      const view = document.createElement('button');
      view.type = 'button';
      view.textContent = 'REVER';
      view.addEventListener('click', () => {
        panel.hidden = true;
        form.hidden = false;
        openBtn.hidden = false;
        menuPanel.classList.remove('stats-open');
        document.dispatchEvent(new CustomEvent('chess:open-finished-game', { detail: { id: game.id } }));
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'EXCLUIR';
      remove.addEventListener('click', () => openStatsConfirm(
        'EXCLUIR PARTIDA?', 'Esta partida arquivada será excluída. Os totais das estatísticas não serão alterados.',
        async () => { if (await deleteFinishedGame(game.id)) renderFinishedGames(); else alert('Não foi possível excluir.'); }
      ));
      row.append(label, view, remove);
      finishedList.append(row);
    });
  }

  document.addEventListener('chess:finished-games-updated', () => {
    if (!panel.hidden) renderFinishedGames();
  });

  function renderStats() {
    const stats = getGameStats();
    const data = stats?.[selectedMode] ?? (selectedMode === 'computer' ? {played:0,wins:0,losses:0,draws:0} : {played:0,whiteWins:0,blackWins:0,draws:0});
    
    const isComputer = selectedMode === 'computer';
    const wins = isComputer ? data.wins : data.whiteWins;
    const losses = isComputer ? data.losses : data.blackWins;
    
    document.getElementById('stats-played').textContent = data.played;
    document.getElementById('stats-wins').textContent = wins;
    document.getElementById('stats-losses').textContent = losses;
    document.getElementById('stats-draws').textContent = data.draws;
    
    document.getElementById('stats-wins-label').firstChild.textContent =
      isComputer ? 'Vitórias ' : 'Vitórias brancas ';
    
    document.getElementById('stats-losses-label').firstChild.textContent =
      isComputer ? 'Derrotas ' : 'Vitórias pretas ';
    
    const rate = data.played ?
      (wins / data.played * 100).toFixed(1) :
      '0';
    
    document.getElementById('stats-rate').textContent = `${rate}%`;
    
    renderFinishedGames();
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === selectedMode);
    });
  }
  
  openBtn.addEventListener('click', () => {
  renderStats();

  form.hidden = true;
  openBtn.hidden = true;
  panel.hidden = false;

  menuPanel.classList.add('stats-open');
});
  
  closeBtn.addEventListener('click', () => {
  panel.hidden = true;
  form.hidden = false;
  openBtn.hidden = false;

  menuPanel.classList.remove('stats-open');
});
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selectedMode = tab.dataset.mode;
      renderStats();
    });
  });
}