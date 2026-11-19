
const chessboard = document.getElementById("chessboard");

/**
 * Letras superiores e inferiores
 */
export function addLettersToBoard() {
  const lettersTop = document.createElement("div");
  lettersTop.className = "letters-top";
  lettersTop.style.gridArea = "1 / 2 / 2 / 10";

  const lettersBottom = document.createElement("div");
  lettersBottom.className = "letters-bottom";
  lettersBottom.style.gridArea = "10 / 2 / 11 / 10";

  for (let i = 0; i < 8; i++) {
    const letter = String.fromCharCode(65 + i);

    const top = document.createElement("div");
    top.className = "letter";
    top.textContent = letter;

    const bottom = document.createElement("div");
    bottom.className = "letter";
    bottom.textContent = letter;

    lettersTop.appendChild(top);
    lettersBottom.appendChild(bottom);
  }

  chessboard.appendChild(lettersTop);
  chessboard.appendChild(lettersBottom);
}

/**
 * Números laterais
 */
export function addNumbersToBoard() {
  const numbersLeft = document.createElement("div");
  numbersLeft.className = "numbers-left";
  numbersLeft.style.gridArea = "2 / 1 / 10 / 2";

  const numbersRight = document.createElement("div");
  numbersRight.className = "numbers-right";
  numbersRight.style.gridArea = "2 / 10 / 10 / 11";

  for (let i = 8; i >= 1; i--) {
    const left = document.createElement("div");
    left.className = "number";
    left.textContent = i;

    const right = document.createElement("div");
    right.className = "number";
    right.textContent = i;

    numbersLeft.appendChild(left);
    numbersRight.appendChild(right);
  }

  chessboard.appendChild(numbersLeft);
  chessboard.appendChild(numbersRight);
}
