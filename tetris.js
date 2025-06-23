// Variables del juego
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const explosionContainer = document.getElementById('explosionContainer');

// Variables para récords
let highScores = [];
const MAX_HIGHSCORES = 5;

// Variables para contador de usuarios únicos
let currentUserId = null;
let uniqueUsersCount = 0;

// Variables para audio
let audioContext;
let masterVolume = 0.15; // Volumen más bajo y sutil
let soundEnabled = true;

// Configuración del juego
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const COLORS = [
    '#000000', // Vacío
    '#FF6B6B', // Rojo
    '#4ECDC4', // Turquesa
    '#45B7D1', // Azul
    '#96CEB4', // Verde
    '#FFEAA7', // Amarillo
    '#DDA0DD', // Púrpura
    '#98D8C8'  // Verde claro
];

// Estados del juego
let gameState = {
    board: [],
    currentPiece: null,
    nextPiece: null,
    score: 0,
    lines: 0,
    level: 1,
    gameRunning: false,
    gamePaused: false,
    dropTime: 0,
    lastTime: 0
};

// Formas de las piezas (Tetrominos)
const PIECES = [
    // I
    {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: 1
    },
    // O
    {
        shape: [
            [2, 2],
            [2, 2]
        ],
        color: 2
    },
    // T
    {
        shape: [
            [0, 3, 0],
            [3, 3, 3],
            [0, 0, 0]
        ],
        color: 3
    },
    // S
    {
        shape: [
            [0, 4, 4],
            [4, 4, 0],
            [0, 0, 0]
        ],
        color: 4
    },
    // Z
    {
        shape: [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0]
        ],
        color: 5
    },
    // J
    {
        shape: [
            [6, 0, 0],
            [6, 6, 6],
            [0, 0, 0]
        ],
        color: 6
    },
    // L
    {
        shape: [
            [0, 0, 7],
            [7, 7, 7],
            [0, 0, 0]
        ],
        color: 7
    }
];

// Inicializar el juego
function initGame() {
    // Crear tablero vacío
    gameState.board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    gameState.score = 0;
    gameState.lines = 0;
    gameState.level = 1;
    gameState.dropTime = 0;
    gameState.lastTime = 0;
    
    // Generar primera pieza
    gameState.currentPiece = createPiece();
    gameState.nextPiece = createPiece();
    
    updateDisplay();
}

// Crear nueva pieza
function createPiece() {
    const piece = JSON.parse(JSON.stringify(PIECES[Math.floor(Math.random() * PIECES.length)]));
    return {
        shape: piece.shape,
        color: piece.color,
        x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

// Dibujar bloque
function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
    const colorValue = COLORS[color];
    
    // No dibujar bloques vacíos
    if (color === 0) return;
    
    // Sombra exterior más suave
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 3, y + 3, size, size);
    
    // Base del bloque con gradiente radial
    const baseGradient = ctx.createRadialGradient(
        x + size/2, y + size/2, 0,
        x + size/2, y + size/2, size/2
    );
    baseGradient.addColorStop(0, lightenColor(colorValue, 20));
    baseGradient.addColorStop(0.7, colorValue);
    baseGradient.addColorStop(1, darkenColor(colorValue, 30));
    
    ctx.fillStyle = baseGradient;
    ctx.fillRect(x, y, size, size);
    
    // Efecto de bisel 3D - Top
    ctx.fillStyle = lightenColor(colorValue, 40);
    ctx.fillRect(x, y, size, 3);
    
    // Efecto de bisel 3D - Left
    ctx.fillStyle = lightenColor(colorValue, 30);
    ctx.fillRect(x, y, 3, size);
    
    // Efecto de bisel 3D - Bottom
    ctx.fillStyle = darkenColor(colorValue, 40);
    ctx.fillRect(x, y + size - 3, size, 3);
    
    // Efecto de bisel 3D - Right
    ctx.fillStyle = darkenColor(colorValue, 30);
    ctx.fillRect(x + size - 3, y, 3, size);
    
    // Brillo interior superior izquierdo
    const highlightGradient = ctx.createLinearGradient(x, y, x + size/2, y + size/2);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(x + 3, y + 3, size/2, size/2);
    
    // Textura con patrón de puntos
    drawBlockTexture(ctx, x, y, size, color);
    
    // Borde exterior
    ctx.strokeStyle = darkenColor(colorValue, 50);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
    
    // Borde interior brillante
    ctx.strokeStyle = lightenColor(colorValue, 60);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
}

