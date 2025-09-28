javascript
class ExpeditionAntarctica {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mapCanvas = document.getElementById('mapCanvas');
        this.mapCtx = this.mapCanvas.getContext('2d');
        
        this.socket = null;
        this.gameState = 'menu';
        this.player = null;
        this.players = new Map();
        this.researchItems = [];
        this.shelters = [];
        
        this.keys = {};
        this.camera = { x: 0, y: 0 };
        
        this.stats = {
            health: 100,
            warmth: 100,
            stamina: 100,
            research: 0,
            survivalTime: 0
        };
        
        this.weather = 'clear';
        this.gameTime = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.generateWorld();
        this.gameLoop();
    }

    setupEventListeners() {
        // Menu navigation
        document.getElementById('startGame').addEventListener('click', () => this.startSinglePlayer());
        document.getElementById('joinGame').addEventListener('click', () => this.showLobby());
        document.getElementById('howToPlay').addEventListener('click', () => this.showHowToPlay());
        document.getElementById('backToMenu').addEventListener('click', () => this.showMainMenu());
        document.getElementById('playAgain').addEventListener('click', () => this.startSinglePlayer());
        document.getElementById('menuFromGame').addEventListener('click', () => this.showMainMenu());
        document.getElementById('backToMenuFromLobby').addEventListener('click', () => this.showMainMenu());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Prevent arrow key scrolling
            if(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Window resize
        window.addEventListener('resize', () => this.setupCanvas());
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.mapCanvas.width = 200;
        this.mapCanvas.height = 200;
    }

    generateWorld() {
        // Generate shelters
        for (let i = 0; i < 5; i++) {
            this.shelters.push({
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                type: 'research_station'
            });
        }
        
        // Generate research items
        this.generateResearchItems();
    }

    generateResearchItems() {
        this.researchItems = [];
        const itemTypes = [
            { type: 'ice_core', color: '#4facfe', value: 10 },
            { type: 'meteorite', color: '#ff6b6b', value: 25 },
            { type: 'fossil', color: '#51cf66', value: 15 }
        ];
        
        for (let i = 0; i < 50; i++) {
            const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            this.researchItems.push({
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                type: itemType.type,
                color: itemType.color,
                value: itemType.value,
                id: Math.random().toString(36).substr(2, 9)
            });
        }
    }

    startSinglePlayer() {
        this.showScreen('gameScreen');
        this.gameState = 'playing';
        
        // Initialize player
        this.player = {
            x: 0,
            y: 0,
            speed: 3,
            size: 20,
            color: '#667eea',
            name: 'Explorer'
        };
        
        this.stats = {
            health: 100,
            warmth: 100,
            stamina: 100,
            research: 0,
            survivalTime: 0
        };
        
        this.gameTime = 0;
        this.startGameTimer();
        this.startSurvivalMechanics();
        
        // Play background music
        document.getElementById('backgroundMusic').volume = 0.3;
        document.getElementById('backgroundMusic').play();
    }

    startGameTimer() {
        setInterval(() => {
            this.gameTime++;
            this.stats.survivalTime = this.gameTime;
            this.updateTimeDisplay();
        }, 1000);
    }

    startSurvivalMechanics() {
        setInterval(() => {
            if (this.gameState !== 'playing') return;
            
            // Reduce warmth over time (faster in bad weather)
            let warmthLoss = 0.5;
            if (this.weather === 'blizzard') warmthLoss = 1.5;
            else if (this.weather === 'snow') warmthLoss = 1;
            
            this.stats.warmth = Math.max(0, this.stats.warmth - warmthLoss);
            
            // Take damage if too cold
            if (this.stats.warmth < 30) {
                this.stats.health = Math.max(0, this.stats.health - 0.5);
            }
            
            // Regenerate stamina
            if (!this.keys['shift']) {
                this.stats.stamina = Math.min(100, this.stats.stamina + 0.2);
            }
            
            // Check for game over
            if (this.stats.health <= 0) {
                this.gameOver();
            }
            
            this.updateHUD();
        }, 1000);
    }

    updateHUD() {
        document.getElementById('healthText').textContent = Math.floor(this.stats.health);
        document.getElementById('warmthText').textContent = Math.floor(this.stats.warmth);
        document.getElementById('staminaText').textContent = Math.floor(this.stats.stamina);
        document.getElementById('researchCounter').textContent = `Research: ${this.stats.research}`;
        
        document.getElementById('healthBar').style.width = `${this.stats.health}%`;
        document.getElementById('warmthBar').style.width = `${this.stats.warmth}%`;
        document.getElementById('staminaBar').style.width = `${this.stats.stamina}%`;
    }

    updateTimeDisplay() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('timeCounter').textContent = 
            `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.showScreen('gameOverScreen');
        
        document.getElementById('finalTime').textContent = 
            `${Math.floor(this.gameTime / 60).toString().padStart(2, '0')}:${(this.gameTime % 60).toString().padStart(2, '0')}`;
        document.getElementById('finalResearch').textContent = this.stats.research;
        document.getElementById('finalScore').textContent = this.stats.research * 10 + this.gameTime;
        
        document.getElementById('backgroundMusic').pause();
    }

    handleInput() {
        if (!this.player || this.gameState !== 'playing') return;
        
        let speed = this.player.speed;
        const isSprinting = this.keys['shift'] && this.stats.stamina > 0;
        
        if (isSprinting) {
            speed *= 1.5;
            this.stats.stamina = Math.max(0, this.stats.stamina - 0.5);
        }
        
        if (this.keys['w'] || this.keys['arrowup']) {
            this.player.y -= speed;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.player.y += speed;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.player.x -= speed;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.player.x += speed;
        }
        
        // Update camera to follow player
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;
    }

    checkCollisions() {
        // Check research item collisions
        for (let i = this.researchItems.length - 1; i >= 0; i--) {
            const item = this.researchItems[i];
            const distance = Math.sqrt(
                Math.pow(this.player.x - item.x, 2) + 
                Math.pow(this.player.y - item.y, 2)
            );
            
            if (distance < this.player.size + 10) {
                this.collectResearchItem(item, i);
            }
        }
        
        // Check shelter collisions (warm up)
        for (const shelter of this.shelters) {
            const distance = Math.sqrt(
                Math.pow(this.player.x - shelter.x, 2) + 
                Math.pow(this.player.y - shelter.y, 2)
            );
            
            if (distance < this.player.size + 50) {
                this.stats.warmth = Math.min(100, this.stats.warmth + 1);
            }
        }
    }

    collectResearchItem(item, index) {
        this.stats.research += item.value;
        this.researchItems.splice(index, 1);
        
        // Play collection sound
        const sound = document.getElementById('collectSound');
        sound.currentTime = 0;
        sound.play();
        
        // Regenerate some health and warmth
        this.stats.health = Math.min(100, this.stats.health + 5);
        this.stats.warmth = Math.min(100, this.stats.warmth + 10);
        
        // Occasionally spawn new items
        if (this.researchItems.length < 30) {
            this.generateResearchItems();
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid for reference
        this.drawGrid();
        
        // Draw shelters
        this.drawShelters();
        
        // Draw research items
        this.drawResearchItems();
        
        // Draw player
        this.drawPlayer();
        
        // Draw other players (in multiplayer)
        this.drawOtherPlayers();
        
        // Draw weather effects
        this.drawWeather();
        
        // Draw minimap
        this.drawMinimap();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        const gridSize = 100;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        
        for (let x = startX; x < this.camera.x + this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - this.camera.x, 0);
            this.ctx.lineTo(x - this.camera.x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = startY; y < this.camera.y + this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y - this.camera.y);
            this.ctx.lineTo(this.canvas.width, y - this.camera.y);
            this.ctx.stroke();
        }
    }

    drawPlayer() {
        if (!this.player) return;
        
        const screenX = this.player.x - this.camera.x;
        const screenY = this.player.y - this.camera.y;
        
        // Draw player as a circle
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, this.player.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw player direction indicator
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY);
        this.ctx.lineTo(screenX, screenY - this.player.size - 10);
        this.ctx.stroke();
    }

    drawResearchItems() {
        for (const item of this.researchItems) {
            const screenX = item.x - this.camera.x;
            const screenY = item.y - this.camera.y;
            
            // Only draw if on screen
            if (screenX > -50 && screenX < this.canvas.width + 50 && 
                screenY > -50 && screenY < this.canvas.height + 50) {
                
                this.ctx.fillStyle = item.color;
                this.ctx.beginPath();
                
                switch (item.type) {
                    case 'ice_core':
                        this.ctx.rect(screenX - 8, screenY - 8, 16, 16);
                        break;
                    case 'meteorite':
                        this.ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
                        break;
                    case 'fossil':
                        this.ctx.ellipse(screenX, screenY, 12, 8, 0, 0, Math.PI * 2);
                        break;
                }
                
                this.ctx.fill();
                
                // Add glow effect
                this.ctx.shadowColor = item.color;
                this.ctx.shadowBlur = 10;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    }

    drawShelters() {
        for (const shelter of this.shelters) {
            const screenX = shelter.x - this.camera.x;
            const screenY = shelter.y - this.camera.y;
            
            this.ctx.fillStyle = '#ffa726';
            this.ctx.fillRect(screenX - 25, screenY - 25, 50, 50);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SHELTER', screenX, screenY + 40);
        }
    }

    drawWeather() {
        if (this.weather === 'snow' || this.weather === 'blizzard') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            for (let i = 0; i < 100; i++) {
                const x = (Math.random() * this.canvas.width + this.gameTime * 2) % this.canvas.width;
                const y = (Math.random() * this.canvas.height + this.gameTime * 5) % this.canvas.height;
                const size = this.weather === 'blizzard' ? 3 : 2;
                this.ctx.fillRect(x, y, size, size);
            }
        }
    }

    drawMinimap() {
        this.mapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.mapCtx.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
        
        const scale = 0.05;
        const centerX = this.mapCanvas.width / 2;
        const centerY = this.mapCanvas.height / 2;
        
        // Draw player on minimap
        this.mapCtx.fillStyle = this.player.color;
        this.mapCtx.fillRect(centerX - 2, centerY - 2, 4, 4);
        
        // Draw research items on minimap
        for (const item of this.researchItems) {
            const mapX = centerX + (item.x - this.player.x) * scale;
            const mapY = centerY + (item.y - this.player.y) * scale;
            
            if (mapX >= 0 && mapX <= this.mapCanvas.width && mapY >= 0 && mapY <= this.mapCanvas.height) {
                this.mapCtx.fillStyle = item.color;
                this.mapCtx.fillRect(mapX - 1, mapY - 1, 2, 2);
            }
        }
        
        // Draw shelters on minimap
        for (const shelter of this.shelters) {
            const mapX = centerX + (shelter.x - this.player.x) * scale;
            const mapY = centerY + (shelter.y - this.player.y) * scale;
            
            this.mapCtx.fillStyle = '#ffa726';
            this.mapCtx.fillRect(mapX - 2, mapY - 2, 4, 4);
        }
    }

    drawOtherPlayers() {
        // In single player, this would be empty
        // In multiplayer, draw other connected players
    }

    gameLoop() {
        this.handleInput();
        this.checkCollisions();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    // Screen management
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showMainMenu() {
        this.showScreen('mainMenu');
        this.gameState = 'menu';
        document.getElementById('backgroundMusic').pause();
    }

    showHowToPlay() {
        this.showScreen('howToPlayScreen');
    }

    showLobby() {
        this.showScreen('lobbyScreen');
    }

    // Multiplayer functions (simplified)
    connectToServer() {
        this.socket = io('https://your-game-server.com'); // Replace with your server URL
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('gameState', (state) => {
            this.handleGameState(state);
        });
        
        this.socket.on('playerJoined', (player) => {
            this.players.set(player.id, player);
        });
        
        this.socket.on('playerLeft', (playerId) => {
            this.players.delete(playerId);
        });
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new ExpeditionAntarctica();
});

// Service Worker for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
}
