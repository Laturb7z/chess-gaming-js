
export function createChessClock({
  initialTime = 10 * 60 * 1000,
  onTimeout = () => {}
} = {}) {
  
  let configuredTime = initialTime;
  let incrementTime = 0;

  const clockElements = {
    white: document.getElementById('white-clock'),
    black: document.getElementById('black-clock')
  };

  const timeDisplays = {
    white: document.getElementById('white-time'),
    black: document.getElementById('black-time')
  };

  let remainingTime = {
    white: initialTime,
    black: initialTime
  };

  let activePlayer = 'white';
  let clockRunning = false;
  let clockInterval = null;
  let lastClockUpdate = null;
  let timeoutTriggered = false;

  function formatTime(milliseconds) {
    const totalSeconds = Math.ceil(
      Math.max(0, milliseconds) / 1000
    );

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  function setInitialTime(milliseconds) {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return;
  }

  configuredTime = milliseconds;
  resetClocks();
}

function setIncrementTime(milliseconds) {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) return;

  incrementTime = milliseconds;
}

  function updateDisplay() {
    for (const color of ['white', 'black']) {
      timeDisplays[color].textContent =
        formatTime(remainingTime[color]);

      clockElements[color].classList.toggle(
        'active',
        clockRunning && activePlayer === color
      );

      clockElements[color].classList.toggle(
        'timeout',
        remainingTime[color] <= 0
      );
    }
  }

  function clearTimer() {
    if (clockInterval !== null) {
      clearInterval(clockInterval);
      clockInterval = null;
    }

    clockRunning = false;
    lastClockUpdate = null;
  }

  function syncClock() {
    if (!clockRunning) return;

    const now = performance.now();
    const elapsed = now - lastClockUpdate;

    lastClockUpdate = now;

    remainingTime[activePlayer] = Math.max(
      0,
      remainingTime[activePlayer] - elapsed
    );

    if (
      remainingTime[activePlayer] <= 0 &&
      !timeoutTriggered
    ) {
      timeoutTriggered = true;

      const loser = activePlayer;

      clearTimer();
      updateDisplay();

      onTimeout(loser);
      return;
    }

    updateDisplay();
  }

  function startClock() {
    if (clockRunning || timeoutTriggered) return;

    clockRunning = true;
    lastClockUpdate = performance.now();

    clockInterval = setInterval(syncClock, 100);

    updateDisplay();
  }

  
function stopClock() {
  clearTimer();
  updateDisplay();
}

  
function switchClock(player) {
  // Desconta o tempo utilizado pelo jogador anterior.
  syncClock();

  if (timeoutTriggered) return;

  // Adiciona o incremento somente após uma troca
  // efetiva de turno e com o relógio em andamento.
  if (clockRunning && activePlayer !== player) {
    remainingTime[activePlayer] += incrementTime;
  }

  activePlayer = player;

  lastClockUpdate = clockRunning
    ? performance.now()
    : null;

  updateDisplay();
}


  function resetClocks() {
    clearTimer();

    remainingTime = {
  white: configuredTime,
  black: configuredTime
};

    activePlayer = 'white';
    timeoutTriggered = false;

    updateDisplay();
  }

  function getClockState() {
    syncClock();

    return {
      remainingTime: { ...remainingTime },
      clockRunning,
      activePlayer,
      incrementTime
    };
  }

  function restoreClockState(state, canRun = true) {
    clearTimer();
    incrementTime = state.incrementTime ?? 0;

    remainingTime = { ...state.remainingTime };
    activePlayer = state.activePlayer;

    timeoutTriggered =
      remainingTime[activePlayer] <= 0;

    updateDisplay();

    if (
      state.clockRunning &&
      canRun &&
      !timeoutTriggered
    ) {
      startClock();
    }
  }

  function isClockRunning() {
    return clockRunning;
  }

  function isTimeExpired() {
    return timeoutTriggered;
  }

  updateDisplay();

  return {
    startClock,
    stopClock,
    switchClock,
    resetClocks,
    syncClock,
    getClockState,
    restoreClockState,
    isClockRunning,
    isTimeExpired,
    updateClockDisplay: updateDisplay,
  setInitialTime, setIncrementTime, };
}