// Función para aclarar color
function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Función para oscurecer color
function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
        (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
        (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
}

// Función para dibujar textura en el bloque
function drawBlockTexture(ctx, x, y, size, color) {
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Patrón de textura según el color
    switch(color) {
        case 1: // Rojo - Patrón de ladrillos
            drawBrickPattern(ctx, x, y, size);
            break;
        case 2: // Turquesa - Patrón de cristal
            drawCrystalPattern(ctx, x, y, size);
            break;
        case 3: // Azul - Patrón de metal
            drawMetalPattern(ctx, x, y, size);
            break;
        case 4: // Verde - Patrón de circuitos
            drawCircuitPattern(ctx, x, y, size);
            break;
        case 5: // Amarillo - Patrón de energía
            drawEnergyPattern(ctx, x, y, size);
            break;
        case 6: // Púrpura - Patrón de gemas
            drawGemPattern(ctx, x, y, size);
            break;
        case 7: // Verde claro - Patrón de naturaleza
            drawNaturePattern(ctx, x, y, size);
            break;
    }
}

// Patrón de ladrillos
function drawBrickPattern(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.lineWidth = 1;
    
    // Líneas horizontales
    for (let i = 0; i < 3; i++) {
        const yPos = y + (i + 1) * size/4;
        ctx.beginPath();
        ctx.moveTo(x + 4, yPos);
        ctx.lineTo(x + size - 4, yPos);
        ctx.stroke();
    }
    
    // Líneas verticales intercaladas
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + size/4);
    ctx.lineTo(x + size/2, y + size/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + size/2, y + 3*size/4);
    ctx.lineTo(x + size/2, y + size);
    ctx.stroke();
}

// Patrón de cristal
function drawCrystalPattern(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Líneas de cristal
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + size - 6, y + size - 6);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + size - 6, y + 6);
    ctx.lineTo(x + 6, y + size - 6);
    ctx.stroke();
    
    // Puntos brillantes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX - 4, centerY - 4, 1, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX + 4, centerY + 4, 1, 0, 2 * Math.PI);
    ctx.fill();
}

// Patrón de metal
function drawMetalPattern(ctx, x, y, size) {
    // Líneas de metal pulido
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 6 + i * 5);
        ctx.lineTo(x + size - 4, y + 6 + i * 5);
        ctx.stroke();
    }
    
    // Remaches
    ctx.fillStyle = 'rgba(169, 169, 169, 0.6)';
    ctx.beginPath();
    ctx.arc(x + 6, y + 6, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + size - 6, y + 6, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + 6, y + size - 6, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + size - 6, y + size - 6, 2, 0, 2 * Math.PI);
    ctx.fill();
}

// Patrón de circuitos
function drawCircuitPattern(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Líneas de circuito
    ctx.beginPath();
    ctx.moveTo(x + 4, centerY);
    ctx.lineTo(centerX - 2, centerY);
    ctx.lineTo(centerX - 2, y + 4);
    ctx.lineTo(centerX + 2, y + 4);
    ctx.lineTo(centerX + 2, centerY);
    ctx.lineTo(x + size - 4, centerY);
    ctx.stroke();
    
    // Puntos de conexión
    ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fill();
}

// Patrón de energía
function drawEnergyPattern(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Rayos de energía
    ctx.beginPath();
    ctx.moveTo(centerX - 6, centerY - 2);
    ctx.lineTo(centerX + 2, centerY - 6);
    ctx.lineTo(centerX - 2, centerY);
    ctx.lineTo(centerX + 6, centerY + 2);
    ctx.lineTo(centerX + 2, centerY + 6);
    ctx.lineTo(centerX - 2, centerY);
    ctx.stroke();
    
    // Núcleo brillante
    ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fill();
}

// Patrón de gemas
function drawGemPattern(ctx, x, y, size) {
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Facetas de gema
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(centerX, y + 4);
    ctx.lineTo(x + 4, centerY);
    ctx.lineTo(centerX, y + size - 4);
    ctx.lineTo(x + size - 4, centerY);
    ctx.closePath();
    ctx.stroke();
    
    // Brillo de gema
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(centerX, y + 4);
    ctx.lineTo(x + 4, centerY);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fill();
}

// Patrón de naturaleza
function drawNaturePattern(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(34, 139, 34, 0.4)';
    ctx.lineWidth = 1;
    
    const centerX = x + size/2;
    const centerY = y + size/2;
    
    // Hojas
    ctx.beginPath();
    ctx.ellipse(centerX - 3, centerY - 3, 3, 6, Math.PI/4, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(centerX + 3, centerY + 3, 3, 6, -Math.PI/4, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Tallo
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 2);
    ctx.lineTo(centerX, centerY + 2);
    ctx.stroke();
}

// Dibujar tablero
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar bloques del tablero
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (gameState.board[row][col] !== 0) {
                drawBlock(ctx, col * BLOCK_SIZE, row * BLOCK_SIZE, gameState.board[row][col]);
            }
        }
    }
    
    // Dibujar grilla
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
}

