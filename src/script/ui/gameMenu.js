import { getChess960Position, getRandomChess960Position } from "../chess960/chess960.js";
import { setupStatsUI } from './statsUI.js';

export function createGameMenu({ onStart }) {
  const menu = document.getElementById('game-menu');
  setupStatsUI();
  const form = document.getElementById('game-menu-form');
  const gameLayout = document.getElementById('game-layout');
  const difficultySection = document.getElementById('difficulty-section');
  const modeInputs = form.querySelectorAll('input[name="game-mode"]');
  const variantInputs = form.querySelectorAll('input[name="chess-variant"]');
  const chess960Config = document.getElementById('chess960-config');
  const skillInput = document.getElementById('ai-difficulty');
  const skillButtons = [...form.querySelectorAll('.difficulty-option')];
  skillButtons.forEach(button => button.addEventListener('click', () => {
    skillInput.value = button.dataset.skill;
    skillButtons.forEach(option => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  }));

  const moveTimeInput = document.getElementById('ai-move-time');
  const eloInput = document.getElementById('ai-elo');
  const limitEloInput = document.getElementById('ai-limit-elo');
  const eloControls = document.getElementById('ai-elo-controls');
  function refreshAdvancedSettings() {
    document.getElementById('ai-move-time-value').textContent =
      `${(Number(moveTimeInput.value) / 1000).toFixed(1).replace('.', ',')} s`;
    document.getElementById('ai-elo-value').textContent = eloInput.value;
    eloControls.hidden = !limitEloInput.checked;
  }
  [moveTimeInput, eloInput, limitEloInput].forEach(input =>
    input.addEventListener('input', refreshAdvancedSettings));
  refreshAdvancedSettings();

  // Chess960 disponível inicialmente para partidas locais entre duas pessoas.
  const positionInput = document.getElementById('chess960-position');
  const positionPreview = document.getElementById('chess960-preview');
  const randomizePosition = document.getElementById('chess960-randomize');
  function updatePositionPreview() {
    const value = Number(positionInput.value);
    if (!Number.isInteger(value) || value < 0 || value > 959 || positionInput.value.trim() === '') {
      positionPreview.textContent = 'Digite uma posição inteira entre 0 e 959.';
      return;
    }
    const symbols = { King: 'R', Queen: 'D', Bishop: 'B', Knight: 'C', 'Rook-Q': 'T', 'Rook-K': 'T' };
    positionPreview.textContent = `Posição ${value}: ${getChess960Position(value).map(piece => symbols[piece]).join(' ')}`;
  }
  positionInput.addEventListener('input', () => { positionInput.setCustomValidity(''); updatePositionPreview(); });
  randomizePosition.addEventListener('click', () => {
    positionInput.value = String(getRandomChess960Position());
    updatePositionPreview();
  });
  updatePositionPreview();

  function updateDifficultyVisibility() {
    difficultySection.hidden = form.querySelector('input[name="game-mode"]:checked')?.value !== 'computer';
  }
  modeInputs.forEach(input => input.addEventListener('change', updateDifficultyVisibility));
  updateDifficultyVisibility();

  function updateChess960Visibility() {
    chess960Config.hidden = form.querySelector('input[name="chess-variant"]:checked')?.value !== 'chess960';
  }
  variantInputs.forEach(input => input.addEventListener('change', updateChess960Visibility));
  updateChess960Visibility();

  
function getSettings() {
  const data = new FormData(form);

  const selectedColor = data.get('board-color');

  const boardColor = selectedColor === 'random'
    ? Math.random() < 0.5 ? 'white' : 'black'
    : selectedColor;

  const selectedTime = form.querySelector(
    'input[name="game-time"]:checked'
  );

  return {
    mode: data.get('game-mode'),
    variant: data.get('chess-variant') ?? 'classic',
    chess960Position: Number(positionInput.value),
    aiSkill: Number(data.get('ai-difficulty') ?? 0),
    aiMoveTime: Number(data.get('ai-move-time') ?? 600),
    aiHash: Number(data.get('ai-hash') ?? 32),
    aiLimitElo: limitEloInput.checked,
    aiElo: Number(data.get('ai-elo') ?? 1600),
    boardColor,
    initialTime: Number(selectedTime?.value ?? 600000),
    incrementTime: Number(selectedTime?.dataset.increment ?? 0)
  };
}


  function showMenu() {
    menu.hidden = false;
    gameLayout.hidden = true;
  }

  function showGame() {
    menu.hidden = true;
    gameLayout.hidden = false;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = getSettings();
    if (settings.variant === 'chess960') {
      if (!Number.isInteger(settings.chess960Position) || settings.chess960Position < 0 || settings.chess960Position > 959 || positionInput.value.trim() === '') {
        positionInput.setCustomValidity('Escolha uma posição entre 0 e 959.');
        positionInput.reportValidity();
        return;
      }
    }
    positionInput.setCustomValidity('');
    onStart(settings);
    showGame();
  });

  showMenu();

  return {
    showMenu,
    showGame
  };
}
