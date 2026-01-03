// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#00ffff', // I - Cyan
    '#0000ff', // J - Blue
    '#ff8000', // L - Orange
    '#ffff00', // O - Yellow
    '#00ff00', // S - Green
    '#800080', // T - Purple
    '#ff0000'  // Z - Red
];

// Tetromino shapes
const SHAPES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

// Game state
let canvas, ctx, nextCanvas, nextCtx;
let board, currentPiece, nextPiece;
let score, level, lines;
let gameLoop, dropCounter, dropInterval;
let lastTime = 0;
let isPaused = false;
let isGameOver = false;
let isPlaying = false;

// Initialize game
function init() {
    canvas = document.getElementById('tetris');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('next-piece');
    nextCtx = nextCanvas.getContext('2d');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.addEventListener('keydown', handleKeyPress);

    resetGame();
}

function resetGame() {
    board = createBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    dropCounter = 0;
    isGameOver = false;
    isPaused = false;
    updateDisplay();
}

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    isPlaying = true;
    resetGame();
    spawnPiece();
    lastTime = performance.now();
    gameLoop = requestAnimationFrame(update);
}

function restartGame() {
    document.getElementById('game-over').classList.add('hidden');
    startGame();
}

function spawnPiece() {
    if (!nextPiece) {
        nextPiece = createPiece();
    }
    currentPiece = nextPiece;
    nextPiece = createPiece();

    // Center the piece
    currentPiece.x = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentPiece.y = 0;

    // Check for game over
    if (checkCollision()) {
        gameOver();
    }

    drawNextPiece();
}

function createPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    return {
        shape: SHAPES[type].map(row => [...row]),
        type: type,
        x: 0,
        y: 0
    };
}

function update(time = 0) {
    if (!isPlaying || isGameOver) return;

    if (!isPaused) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;

        if (dropCounter > dropInterval) {
            drop();
        }

        draw();
    }

    gameLoop = requestAnimationFrame(update);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }

    // Draw board
    drawBoard();

    // Draw ghost piece
    drawGhostPiece();

    // Draw current piece
    if (currentPiece) {
        drawPiece(currentPiece, currentPiece.x, currentPiece.y);
    }
}

function drawBoard() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, COLORS[board[y][x]]);
            }
        }
    }
}

function drawPiece(piece, offsetX, offsetY, alpha = 1) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(ctx, offsetX + x, offsetY + y, COLORS[value], alpha);
            }
        });
    });
}

function drawBlock(context, x, y, color, alpha = 1) {
    const size = context === nextCtx ? 20 : BLOCK_SIZE;
    context.globalAlpha = alpha;

    // Main block
    context.fillStyle = color;
    context.fillRect(x * size, y * size, size - 1, size - 1);

    // Highlight
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(x * size, y * size, size - 1, size / 4);

    // Shadow
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(x * size, y * size + size * 0.75, size - 1, size / 4);

    context.globalAlpha = 1;
}

function drawGhostPiece() {
    if (!currentPiece) return;

    let ghostY = currentPiece.y;
    while (!checkCollision(0, ghostY - currentPiece.y + 1)) {
        ghostY++;
    }

    if (ghostY !== currentPiece.y) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.strokeStyle = COLORS[value];
                    ctx.lineWidth = 2;
                    ctx.strokeRect(
                        (currentPiece.x + x) * BLOCK_SIZE + 2,
                        (ghostY + y) * BLOCK_SIZE + 2,
                        BLOCK_SIZE - 5,
                        BLOCK_SIZE - 5
                    );
                }
            });
        });
    }
}

function drawNextPiece() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const offsetX = (5 - nextPiece.shape[0].length) / 2;
        const offsetY = (5 - nextPiece.shape.length) / 2;

        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(nextCtx, offsetX + x, offsetY + y, COLORS[value]);
                }
            });
        });
    }
}

function handleKeyPress(event) {
    if (!isPlaying || isGameOver) return;

    switch (event.keyCode) {
        case 37: // Left
            move(-1);
            break;
        case 39: // Right
            move(1);
            break;
        case 40: // Down
            drop();
            break;
        case 38: // Up - Rotate
            rotate();
            break;
        case 32: // Space - Hard drop
            hardDrop();
            break;
        case 80: // P - Pause
            togglePause();
            break;
    }
}

function move(dir) {
    if (!checkCollision(dir, 0)) {
        currentPiece.x += dir;
    }
}

function drop() {
    if (!checkCollision(0, 1)) {
        currentPiece.y++;
    } else {
        lockPiece();
        clearLines();
        spawnPiece();
    }
    dropCounter = 0;
}

function hardDrop() {
    while (!checkCollision(0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    lockPiece();
    clearLines();
    spawnPiece();
    updateDisplay();
}

function rotate() {
    const originalShape = currentPiece.shape;
    const rows = currentPiece.shape.length;
    const cols = currentPiece.shape[0].length;

    // Create rotated shape
    const rotated = Array.from({ length: cols }, (_, i) =>
        Array.from({ length: rows }, (_, j) => currentPiece.shape[rows - 1 - j][i])
    );

    currentPiece.shape = rotated;

    // Wall kick - try to adjust position if collision
    const kicks = [0, -1, 1, -2, 2];
    let valid = false;

    for (const kick of kicks) {
        if (!checkCollision(kick, 0)) {
            currentPiece.x += kick;
            valid = true;
            break;
        }
    }

    if (!valid) {
        currentPiece.shape = originalShape;
    }
}

function checkCollision(offsetX = 0, offsetY = 0) {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = value;
                }
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check same row again
        }
    }

    if (linesCleared > 0) {
        // Scoring: 100, 300, 500, 800 for 1, 2, 3, 4 lines
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;

        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }

        updateDisplay();
    }
}

function updateDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
        lastTime = performance.now();
    }
}

function gameOver() {
    isGameOver = true;
    isPlaying = false;
    cancelAnimationFrame(gameLoop);
    document.getElementById('game-over').classList.remove('hidden');
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