// Dibujar pieza actual
function drawCurrentPiece() {
    if (!gameState.currentPiece) return;
    
    const piece = gameState.currentPiece;
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col] !== 0) {
                drawBlock(ctx, 
                    (piece.x + col) * BLOCK_SIZE, 
                    (piece.y + row) * BLOCK_SIZE, 
                    piece.color
                );
            }
        }
    }
}

// Dibujar siguiente pieza
function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!gameState.nextPiece) return;
    
    const piece = gameState.nextPiece;
    const blockSize = 20;
    const offsetX = (nextCanvas.width - piece.shape[0].length * blockSize) / 2;
    const offsetY = (nextCanvas.height - piece.shape.length * blockSize) / 2;
    
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col] !== 0) {
                drawBlock(nextCtx, 
                    offsetX + col * blockSize, 
                    offsetY + row * blockSize, 
                    piece.color,
                    blockSize
                );
            }
        }
    }
}

// Verificar colisión
function isValidPosition(piece, deltaX = 0, deltaY = 0, newShape = null) {
    const shape = newShape || piece.shape;
    const newX = piece.x + deltaX;
    const newY = piece.y + deltaY;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col] !== 0) {
                const boardX = newX + col;
                const boardY = newY + row;
                
                // Verificar límites
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                
                // Verificar colisión con bloques existentes
                if (boardY >= 0 && gameState.board[boardY][boardX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Rotar pieza
function rotatePiece(piece) {
    const newShape = piece.shape[0].map((_, i) => 
        piece.shape.map(row => row[i]).reverse()
    );
    return newShape;
}

// Colocar pieza en el tablero
function placePiece() {
    const piece = gameState.currentPiece;
    
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col] !== 0) {
                const boardY = piece.y + row;
                const boardX = piece.x + col;
                
                if (boardY >= 0) {
                    gameState.board[boardY][boardX] = piece.color;
                }
            }
        }
    }
}

// Crear explosión espectacular
function createExplosion(row) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.top = (row * BLOCK_SIZE) + 'px';
    explosion.style.left = '0px';
    explosionContainer.appendChild(explosion);
    
    // Crear flash de línea
    const lineFlash = document.createElement('div');
    lineFlash.className = 'line-flash';
    lineFlash.style.top = (row * BLOCK_SIZE) + 'px';
    explosion.appendChild(lineFlash);
    
    // Crear partículas de explosión
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'explosion-particle';
        
        // Posición inicial aleatoria en la línea
        const startX = Math.random() * canvas.width;
        particle.style.left = startX + 'px';
        particle.style.top = '11px'; // Centro de la línea
        
        // Dirección aleatoria
        const angle = Math.random() * 2 * Math.PI;
        const speed = 50 + Math.random() * 100;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        
        // Color aleatorio para la partícula
        const colors = ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#45b7d1'];
        particle.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]}, #fff)`;
        
        explosion.appendChild(particle);
    }
    
    // Crear fuegos artificiales adicionales
    setTimeout(() => {
        for (let i = 0; i < 10; i++) {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = Math.random() * canvas.width + 'px';
            firework.style.top = (row * BLOCK_SIZE + Math.random() * 60 - 30) + 'px';
            explosion.appendChild(firework);
        }
    }, 200);
    
    // Remover la explosión después de la animación
    setTimeout(() => {
        explosion.remove();
    }, 2000);
    
    // Efecto de vibración de pantalla
    document.querySelector('.game-container').classList.add('screen-shake');
    setTimeout(() => {
        document.querySelector('.game-container').classList.remove('screen-shake');
    }, 500);
}

// Limpiar líneas completas
function clearLines() {
    let linesCleared = 0;
    const completedRows = [];
    
    // Encontrar líneas completas
    for (let row = ROWS - 1; row >= 0; row--) {
        if (gameState.board[row].every(cell => cell !== 0)) {
            completedRows.push(row);
        }
    }
    
    if (completedRows.length > 0) {
        // Reproducir sonido según el número de líneas
        if (completedRows.length >= 4) {
            playTetrisSound(); // Sonido especial para Tetris
        } else {
            playExplosionSound();
        }
        
        // Crear explosiones para cada línea
        completedRows.forEach((row, index) => {
            setTimeout(() => {
                createExplosion(row);
            }, index * 100); // Delay escalonado para múltiples líneas
        });
        
        // Esperar a que termine la animación antes de limpiar
        setTimeout(() => {
            // Remover líneas completas
            completedRows.forEach(row => {
                gameState.board.splice(row, 1);
                gameState.board.unshift(Array(COLS).fill(0));
            });
            
            linesCleared = completedRows.length;
            gameState.lines += linesCleared;
            
            // Calcular puntuación
            const linePoints = [0, 100, 300, 500, 800];
            gameState.score += linePoints[linesCleared] * gameState.level;
            
            // Incrementar nivel
            gameState.level = Math.floor(gameState.lines / 10) + 1;
            
            updateDisplay();
        }, 600);
    }
    
    return linesCleared;
}

