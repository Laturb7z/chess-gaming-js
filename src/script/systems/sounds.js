// som da peça depois que é movida

const moveSound = new Howl({
  src: ['assets/sounds/move.mp3'],
  volume: 1,
  preload: true,
  pool: 10
});

export function playMoveSound() {
  moveSound.play();
}

const clickSound = new Howl({
  src: ['assets/sounds/click.mp3'],
  volume: 1,
  preload: true,
  pool: 10
});

export function playClickSound() {
  clickSound.play();
}

// som da peça quando é capturada
export function playCaptureSound() {
  const sound = new Howl({
    src: ["assets/sounds/move-captured.mp3"],
    volume: 5,
  });
  sound.play();
}

// som do check
export function playCheckSound() {
  const sound = new Howl({
    src: ["assets/sounds/move-check.mp3"],
    volume: 5,
  });
  sound.play();
}

// som do movimento de roque curto

export function playCastlingSound(onEnd = null) {
  const sound = new Howl({
    src: ["assets/sounds/move-castling.mp3"],
    volume: 1,
    preload: true
  });
  
  sound.once('play', () => {
    if (typeof onEnd !== 'function') return;
    
    const duration = sound.duration() * 1000;
    
    // Antecipar o som de xeque em 150ms
    const delay = Math.max(0, duration - 300);
    
    setTimeout(() => {
      onEnd();
    }, delay);
  });
  
  sound.once('end', () => {
    sound.unload();
  });
  
  sound.play();
}

// som do click de relogios

export function playTimeSound() {
  const sound = new Howl({
    src: ["assets/sounds/click-time.mp3"],
    volume: 5,
  });
  sound.play();
}

export function playPromotionSound() {
  const sound = new Howl({
    src: ["assets/sounds/promote.mp3"],
    volume: 3,
  });

  sound.play();
}

export function PlayilegalSound() {
  const sound = new Howl({
    src: ["assets/sounds/move-ilegal.mp3"],
    volume: 5,
  });

  sound.play();
}

export function playCheckmateSound() {
  const sound = new Howl({
    src: ['assets/sounds/move-check.mp3'],
    volume: 5,
  });

  sound.play();
}


export function playVictorySound() {
  new Howl({
    src: ['assets/sounds/victory.mp3'],
    volume: 0.5,
  }).play();
}

export function playGameOverSound() {
  new Howl({
    src: ['assets/sounds/gameover.mp3'],
    volume: 0.5,
  }).play();
}

export function playDrawSound() {
  new Howl({
    src: ['assets/sounds/draw.mp3'],
    volume: 0.5,
  }).play();
}