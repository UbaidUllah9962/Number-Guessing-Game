'use strict';

// --- Difficulty settings ---
const DIFFICULTIES = {
  easy: { max: 10, score: 10 },
  medium: { max: 20, score: 20 },
  hard: { max: 100, score: 25 },
};

let currentDifficulty = 'medium';
let maxNumber = DIFFICULTIES[currentDifficulty].max;
let secretNumber = Math.trunc(Math.random() * maxNumber) + 1;
let score = DIFFICULTIES[currentDifficulty].score;
let highscores = { easy: 0, medium: 0, hard: 0 };
let guessHistory = [];
let guessCount = 0;
let timerInterval = null;
let elapsedSeconds = 0;
let gameActive = true;

// --- DOM helpers ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const displayMessage = function (message, type) {
  const msgEl = $('.message');
  msgEl.textContent = message;
  msgEl.className = 'message';
  if (type) msgEl.classList.add(type);
};

// --- Timer ---
function startTimer() {
  stopTimer();
  elapsedSeconds = 0;
  $('.timer').textContent = '0s';
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    $('.timer').textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// --- Guess history ---
function addToHistory(guess, type) {
  guessHistory.push({ guess, type });
  renderHistory();
}

function renderHistory() {
  const historyEl = $('.history');
  if (guessHistory.length === 0) {
    historyEl.innerHTML = '<span class="history-empty">No guesses yet</span>';
    return;
  }
  historyEl.innerHTML = guessHistory
    .map(
      (item) =>
        `<span class="history-item ${item.type}">${item.guess}${item.type === 'high' ? '↓' : item.type === 'low' ? '↑' : '✓'}</span>`
    )
    .join('');
  historyEl.scrollTop = historyEl.scrollHeight;
}

// --- Confetti ---
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = [
    '#ffd200',
    '#f7971e',
    '#56ab2f',
    '#a8e063',
    '#667eea',
    '#764ba2',
    '#ff6b6b',
    '#54a0ff',
  ];

  for (let i = 0; i < 150; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frame > maxFrames) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.vy += 0.05;

      if (frame > maxFrames - 60) {
        p.opacity = Math.max(0, p.opacity - 0.02);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// --- Shake effect ---
function shakeInput() {
  const input = $('.guess');
  input.classList.add('shake');
  setTimeout(() => input.classList.remove('shake'), 500);
}

// --- Difficulty switching ---
$$('.btn-diff').forEach((btn) => {
  btn.addEventListener('click', function () {
    const level = this.dataset.level;
    if (level === currentDifficulty) return;

    $$('.btn-diff').forEach((b) => b.classList.remove('active'));
    this.classList.add('active');

    currentDifficulty = level;
    maxNumber = DIFFICULTIES[level].max;
    $('.max-number').textContent = maxNumber;
    resetGame();
  });
});

// --- Check guess ---
$('.check').addEventListener('click', function () {
  if (!gameActive) return;

  const guess = Number($('.guess').value);

  if (!guess || guess < 1 || guess > maxNumber) {
    displayMessage(`⛔ Enter a number between 1 and ${maxNumber}!`);
    shakeInput();
    return;
  }

  // Start timer on first guess
  if (guessCount === 0) {
    startTimer();
  }

  guessCount++;
  $('.guess-count').textContent = guessCount;

  if (guess === secretNumber) {
    // WIN
    gameActive = false;
    stopTimer();
    displayMessage('🎉 Correct Number!', 'win');
    $('.number').textContent = secretNumber;
    $('.number').classList.add('revealed');
    document.body.classList.add('won');

    if (score > highscores[currentDifficulty]) {
      highscores[currentDifficulty] = score;
      $('.highscore').textContent = highscores[currentDifficulty];
    }

    addToHistory(guess, 'correct');
    launchConfetti();
  } else if (guess !== secretNumber) {
    if (score > 1) {
      const isHigh = guess > secretNumber;
      displayMessage(
        isHigh ? '📈 Too high!' : '📉 Too low!',
        isHigh ? 'hint-high' : 'hint-low'
      );
      score--;
      $('.score').textContent = score;
      addToHistory(guess, isHigh ? 'high' : 'low');
      shakeInput();
    } else {
      // LOSE
      gameActive = false;
      stopTimer();
      displayMessage('💥 You lost the game!', 'lose');
      $('.score').textContent = 0;
      $('.number').textContent = secretNumber;
      $('.number').classList.add('revealed');
      document.body.classList.add('lost');
      addToHistory(guess, guess > secretNumber ? 'high' : 'low');
    }
  }

  // Clear input and re-focus
  $('.guess').value = '';
  $('.guess').focus();
});

// --- Keyboard: Enter to submit ---
$('.guess').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    $('.check').click();
  }
});

// --- Reset game ---
function resetGame() {
  gameActive = true;
  score = DIFFICULTIES[currentDifficulty].score;
  secretNumber = Math.trunc(Math.random() * maxNumber) + 1;
  guessHistory = [];
  guessCount = 0;
  stopTimer();
  elapsedSeconds = 0;

  displayMessage('Start guessing...');
  $('.score').textContent = score;
  $('.highscore').textContent = highscores[currentDifficulty];
  $('.number').textContent = '?';
  $('.number').classList.remove('revealed');
  $('.guess').value = '';
  $('.guess-count').textContent = '0';
  $('.timer').textContent = '0s';
  document.body.classList.remove('won', 'lost');
  renderHistory();
  $('.guess').focus();
}

$('.again').addEventListener('click', resetGame);

// --- Initial render ---
renderHistory();
$('.guess').focus();