// Actualizar display
function updateDisplay() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lines').textContent = gameState.lines;
    document.getElementById('level').textContent = gameState.level;
}

// Mover pieza
function movePiece(deltaX, deltaY) {
    if (isValidPosition(gameState.currentPiece, deltaX, deltaY)) {
        gameState.currentPiece.x += deltaX;
        gameState.currentPiece.y += deltaY;
        
        // Sonido de movimiento solo horizontal
        if (deltaX !== 0) {
            playMoveSound();
        }
        
        return true;
    }
    return false;
}

// Rotar pieza actual
function rotateCurrentPiece() {
    const rotatedShape = rotatePiece(gameState.currentPiece);
    if (isValidPosition(gameState.currentPiece, 0, 0, rotatedShape)) {
        gameState.currentPiece.shape = rotatedShape;
        playRotateSound();
    }
}

// Soltar pieza
function dropPiece() {
    while (movePiece(0, 1)) {
        gameState.score += 1;
    }
}

// Verificar game over
function checkGameOver() {
    return !isValidPosition(gameState.currentPiece);
}

// Siguiente pieza
function nextPiece() {
    placePiece();
    playDropSound();
    clearLines();
    
    gameState.currentPiece = gameState.nextPiece;
    gameState.nextPiece = createPiece();
    
    if (checkGameOver()) {
        endGame();
    }
}

// Terminar juego
function endGame() {
    gameState.gameRunning = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLines').textContent = gameState.lines;
    
    // Verificar si es un nuevo récord
    if (isNewHighScore(gameState.score)) {
        playRecordSound();
        showNewRecordNotice();
        showRecordModal();
    } else {
        playGameOverSound();
        document.getElementById('gameOverScreen').style.display = 'flex';
    }
}

// Loop principal del juego
function gameLoop(time = 0) {
    if (!gameState.gameRunning || gameState.gamePaused) {
        return;
    }
    
    const deltaTime = time - gameState.lastTime;
    gameState.lastTime = time;
    gameState.dropTime += deltaTime;
    
    // Velocidad de caída basada en el nivel
    const dropInterval = Math.max(50, 500 - (gameState.level - 1) * 50);
    
    if (gameState.dropTime > dropInterval) {
        if (!movePiece(0, 1)) {
            nextPiece();
        }
        gameState.dropTime = 0;
    }
    
    // Dibujar todo
    drawBoard();
    drawCurrentPiece();
    drawNextPiece();
    
    requestAnimationFrame(gameLoop);
}

// Controles del teclado
document.addEventListener('keydown', (e) => {
    if (!gameState.gameRunning || gameState.gamePaused) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                gameState.score += 1;
            }
            break;
        case 'ArrowUp':
            rotateCurrentPiece();
            break;
        case ' ':
            dropPiece();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
    
    updateDisplay();
});

// Controles de botones
document.getElementById('startBtn').addEventListener('click', () => {
    playButtonSound();
    startGame();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    playButtonSound();
    togglePause();
});

document.getElementById('restartBtn').addEventListener('click', () => {
    playButtonSound();
    restartGame();
});

document.getElementById('playAgainBtn').addEventListener('click', () => {
    playButtonSound();
    document.getElementById('gameOverScreen').style.display = 'none';
    startGame();
});

// Funciones de control
function startGame() {
    initGame();
    gameState.gameRunning = true;
    gameState.gamePaused = false;
    gameState.lastTime = 0;
    
    // Ocultar aviso de nuevo récord
    document.getElementById('newRecordNotice').style.display = 'none';
    
    // Inicializar audio si no está inicializado
    if (!audioContext) {
        initAudio();
    }
    
    // Reproducir música de fondo (opcional)
    // playBackgroundMusic();
    
    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (!gameState.gameRunning) return;
    
    gameState.gamePaused = !gameState.gamePaused;
    if (!gameState.gamePaused) {
        gameState.lastTime = 0;
        requestAnimationFrame(gameLoop);
    }
}

function restartGame() {
    gameState.gameRunning = false;
    gameState.gamePaused = false;
    document.getElementById('gameOverScreen').style.display = 'none';
    startGame();
}

