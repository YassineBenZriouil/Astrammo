class Game {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Load images
        this.playerImage = new Image();
        this.playerImage.src = "assets/Gray Ship.png";
        this.enemyImage = new Image();
        this.enemyImage.src = "assets/Red Ship.png";

        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            width: 40,
            height: 60,
            speed: 0, // Current speed
            maxSpeed: 8, // Maximum speed
            acceleration: 0.5, // How fast the ship speeds up
            deceleration: 0.5, // How fast the ship slows down
            velocityX: 0, // Current horizontal velocity
            velocityY: 0, // Current vertical velocity
            ammo: 10, // Starting ammo
            coins: 0,
            currentShip: "gray",
            hasShield: false,
        };

        this.ships = {
            gray: {
                image: "assets/Gray Ship.png",
                cost: 50,
                owned: true,
            },
            blue: {
                image: "assets/Blue Ship.png",
                cost: 50,
                owned: false,
            },
            red: {
                image: "assets/Red Ship.png",
                cost: 50,
                owned: false,
            },
        };

        this.bullets = [];
        this.enemies = [];
        this.score = 0;
        this.lives = 3;
        this.gameLoop = null;
        this.keys = {};
        this.isGameOver = false;
        this.lastShot = 0;
        this.shootInterval = 150;

        // Level system
        this.currentLevel = 1;
        this.levels = {
            1: {
                requiredScore: 1000,
                enemySpeed: 2,
                enemyColor: "#ff4444",
                enemySpawnRate: 0.02,
                enemySize: 40,
            },
            2: {
                requiredScore: 2000,
                enemySpeed: 3,
                enemyColor: "#ff8800",
                enemySpawnRate: 0.03,
                enemySize: 45,
            },
        };

        this.isPaused = false;
        this.setupEventListeners();
        this.setupMenuButtons();
        this.setupPauseMenu();
        this.setupShop();

        // Load saved data from localStorage
        this.loadSavedData();

        this.powerUps = [];
        this.powerUpTypes = {
            ammo: {
                color: "#4a90e2",
                effect: () => {
                    this.player.ammo += 20;
                    this.updateAmmo();
                },
            },
            shield: {
                color: "#4ae2a3",
                effect: () => {
                    this.player.hasShield = true;
                    setTimeout(() => {
                        this.player.hasShield = false;
                    }, 10000); // Shield lasts 10 seconds
                },
            },
            rapidFire: {
                color: "#e24a4a",
                effect: () => {
                    this.shootInterval = 50; // Faster shooting
                    setTimeout(() => {
                        this.shootInterval = 150; // Back to normal
                    }, 5000); // Lasts 5 seconds
                },
            },
        };

        this.effects = [];

        this.enemyTypes = {
            basic: {
                image: "assets/Red Ship.png",
                health: 1,
                points: 100,
                ammoDrop: 10,
                behavior: "straight",
            },
            zigzag: {
                image: "assets/Blue Ship.png",
                health: 2,
                points: 200,
                ammoDrop: 15,
                behavior: "zigzag",
                amplitude: 100,
                frequency: 0.02,
            },
            kamikaze: {
                image: "assets/Red Ship.png",
                health: 1,
                points: 300,
                ammoDrop: 20,
                behavior: "kamikaze",
                speed: 4,
            },
            boss: {
                image: "assets/Red Ship.png",
                health: 10,
                points: 1000,
                ammoDrop: 50,
                behavior: "boss",
                size: 80,
                attackPattern: "circle",
            },
        };

        this.combo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 2000; // 2 seconds to maintain combo
        this.maxCombo = 0;
        this.scoreMultiplier = 1;

        // Audio setup with error handling
        this.audio = {
            music: new Audio(),
            shoot: new Audio(),
        };

        // Load audio files
        this.loadAudio();
    }

    setupEventListeners() {
        window.addEventListener("keydown", (e) => (this.keys[e.key] = true));
        window.addEventListener("keyup", (e) => (this.keys[e.key] = false));
    }

    setupMenuButtons() {
        document
            .getElementById("startButton")
            .addEventListener("click", () => this.startGame());
        document
            .getElementById("restartButton")
            .addEventListener("click", () => this.startGame());
        document
            .getElementById("gameOverMenuButton")
            .addEventListener("click", () => this.backToMenu());

        // How to Play buttons
        document
            .getElementById("startHowToPlayButton")
            .addEventListener("click", () => this.openHowToPlay());
        document
            .getElementById("pauseHowToPlayButton")
            .addEventListener("click", () => this.openHowToPlay());
        document
            .getElementById("closeHowToPlayButton")
            .addEventListener("click", () => this.closeHowToPlay());
    }

    setupPauseMenu() {
        // Pause button click
        document
            .getElementById("pauseButton")
            .addEventListener("click", () => this.togglePause());

        // Pause menu buttons
        document
            .getElementById("resumeButton")
            .addEventListener("click", () => this.togglePause());
        document
            .getElementById("backToMenuButton")
            .addEventListener("click", () => this.backToMenu());

        // Keyboard pause
        window.addEventListener("keydown", (e) => {
            if (e.key === "p" || e.key === "P") {
                this.togglePause();
            }
        });
    }

    setupShop() {
        // Shop buttons
        document
            .getElementById("startShopButton")
            .addEventListener("click", () => this.openShop());
        document
            .getElementById("pauseShopButton")
            .addEventListener("click", () => this.openShop());
        document
            .getElementById("closeShopButton")
            .addEventListener("click", () => this.closeShop());

        // Ship selection buttons
        document.querySelectorAll(".select-ship-button").forEach((button) => {
            button.addEventListener("click", (e) =>
                this.handleShipSelection(e.target.dataset.ship)
            );
        });
    }

    openShop() {
        document.getElementById("shopMenu").classList.remove("hidden");
        this.updateShopButtons();
    }

    closeShop() {
        document.getElementById("shopMenu").classList.add("hidden");
    }

    updateShopButtons() {
        document.querySelectorAll(".select-ship-button").forEach((button) => {
            const shipType = button.dataset.ship;
            const ship = this.ships[shipType];

            if (shipType === this.player.currentShip) {
                button.textContent = "Selected";
                button.disabled = true;
            } else if (ship.owned) {
                button.textContent = "Play";
                button.disabled = false;
            } else {
                button.textContent = `Buy (${ship.cost} coins)`;
                button.disabled = this.totalCoins < ship.cost;
            }
        });
    }

    handleShipSelection(shipType) {
        const ship = this.ships[shipType];

        if (!ship.owned) {
            if (this.totalCoins >= ship.cost) {
                this.totalCoins -= ship.cost;
                ship.owned = true;
                this.purchasedShips.push(shipType);
                this.saveToLocalStorage();
                this.updateShopButtons();
            }
        } else {
            this.player.currentShip = shipType;
            this.playerImage.src = ship.image;
            localStorage.setItem("currentShip", shipType);
            this.updateShopButtons();
        }
    }

    updateCoins() {
        document.getElementById("coinsValue").textContent = this.player.coins;
    }

    startGame() {
        document.getElementById("startMenu").classList.add("hidden");
        document.getElementById("gameOver").classList.add("hidden");
        document.getElementById("pauseMenu").classList.add("hidden");
        document.getElementById("shopMenu").classList.add("hidden");
        document.getElementById("gameContainer").classList.remove("hidden");

        this.score = 0;
        this.lives = 3;
        this.bullets = [];
        this.enemies = [];
        this.isGameOver = false;
        this.isPaused = false;
        this.currentLevel = 1;
        this.player.ammo = 10;
        this.player.coins = 0;
        this.updateScore();
        this.updateLives();
        this.updateAmmo();
        this.updateCoins();

        // Reset player position
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 50;
        this.updatePlayer();

        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
        this.gameLoop = requestAnimationFrame(() => this.update());

        // Start background music with user interaction
        const startMusic = () => {
            this.audio.music
                .play()
                .then(() => {
                    console.log("Music started successfully");
                })
                .catch((error) => {
                    console.error("Failed to play music:", error);
                });
        };

        // Try to play music immediately
        startMusic();
    }

    update() {
        if (this.isPaused) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update combo timer
        if (this.combo > 0) {
            this.comboTimer += 16; // Approximately 60fps
            if (this.comboTimer >= this.comboTimeout) {
                this.combo = 0;
                this.comboTimer = 0;
                this.scoreMultiplier = 1;
            }
        }

        this.handleInput();
        this.updatePlayer();
        this.updateBullets();
        this.updateEnemies();
        this.updatePowerUps();
        this.updateEffects();
        this.checkCollisions();
        this.spawnEnemies();
        this.checkLevelProgress();

        this.draw();

        if (this.lives > 0) {
            this.gameLoop = requestAnimationFrame(() => this.update());
        } else {
            this.gameOver();
        }
    }

    handleInput() {
        if (this.isPaused) return;

        // Handle horizontal movement
        if (this.keys["ArrowLeft"]) {
            this.player.velocityX -= this.player.acceleration;
        } else if (this.keys["ArrowRight"]) {
            this.player.velocityX += this.player.acceleration;
        } else {
            // Apply deceleration when no horizontal input
            if (this.player.velocityX > 0) {
                this.player.velocityX = Math.max(
                    0,
                    this.player.velocityX - this.player.deceleration
                );
            } else if (this.player.velocityX < 0) {
                this.player.velocityX = Math.min(
                    0,
                    this.player.velocityX + this.player.deceleration
                );
            }
        }

        // Handle vertical movement
        if (this.keys["ArrowUp"]) {
            this.player.velocityY -= this.player.acceleration;
        } else if (this.keys["ArrowDown"]) {
            this.player.velocityY += this.player.acceleration;
        } else {
            // Apply deceleration when no vertical input
            if (this.player.velocityY > 0) {
                this.player.velocityY = Math.max(
                    0,
                    this.player.velocityY - this.player.deceleration
                );
            } else if (this.player.velocityY < 0) {
                this.player.velocityY = Math.min(
                    0,
                    this.player.velocityY + this.player.deceleration
                );
            }
        }

        // Limit maximum speed
        const currentSpeed = Math.sqrt(
            this.player.velocityX ** 2 + this.player.velocityY ** 2
        );
        if (currentSpeed > this.player.maxSpeed) {
            const ratio = this.player.maxSpeed / currentSpeed;
            this.player.velocityX *= ratio;
            this.player.velocityY *= ratio;
        }

        // Update position based on velocity
        this.player.x += this.player.velocityX;
        this.player.y += this.player.velocityY;

        // Shooting
        const currentTime = Date.now();
        if (
            this.keys[" "] &&
            currentTime - this.lastShot >= this.shootInterval
        ) {
            this.shoot();
            this.lastShot = currentTime;
        }
    }

    shoot() {
        if (this.player.ammo > 0) {
            // Play shoot sound with error handling
            this.audio.shoot.currentTime = 0;
            this.audio.shoot
                .play()
                .then(() => {
                    console.log("Shoot sound played");
                })
                .catch((error) => {
                    console.error("Failed to play shoot sound:", error);
                });

            // Create two bullets for a wider spread
            this.bullets.push({
                x: this.player.x + this.player.width / 2 - 2,
                y: this.player.y,
                width: 4,
                height: 10,
                speed: 7,
            });
            this.bullets.push({
                x: this.player.x + this.player.width / 2 + 2,
                y: this.player.y,
                width: 4,
                height: 10,
                speed: 7,
            });
            this.player.ammo--;
            this.updateAmmo();
        }
    }

    spawnEnemies() {
        const currentLevelData = this.levels[this.currentLevel];
        if (Math.random() < currentLevelData.enemySpawnRate) {
            // Determine enemy type based on level and random chance
            let enemyType;
            const rand = Math.random();

            if (this.currentLevel >= 3 && rand < 0.1) {
                enemyType = "boss";
            } else if (this.currentLevel >= 2) {
                if (rand < 0.4) enemyType = "basic";
                else if (rand < 0.7) enemyType = "zigzag";
                else enemyType = "kamikaze";
            } else {
                enemyType = "basic";
            }

            const typeData = this.enemyTypes[enemyType];
            const size =
                enemyType === "boss"
                    ? typeData.size
                    : currentLevelData.enemySize;

            this.enemies.push({
                x: Math.random() * (this.canvas.width - size),
                y: -size,
                width: size,
                height: size,
                speed: currentLevelData.enemySpeed,
                type: enemyType,
                health: typeData.health,
                points: typeData.points,
                ammoDrop: typeData.ammoDrop,
                behavior: typeData.behavior,
                // Behavior-specific properties
                amplitude: typeData.amplitude,
                frequency: typeData.frequency,
                originalX: Math.random() * (this.canvas.width - size),
                time: 0,
                attackPhase: 0,
            });
        }
    }

    updatePlayer() {
        // Keep player within canvas bounds with smooth deceleration at edges
        if (this.player.x < 0) {
            this.player.x = 0;
            this.player.velocityX = 0;
        } else if (this.player.x > this.canvas.width - this.player.width) {
            this.player.x = this.canvas.width - this.player.width;
            this.player.velocityX = 0;
        }

        if (this.player.y < 0) {
            this.player.y = 0;
            this.player.velocityY = 0;
        } else if (this.player.y > this.canvas.height - this.player.height) {
            this.player.y = this.canvas.height - this.player.height;
            this.player.velocityY = 0;
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy) {
                bullet.x += Math.cos(bullet.angle) * bullet.speed;
                bullet.y += Math.sin(bullet.angle) * bullet.speed;
            } else {
                bullet.y -= bullet.speed;
            }

            if (
                bullet.y < 0 ||
                bullet.y > this.canvas.height ||
                bullet.x < 0 ||
                bullet.x > this.canvas.width
            ) {
                this.bullets.splice(i, 1);
            }
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.time += 0.016; // Approximately 60fps

            switch (enemy.behavior) {
                case "zigzag":
                    enemy.x =
                        enemy.originalX +
                        Math.sin(enemy.time * enemy.frequency) *
                            enemy.amplitude;
                    enemy.y += enemy.speed;
                    break;

                case "kamikaze":
                    // Calculate direction to player
                    const dx = this.player.x - enemy.x;
                    const dy = this.player.y - enemy.y;
                    const angle = Math.atan2(dy, dx);
                    enemy.x += Math.cos(angle) * enemy.speed;
                    enemy.y += Math.sin(angle) * enemy.speed;
                    break;

                case "boss":
                    if (enemy.attackPattern === "circle") {
                        enemy.attackPhase += 0.02;
                        const radius = 100;
                        enemy.x =
                            this.canvas.width / 2 +
                            Math.cos(enemy.attackPhase) * radius;
                        enemy.y = 100 + Math.sin(enemy.attackPhase) * radius;

                        // Shoot at player periodically
                        if (Math.random() < 0.02) {
                            this.enemyShoot(enemy);
                        }
                    }
                    break;

                default: // straight
                    enemy.y += enemy.speed;
            }

            if (enemy.y > this.canvas.height) {
                this.enemies.splice(i, 1);
                this.lives--;
                this.updateLives();
            }
        }
    }

    enemyShoot(enemy) {
        const angle = Math.atan2(
            this.player.y - enemy.y,
            this.player.x - enemy.x
        );

        this.bullets.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            width: 4,
            height: 10,
            speed: 5,
            isEnemy: true,
            angle: angle,
        });
    }

    updatePowerUps() {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.y += powerUp.speed;

            // Check collision with player
            if (this.checkCollision(powerUp, this.player)) {
                this.powerUpTypes[powerUp.type].effect();
                this.powerUps.splice(i, 1);
                continue;
            }

            // Remove if off screen
            if (powerUp.y > this.canvas.height) {
                this.powerUps.splice(i, 1);
            }
        }
    }

    updateEffects() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life -= 0.02;

            if (effect.type === "explosion") {
                effect.x += effect.vx;
                effect.y += effect.vy;
                effect.size *= 0.95;
            }

            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        if (this.isGameOver) return;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                if (!this.player.hasShield) {
                    this.enemies.splice(i, 1);
                    this.lives--;
                    this.updateLives();

                    if (this.lives <= 0) {
                        this.isGameOver = true;
                        this.gameOver();
                        return;
                    }
                }
                continue;
            }

            // Check collision with bullets
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const bullet = this.bullets[j];
                if (this.checkCollision(bullet, enemy)) {
                    if (!bullet.isEnemy) {
                        enemy.health--;
                        this.bullets.splice(j, 1);

                        if (enemy.health <= 0) {
                            this.enemies.splice(i, 1);
                            this.combo++;
                            this.comboTimer = 0;
                            this.maxCombo = Math.max(this.maxCombo, this.combo);

                            // Calculate score multiplier based on combo
                            this.scoreMultiplier = 1 + this.combo * 0.1; // 10% increase per combo

                            // Apply score with multiplier
                            const baseScore = enemy.points;
                            const finalScore = Math.floor(
                                baseScore * this.scoreMultiplier
                            );
                            this.score += finalScore;

                            // Show combo text
                            this.createComboText(
                                enemy.x,
                                enemy.y,
                                this.combo,
                                finalScore
                            );
                            this.player.ammo += enemy.ammoDrop;
                            this.player.coins += Math.floor(enemy.points / 100);
                            this.totalCoins += Math.floor(enemy.points / 100);
                            this.saveToLocalStorage();
                            this.updateScore();
                            this.updateAmmo();
                            this.updateCoins();
                            this.createExplosion(
                                enemy.x + enemy.width / 2,
                                enemy.y + enemy.height / 2,
                                enemy.width
                            );
                            this.spawnPowerUp(enemy.x, enemy.y);
                        }
                    }
                    break;
                }
            }
        }

        // Check enemy bullets hitting player
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy && this.checkCollision(bullet, this.player)) {
                if (!this.player.hasShield) {
                    this.lives--;
                    this.updateLives();
                    if (this.lives <= 0) {
                        this.isGameOver = true;
                        this.gameOver();
                        return;
                    }
                }
                this.bullets.splice(i, 1);
            }
        }
    }

    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player
        this.ctx.drawImage(
            this.playerImage,
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height
        );

        // Draw bullets with different colors for enemy bullets
        this.bullets.forEach((bullet) => {
            this.ctx.fillStyle = bullet.isEnemy ? "#ff4444" : "#fff";
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });

        // Draw enemies
        this.enemies.forEach((enemy) => {
            // Save the current canvas state
            this.ctx.save();

            // Move to the center of the enemy
            this.ctx.translate(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2
            );

            // Rotate 180 degrees
            this.ctx.rotate(Math.PI);

            // Draw the enemy image centered
            this.ctx.drawImage(
                this.enemyImage,
                -enemy.width / 2,
                -enemy.height / 2,
                enemy.width,
                enemy.height
            );

            // Restore the canvas state
            this.ctx.restore();

            // Draw health bar for non-basic enemies
            if (enemy.type !== "basic") {
                const healthBarWidth = enemy.width;
                const healthBarHeight = 5;
                const healthPercentage =
                    enemy.health / this.enemyTypes[enemy.type].health;

                this.ctx.fillStyle = "#ff0000";
                this.ctx.fillRect(
                    enemy.x,
                    enemy.y - 10,
                    healthBarWidth,
                    healthBarHeight
                );

                this.ctx.fillStyle = "#00ff00";
                this.ctx.fillRect(
                    enemy.x,
                    enemy.y - 10,
                    healthBarWidth * healthPercentage,
                    healthBarHeight
                );
            }
        });

        // Draw level indicator and ammo at the bottom of the screen
        this.ctx.fillStyle = "#4a90e2";
        this.ctx.font = "20px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(
            `Level ${this.currentLevel}`,
            20,
            this.canvas.height - 40
        );
        this.ctx.fillText(
            `Ammo: ${this.player.ammo}`,
            20,
            this.canvas.height - 15
        );

        // Draw combo counter
        if (this.combo > 0) {
            this.ctx.fillStyle = "#ffd700";
            this.ctx.font = "bold 24px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(
                `Combo x${this.combo}`,
                this.canvas.width / 2,
                120
            );
            this.ctx.fillText(
                `${this.scoreMultiplier.toFixed(1)}x Score`,
                this.canvas.width / 2,
                150
            );
        }

        // Draw power-ups
        this.powerUps.forEach((powerUp) => {
            this.ctx.fillStyle = this.powerUpTypes[powerUp.type].color;
            this.ctx.beginPath();
            this.ctx.arc(
                powerUp.x + powerUp.width / 2,
                powerUp.y + powerUp.height / 2,
                powerUp.width / 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // Draw shield if active
        if (this.player.hasShield) {
            this.ctx.strokeStyle = "#4ae2a3";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                this.player.width,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();
        }

        // Draw effects
        this.effects.forEach((effect) => {
            this.ctx.globalAlpha = effect.life;
            if (effect.type === "combo") {
                this.ctx.fillStyle = "#ffd700";
                this.ctx.font = "bold 20px Arial";
                this.ctx.textAlign = "center";
                this.ctx.fillText(
                    effect.text,
                    effect.x,
                    effect.y + effect.velocity * (1 - effect.life) * 50
                );
            } else if (effect.type === "explosion") {
                this.ctx.fillStyle = "#ff4444";
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (effect.type === "impact") {
                this.ctx.fillStyle = "#ffffff";
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1;
    }

    updateScore() {
        document.getElementById("scoreValue").textContent = this.score;
    }

    updateLives() {
        document.getElementById("livesValue").textContent = this.lives;
    }

    updateAmmo() {
        const ammoElement = document.getElementById("ammoValue");
        if (ammoElement) {
            ammoElement.textContent = this.player.ammo;
        }
    }

    gameOver() {
        this.isGameOver = true;
        document.getElementById("gameContainer").classList.add("hidden");
        document.getElementById("gameOver").classList.remove("hidden");
        document.getElementById("finalScore").textContent = this.score;
        this.saveToLocalStorage();
        this.updatePlayer();
        // Stop music
        this.audio.music.pause();
        this.audio.music.currentTime = 0;

        // Show max combo in game over screen
        const maxComboElement = document.createElement("p");
        maxComboElement.textContent = `Max Combo: ${this.maxCombo}`;
        document.getElementById("gameOver").appendChild(maxComboElement);
    }

    checkLevelProgress() {
        const nextLevel = this.currentLevel + 1;
        if (
            this.levels[nextLevel] &&
            this.score >= this.levels[nextLevel].requiredScore
        ) {
            this.currentLevel = nextLevel;
            // Clear existing enemies when leveling up
            this.enemies = [];
            // Show level up message
            this.showLevelUpMessage();
        }
    }

    showLevelUpMessage() {
        const levelUpDiv = document.createElement("div");
        levelUpDiv.className = "level-up-message";
        levelUpDiv.textContent = `Level ${this.currentLevel}!`;
        document.getElementById("gameContainer").appendChild(levelUpDiv);

        // Remove message after 2 seconds
        setTimeout(() => {
            levelUpDiv.remove();
        }, 2000);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById("pauseMenu").classList.remove("hidden");
            cancelAnimationFrame(this.gameLoop);
            // Pause music
            this.audio.music.pause();
        } else {
            document.getElementById("pauseMenu").classList.add("hidden");
            this.gameLoop = requestAnimationFrame(() => this.update());
            // Resume music
            this.audio.music.play().catch((error) => {
                console.log("Audio playback failed:", error);
            });
        }
    }

    backToMenu() {
        this.isPaused = false;
        this.isGameOver = false;
        document.getElementById("pauseMenu").classList.add("hidden");
        document.getElementById("gameContainer").classList.add("hidden");
        document.getElementById("howToPlayMenu").classList.add("hidden");
        document.getElementById("shopMenu").classList.add("hidden");
        document.getElementById("gameOver").classList.add("hidden");
        document.getElementById("startMenu").classList.remove("hidden");
        cancelAnimationFrame(this.gameLoop);
        // Stop music
        this.audio.music.pause();
        this.audio.music.currentTime = 0;

        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.bullets = [];
        this.enemies = [];
        this.player.ammo = 10;
        this.player.coins = 0;
        this.currentLevel = 1;
        this.combo = 0;
        this.comboTimer = 0;
        this.scoreMultiplier = 1;
        this.maxCombo = 0;

        // Update UI
        this.updateScore();
        this.updateLives();
        this.updateAmmo();
        this.updateCoins();
    }

    loadSavedData() {
        // Load coins
        const savedCoins = localStorage.getItem("totalCoins");
        this.totalCoins = savedCoins ? parseInt(savedCoins) : 0;

        // Load purchased ships
        const savedShips = localStorage.getItem("purchasedShips");
        this.purchasedShips = savedShips ? JSON.parse(savedShips) : ["gray"];

        // Load current ship
        const currentShip = localStorage.getItem("currentShip");
        this.player.currentShip = currentShip || "gray";

        // Update ship ownership based on purchased ships
        Object.keys(this.ships).forEach((shipType) => {
            this.ships[shipType].owned = this.purchasedShips.includes(shipType);
        });

        // Set initial player image
        this.playerImage.src = this.ships[this.player.currentShip].image;
    }

    saveToLocalStorage() {
        localStorage.setItem("totalCoins", this.totalCoins.toString());
        localStorage.setItem(
            "purchasedShips",
            JSON.stringify(this.purchasedShips)
        );
        localStorage.setItem("currentShip", this.player.currentShip);
    }

    spawnPowerUp(x, y) {
        if (Math.random() < 0.2) {
            // 20% chance to spawn power-up
            const types = Object.keys(this.powerUpTypes);
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerUps.push({
                x,
                y,
                type,
                width: 20,
                height: 20,
                speed: 2,
            });
        }
    }

    createExplosion(x, y, size) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 2 + Math.random() * 2;
            this.effects.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size / 2,
                life: 1,
                type: "explosion",
            });
        }
    }

    createImpact(x, y) {
        this.effects.push({
            x,
            y,
            size: 5,
            life: 0.5,
            type: "impact",
        });
    }

    createComboText(x, y, combo, score) {
        this.effects.push({
            x,
            y,
            text: `Combo x${combo}! +${score}`,
            life: 1,
            type: "combo",
            velocity: -2,
        });
    }

    loadAudio() {
        // Configure audio
        this.audio.music.loop = true;
        this.audio.music.volume = 0.5;
        this.audio.shoot.volume = 0.3;

        // Load music
        this.audio.music.src = "assets/Music.mp3";
        this.audio.music.addEventListener("error", (e) => {
            console.error("Error loading music:", e);
        });
        this.audio.music.addEventListener("canplaythrough", () => {
            console.log("Music loaded successfully");
        });

        // Load shoot sound
        this.audio.shoot.src = "assets/shoot.wav";
        this.audio.shoot.addEventListener("error", (e) => {
            console.error("Error loading shoot sound:", e);
        });
        this.audio.shoot.addEventListener("canplaythrough", () => {
            console.log("Shoot sound loaded successfully");
        });
    }

    openHowToPlay() {
        document.getElementById("howToPlayMenu").classList.remove("hidden");
        if (this.isPaused) {
            document.getElementById("pauseMenu").classList.add("hidden");
        } else {
            document.getElementById("startMenu").classList.add("hidden");
        }
    }

    closeHowToPlay() {
        document.getElementById("howToPlayMenu").classList.add("hidden");
        if (this.isPaused) {
            document.getElementById("pauseMenu").classList.remove("hidden");
        } else {
            document.getElementById("startMenu").classList.remove("hidden");
        }
    }
}

// Initialize the game when the page loads
window.addEventListener("load", () => {
    new Game();
});