// ===== FUNCIONES DE AUDIO =====

// Inicializar contexto de audio
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API no soportada');
        soundEnabled = false;
    }
}

// Crear oscilador con envelope suave
function createOscillator(frequency, type = 'sine', duration = 0.1, volume = 1) {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    // Envelope más suave y gradual
    const finalVolume = masterVolume * volume;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(finalVolume * 0.3, audioContext.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(finalVolume, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Sonido de movimiento de pieza (muy sutil)
function playMoveSound() {
    createOscillator(280, 'sine', 0.08, 0.4);
}

// Sonido de rotación de pieza (suave)
function playRotateSound() {
    createOscillator(350, 'sine', 0.12, 0.5);
    setTimeout(() => createOscillator(420, 'sine', 0.08, 0.3), 40);
}

// Sonido de pieza colocada (grave y suave)
function playDropSound() {
    createOscillator(150, 'sine', 0.2, 0.6);
}

// Sonido de línea completada (explosión suave)
function playExplosionSound() {
    if (!soundEnabled || !audioContext) return;
    
    // Sonido suave de satisfacción en lugar de explosión agresiva
    createOscillator(200, 'sine', 0.3, 0.7);
    setTimeout(() => createOscillator(250, 'sine', 0.25, 0.5), 80);
    setTimeout(() => createOscillator(300, 'sine', 0.2, 0.3), 150);
    
    // Efecto de campanita sutil
    setTimeout(() => {
        createOscillator(400, 'sine', 0.15, 0.4);
        createOscillator(600, 'sine', 0.1, 0.2);
    }, 200);
}

// Sonido de múltiples líneas (Tetris) - melodía suave
function playTetrisSound() {
    // Acorde armónico suave y satisfactorio
    createOscillator(261, 'sine', 0.6, 0.5); // Do
    setTimeout(() => createOscillator(329, 'sine', 0.5, 0.4), 100); // Mi
    setTimeout(() => createOscillator(392, 'sine', 0.4, 0.3), 200); // Sol
    setTimeout(() => createOscillator(523, 'sine', 0.3, 0.2), 300); // Do octava
    
    // Campanitas suaves de celebración
    setTimeout(() => {
        createOscillator(659, 'sine', 0.2, 0.3);
        createOscillator(784, 'sine', 0.15, 0.2);
    }, 400);
}

// Sonido de Game Over (melancólico pero suave)
function playGameOverSound() {
    if (!soundEnabled || !audioContext) return;
    
    // Secuencia descendente suave y melancólica
    const frequencies = [392, 349, 311, 277, 247];
    frequencies.forEach((freq, index) => {
        setTimeout(() => {
            createOscillator(freq, 'sine', 0.8, 0.4);
        }, index * 300);
    });
}

// Sonido de nuevo récord (celebración suave)
function playRecordSound() {
    if (!soundEnabled || !audioContext) return;
    
    // Arpegio suave y elegante
    const melody = [261, 329, 392, 523, 659];
    melody.forEach((freq, index) => {
        setTimeout(() => {
            createOscillator(freq, 'sine', 0.4, 0.5);
            createOscillator(freq * 1.5, 'sine', 0.3, 0.2); // Armonía sutil
        }, index * 120);
    });
}

// Sonido de botón/UI (click suave)
function playButtonSound() {
    createOscillator(500, 'sine', 0.08, 0.4);
    setTimeout(() => createOscillator(600, 'sine', 0.06, 0.3), 30);
}

// Música de fondo (opcional)
function playBackgroundMusic() {
    if (!soundEnabled || !audioContext) return;
    
    // Tetris theme simplificado
    const melody = [
        659, 494, 523, 587, 523, 494, 440, 440, 523, 659, 587, 523, 494, 494, 523, 587, 659, 523, 440, 440
    ];
    
    let currentNote = 0;
    const playNote = () => {
        if (gameState.gameRunning && currentNote < melody.length) {
            createOscillator(melody[currentNote], 'square', 0.4);
            currentNote = (currentNote + 1) % melody.length;
            setTimeout(playNote, 500);
        }
    };
    
    // Iniciar después de un pequeño delay
    setTimeout(playNote, 1000);
}

// Toggle de sonido
function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
        soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    }
}

// ===== FUNCIONES DE USUARIOS ÚNICOS =====

// Generar ID único para el usuario
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Inicializar usuario único
async function initUniqueUser() {
    // Verificar si el usuario ya tiene un ID
    currentUserId = localStorage.getItem('tetrisUserId');
    
    if (!currentUserId) {
        // Es un usuario nuevo
        currentUserId = generateUserId();
        localStorage.setItem('tetrisUserId', currentUserId);
        
        // Incrementar contador de usuarios únicos
        uniqueUsersCount++;
        
        // Guardar automáticamente el nuevo contador
        await saveHighScores();
        
        // Mostrar animación de nuevo usuario
        showNewUserWelcome();
    }
    
    updateUniqueUsersDisplay();
}

// Mostrar bienvenida a nuevo usuario
function showNewUserWelcome() {
    const counter = document.getElementById('uniqueUsers');
    counter.style.animation = 'none';
    setTimeout(() => {
        counter.style.animation = 'newUserCelebration 1s ease-in-out';
    }, 10);
    
    // Resetear animación después
    setTimeout(() => {
        counter.style.animation = 'numberGlow 2s ease-in-out infinite alternate';
    }, 1000);
}

// Actualizar display del contador
function updateUniqueUsersDisplay() {
    const uniqueUsersElement = document.getElementById('uniqueUsers');
    if (uniqueUsersElement) {
        // Animación de contador subiendo
        let currentDisplayed = parseInt(uniqueUsersElement.textContent) || 0;
        if (currentDisplayed < uniqueUsersCount) {
            const increment = () => {
                if (currentDisplayed < uniqueUsersCount) {
                    currentDisplayed++;
                    uniqueUsersElement.textContent = currentDisplayed;
                    setTimeout(increment, 50);
                }
            };
            increment();
        } else {
            uniqueUsersElement.textContent = uniqueUsersCount;
        }
    }
}

// Obtener estadísticas de usuario
function getUserStats() {
    return {
        userId: currentUserId,
        isNewUser: localStorage.getItem('tetrisUserId') === currentUserId,
        totalUniqueUsers: uniqueUsersCount,
        userNumber: uniqueUsersCount
    };
}

// ===== FUNCIONES DE RÉCORDS =====

// Clave de encriptación simple (en un proyecto real usarías algo más seguro)
const ENCRYPTION_KEY = 'TetrisClassic2024!@#$';

// Función simple de encriptación/desencriptación XOR
function encryptDecrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

// Convertir a Base64 para hacer el texto más "ilegible"
function encodeBase64(str) {
    return btoa(encodeURIComponent(str));
}

function decodeBase64(str) {
    try {
        return decodeURIComponent(atob(str));
    } catch (e) {
        return null;
    }
}

// Cargar récords y datos del juego automáticamente
async function loadHighScores() {
    highScores = [];
    
    try {
        // Primero intentar cargar desde localStorage encriptado
        const encryptedSaved = localStorage.getItem('tetrisHighScoresEncrypted');
        if (encryptedSaved) {
            const base64Data = decodeBase64(encryptedSaved);
            if (base64Data) {
                const decryptedData = encryptDecrypt(base64Data, ENCRYPTION_KEY);
                const parsed = JSON.parse(decryptedData);
                
                // Verificar si es el nuevo formato con objeto completo
                if (parsed.highScores && Array.isArray(parsed.highScores)) {
                    highScores = parsed.highScores;
                    uniqueUsersCount = parsed.uniqueUsersCount || 0;
                    console.log('Datos completos cargados desde localStorage encriptado');
                    displayHighScores();
                    updateUniqueUsersDisplay();
                    return;
                } else if (Array.isArray(parsed)) {
                    // Formato antiguo (solo récords)
                    highScores = parsed;
                    console.log('Récords cargados desde localStorage encriptado (formato antiguo)');
                    displayHighScores();
                    return;
                }
            }
        }
        
        // Fallback: intentar cargar desde archivo records.dat
        const response = await fetch('records.dat');
        if (response.ok) {
            const encryptedData = await response.text();
            if (encryptedData.trim()) {
                const base64Data = decodeBase64(encryptedData);
                if (base64Data) {
                    const decryptedData = encryptDecrypt(base64Data, ENCRYPTION_KEY);
                    const parsed = JSON.parse(decryptedData);
                    
                    // Verificar si es el nuevo formato con objeto completo
                    if (parsed.highScores && Array.isArray(parsed.highScores)) {
                        highScores = parsed.highScores;
                        uniqueUsersCount = parsed.uniqueUsersCount || 0;
                        console.log('Datos completos cargados desde archivo');
                        displayHighScores();
                        updateUniqueUsersDisplay();
                        return;
                    } else if (Array.isArray(parsed)) {
                        // Formato antiguo (solo récords)
                        highScores = parsed;
                        console.log('Récords cargados desde archivo (formato antiguo)');
                        displayHighScores();
                        return;
                    }
                }
            }
        }
        
        // Último fallback: localStorage normal
        const saved = localStorage.getItem('tetrisHighScores');
        if (saved) {
            highScores = JSON.parse(saved);
            console.log('Récords cargados desde localStorage normal');
        }
        
        // Cargar contador de usuarios desde localStorage normal si no se cargó antes
        const savedUsers = localStorage.getItem('tetrisUniqueUsers');
        if (savedUsers && uniqueUsersCount === 0) {
            uniqueUsersCount = parseInt(savedUsers) || 0;
        }
        
    } catch (error) {
        console.log('Error al cargar datos del juego, usando valores por defecto');
        highScores = [];
        uniqueUsersCount = 0;
    }
    
    displayHighScores();
    updateUniqueUsersDisplay();
}

// Guardar récords y datos del juego automáticamente
async function saveHighScores() {
    try {
        // Crear objeto completo con récords y estadísticas
        const gameData = {
            highScores: highScores,
            uniqueUsersCount: uniqueUsersCount,
            lastUpdated: new Date().toISOString()
        };
        
        const jsonData = JSON.stringify(gameData);
        const encryptedData = encryptDecrypt(jsonData, ENCRYPTION_KEY);
        const base64Data = encodeBase64(encryptedData);
        
        // Guardar en localStorage encriptado como respaldo principal
        localStorage.setItem('tetrisHighScoresEncrypted', base64Data);
        
        // También guardar en localStorage normal para compatibilidad
        localStorage.setItem('tetrisHighScores', JSON.stringify(highScores));
        localStorage.setItem('tetrisUniqueUsers', uniqueUsersCount.toString());
        
        // Intentar actualizar el archivo records.dat automáticamente
        await updateRecordsFile(base64Data);
        
    } catch (error) {
        console.error('Error al guardar datos del juego:', error);
        // Fallback básico
        localStorage.setItem('tetrisHighScores', JSON.stringify(highScores));
        localStorage.setItem('tetrisUniqueUsers', uniqueUsersCount.toString());
    }
}

// Actualizar archivo de récords silenciosamente
async function updateRecordsFile(data) {
    try {
        // Crear un blob con los datos
        const blob = new Blob([data], { type: 'application/octet-stream' });
        
        // En un entorno real, esto requeriría permisos especiales del navegador
        // Por ahora solo mantenemos los datos en localStorage
        console.log('Récords guardados automáticamente');
        
    } catch (error) {
        console.log('Guardado automático en localStorage solamente');
    }
}



// Verificar si es un nuevo récord
function isNewHighScore(score) {
    if (highScores.length < MAX_HIGHSCORES) return true;
    return score > highScores[highScores.length - 1].score;
}

// Mostrar aviso de nuevo récord
function showNewRecordNotice() {
    document.getElementById('newRecordNotice').style.display = 'block';
}

// Mostrar modal de récord
function showRecordModal() {
    document.getElementById('recordScore').textContent = gameState.score;
    document.getElementById('recordModal').style.display = 'flex';
    
    // Limpiar el input y darle foco
    const playerNameInput = document.getElementById('playerName');
    playerNameInput.value = '';
    playerNameInput.focus();
}

// Ocultar modal de récord
function hideRecordModal() {
    document.getElementById('recordModal').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    // Limpiar el input del nombre
    document.getElementById('playerName').value = '';
}

// Agregar nuevo récord
async function addHighScore(name, score, lines) {
    console.log('addHighScore recibió - name:', name, 'score:', score, 'lines:', lines);
    const trimmedName = name.trim() || 'Anónimo';
    console.log('Nombre después de trim:', trimmedName);
    
    const newRecord = {
        name: trimmedName,
        score: score,
        lines: lines,
        date: new Date().toLocaleDateString('es-ES')
    };
    
    console.log('Nuevo récord creado:', newRecord);
    
    highScores.push(newRecord);
    highScores.sort((a, b) => b.score - a.score);
    
    if (highScores.length > MAX_HIGHSCORES) {
        highScores = highScores.slice(0, MAX_HIGHSCORES);
    }
    
    await saveHighScores();
    displayHighScores();
}

// Mostrar lista de récords
function displayHighScores() {
    const container = document.getElementById('highscoresList');
    
    if (highScores.length === 0) {
        container.innerHTML = '<div class="no-records">¡Sé el primero en anotar!</div>';
        return;
    }
    
    let html = '';
    highScores.forEach((record, index) => {
        const rank = index + 1;
        html += `
            <div class="highscore-item">
                <span class="highscore-rank">#${rank}</span>
                <span class="highscore-name">${record.name}</span>
                <span class="highscore-score">${record.score.toLocaleString()}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}



// ===== EVENT LISTENERS PARA RÉCORDS =====

// Controles del modal de récord
document.getElementById('saveRecordBtn').addEventListener('click', async () => {
    playButtonSound();
    
    // Capturar el valor antes de cualquier otra operación
    const playerNameInput = document.getElementById('playerName');
    const playerName = playerNameInput.value;
    console.log('Nombre capturado:', playerName, 'Longitud:', playerName.length);
    
    // Cerrar el modal primero
    hideRecordModal();
    
    // Luego guardar el récord
    await addHighScore(playerName, gameState.score, gameState.lines);
});

document.getElementById('skipRecordBtn').addEventListener('click', () => {
    playButtonSound();
    hideRecordModal();
});

// Permitir Enter para guardar récord
document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('saveRecordBtn').click();
    }
});



// Botón de sonido
document.getElementById('soundBtn').addEventListener('click', () => {
    toggleSound();
});

// ===== CONTROLES TÁCTILES PARA MÓVIL =====

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchMoved = false;

const SWIPE_THRESHOLD = 50; // Distancia mínima para considerar un swipe
const TAP_THRESHOLD = 10; // Distancia máxima para considerar un tap
const LONG_TAP_DURATION = 500; // Duración para tap largo (ms)

// Inicializar controles táctiles
function initTouchControls() {
    const gameCanvas = document.getElementById('gameCanvas');
    
    // Prevenir comportamientos por defecto del navegador
    gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    gameCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    gameCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevenir zoom y scroll en el área de juego
    document.addEventListener('touchmove', (e) => {
        if (e.target === gameCanvas) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevenir el menú contextual en móviles
    gameCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

function handleTouchStart(e) {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    touchMoved = false;
}

function handleTouchMove(e) {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Marcar como movido si supera el umbral
    if (deltaX > TAP_THRESHOLD || deltaY > TAP_THRESHOLD) {
        touchMoved = true;
    }
}

function handleTouchEnd(e) {
    if (!gameState.gameStarted || gameState.gameOver || gameState.paused) return;
    
    e.preventDefault();
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (!touchMoved) {
        // Es un TAP
        if (deltaTime > LONG_TAP_DURATION) {
            // TAP LARGO - Soltar pieza
            dropPiece();
            vibrateFeedback(100); // Vibración fuerte para drop
            showTouchFeedback('DROP', touch.clientX, touch.clientY);
            console.log('Touch: Drop piece (long tap)');
        } else {
            // TAP CORTO - Rotar pieza
            rotateCurrentPiece();
            vibrateFeedback(50); // Vibración suave para rotación
            showTouchFeedback('ROTATE', touch.clientX, touch.clientY);
            console.log('Touch: Rotate piece (tap)');
        }
    } else {
        // Es un SWIPE
        if (absDeltaX > absDeltaY && absDeltaX > SWIPE_THRESHOLD) {
            // SWIPE HORIZONTAL
            if (deltaX > 0) {
                // Swipe derecha
                movePiece(1, 0);
                vibrateFeedback(30);
                showTouchFeedback('→', touch.clientX, touch.clientY);
                console.log('Touch: Move right (swipe)');
            } else {
                // Swipe izquierda
                movePiece(-1, 0);
                vibrateFeedback(30);
                showTouchFeedback('←', touch.clientX, touch.clientY);
                console.log('Touch: Move left (swipe)');
            }
        } else if (absDeltaY > absDeltaX && absDeltaY > SWIPE_THRESHOLD) {
            // SWIPE VERTICAL
            if (deltaY > 0) {
                // Swipe abajo - bajar rápido
                movePiece(0, 1);
                vibrateFeedback(25);
                showTouchFeedback('↓', touch.clientX, touch.clientY);
                console.log('Touch: Move down (swipe)');
            }
            // Ignoramos swipe hacia arriba
        }
    }
}

// Vibración táctil (si está disponible)
function vibrateFeedback(duration) {
    if ('vibrate' in navigator) {
        navigator.vibrate(duration);
    }
}

// Feedback visual para gestos táctiles
function showTouchFeedback(action, x, y) {
    const feedback = document.createElement('div');
    feedback.className = 'touch-feedback';
    feedback.textContent = action;
    feedback.style.left = x + 'px';
    feedback.style.top = y + 'px';
    
    document.body.appendChild(feedback);
    
    // Remover después de la animación
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, 800);
}

// Inicializar cuando se carga la página
window.addEventListener('load', async () => {
    initGame();
    drawBoard();
    drawNextPiece();
    await loadHighScores();
    await initUniqueUser(); // Inicializar contador de usuarios únicos
    initTouchControls(); // Inicializar controles táctiles
}); 