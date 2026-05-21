/**
 * Jasper Junction - Scenes
 * MainMenu, Gameplay, Pause, LevelEnd, Tutorial scenes.
 */

'use strict';

JJ.Scenes = {};

// === MAIN MENU ===
JJ.Scenes.MainMenu = function () {
    let bgImage = null;
    let bgLoaded = false;

    // Load menu background
    bgImage = new Image();
    bgImage.onload = function () { bgLoaded = true; };
    bgImage.src = 'assets/jasper-junction-menu-bg.jpg';

    function executeMenuAction(action) {
        const save = JJ.Save.getData();
        switch (action) {
            case 'tutorial':
                JJ.Engine.replaceScene(JJ.Scenes.Gameplay(0));
                break;
            case 'newgame':
                JJ.Engine.replaceScene(JJ.Scenes.Gameplay(save.tutorialCompleted ? Math.max(1, save.currentLevel) : 0));
                break;
        }
    }

    function onTutorialClick() {
        executeMenuAction('tutorial');
    }

    function onNewGameClick() {
        executeMenuAction('newgame');
    }

    return {
        name: 'mainmenu',
        onEnter() {
            // Wire up HTML buttons
            const btnTutorial = document.getElementById('btn-tutorial');
            const btnNewGame = document.getElementById('btn-newgame');
            if (btnTutorial) btnTutorial.addEventListener('click', onTutorialClick);
            if (btnNewGame) btnNewGame.addEventListener('click', onNewGameClick);
        },
        onExit() {
            const btnTutorial = document.getElementById('btn-tutorial');
            const btnNewGame = document.getElementById('btn-newgame');
            if (btnTutorial) btnTutorial.removeEventListener('click', onTutorialClick);
            if (btnNewGame) btnNewGame.removeEventListener('click', onNewGameClick);
        },
        update(dt) {
            // No attract mode - it conflicts with the portrait-allowed title screen
        },
        render(ctx) {
            // Background only - logo and buttons are HTML overlay
            if (bgLoaded) {
                ctx.drawImage(bgImage, 0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            } else {
                ctx.fillStyle = '#1a2a1a';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            }
        },
    };
};


// === GAMEPLAY SCENE ===
JJ.Scenes.Gameplay = function (levelNumber) {
    let config = null;
    let pens = [];
    let elapsedTime = 0;
    let score = 0;
    let isPaused = false;
    let isComplete = false;
    let autoSaveTimer = 0;
    let corralledCounts = { sheep: 0, cow: 0, goat: 0 };
    let totalCounts = { sheep: 0, cow: 0, goat: 0 };
    let tutorialStep = 0; // For tutorial: 0=move, 1=herd, 2=bark, 3=done
    let tutorialPrompts = [
        'Arrow keys or WASD to move · On mobile, tap anywhere to move Jasper',
        'Get close to sheep to push them toward the pen',
        'Press Space to bark (or double-tap on mobile) · Doubles your herding range!',
        '',
    ];
    let hasMovedOnce = false;
    let hasHerdedOnce = false;
    let hasBarkedOnce = false;

    return {
        name: 'gameplay',
        isPaused: false,

        onEnter() {
            config = JJ.Levels.getConfig(levelNumber);
            pens = JJ.Levels.getPens();
            elapsedTime = 0;
            score = 0;
            isComplete = false;
            autoSaveTimer = 0;
            corralledCounts = { sheep: 0, cow: 0, goat: 0 };

            // Reset entities
            JJ.Entities.reset();

            // Spawn Jasper (center of field, near bottom)
            const fieldBounds = JJ.Levels.getFieldBounds();
            const jasper = JJ.Entities.createJasper(
                fieldBounds.x + fieldBounds.width / 2,
                fieldBounds.y + fieldBounds.height * 0.85
            );
            JJ.Entities.addEntity(jasper);

            // Spawn animals
            const animals = JJ.Levels.spawnAnimals(config);
            animals.forEach(a => JJ.Entities.addEntity(a));

            totalCounts = {
                sheep: config.sheepCount,
                cow: config.cowCount,
                goat: config.goatCount,
            };

            // Init render
            JJ.Render.init();

            // Start audio
            if (JJ.Audio) {
                JJ.Audio.playSFX('level_start');
                JJ.Audio.playMusic();
                JJ.Audio.playAmbient(); // Will no-op if already playing
            }

            // Tutorial state
            if (levelNumber === 0) {
                tutorialStep = 0;
                hasMovedOnce = false;
                hasHerdedOnce = false;
                hasBarkedOnce = false;
            }
        },

        update(dt) {
            if (isComplete || isPaused) return;

            // Timer (not for tutorial)
            if (levelNumber !== 0) {
                elapsedTime += dt;

                // Time's up
                if (elapsedTime >= config.maxTime) {
                    this.endLevel(true); // timeout
                    return;
                }

                // Auto-save every 30s
                autoSaveTimer += dt;
                if (autoSaveTimer >= 30) {
                    autoSaveTimer = 0;
                    JJ.Save.setAutoSave({
                        levelNumber,
                        elapsedTime,
                        score,
                        corralledCounts,
                    });
                }
            }

            // Update entities
            JJ.Entities.update(dt);

            // Slide corralled animals toward their pen target
            JJ.Entities.getAllEntities().forEach(animal => {
                if (animal.state !== JJ.AnimalState.Corralled) return;
                if (!animal.corralTarget) return;

                const dx = animal.corralTarget.x - animal.position.x;
                const dy = animal.corralTarget.y - animal.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 3) {
                    const speed = 80; // Slide speed
                    animal.position.x += (dx / dist) * speed * dt;
                    animal.position.y += (dy / dist) * speed * dt;
                } else {
                    // Arrived at target
                    animal.position.x = animal.corralTarget.x;
                    animal.position.y = animal.corralTarget.y;
                    animal.corralTarget = null;
                    animal.velocity.x = 0;
                    animal.velocity.y = 0;
                    animal.animationState.currentAnimation = 'idle';
                }
            });

            // AI
            const animals = JJ.Entities.getUncorralledAnimals();
            const jasper = JJ.Entities.getJasper();
            JJ.AI.update(dt, animals, jasper, config.behaviorModifiers);

            // Physics
            JJ.Physics.update(dt, JJ.Entities.getAllEntities());

            // Check pen entry
            this.checkPenEntry();

            // Check stuck animals
            this.checkStuck(dt);

            // Tutorial progress
            if (levelNumber === 0) {
                this.updateTutorial();
            }

            // Check win condition - only if all animals are corralled AND finished sliding
            const remaining = JJ.Entities.getUncorralledAnimals().length;
            if (remaining === 0 && !isComplete) {
                // Check if all corralled animals have reached their target
                const stillSliding = JJ.Entities.getAllEntities().some(
                    a => a.state === JJ.AnimalState.Corralled && a.corralTarget
                );
                if (!stillSliding) {
                    this.endLevel(false); // completed
                }
            }
        },

        checkPenEntry() {
            const animals = JJ.Entities.getUncorralledAnimals();
            animals.forEach(animal => {
                pens.forEach(pen => {
                    if (pen.closed) return;

                    const gateX = pen.gateX;
                    const gateY = pen.gateY;
                    const gateW = pen.gateWidth;

                    // Check if animal is within the gate opening (generous detection)
                    if (animal.position.x >= gateX - 20 &&
                        animal.position.x <= gateX + gateW + 20 &&
                        animal.position.y < gateY + 30) {

                        if (animal.type === pen.type) {
                            // Corral!
                            animal.state = JJ.AnimalState.Corralled;
                            // Set a target position inside the pen and slide toward it
                            animal.corralTarget = {
                                x: pen.x + 60 + Math.random() * (pen.width - 120),
                                y: pen.y + 30 + Math.random() * (pen.height - 100),
                            };
                            animal.animationState.currentAnimation = 'run';
                            corralledCounts[animal.type]++;

                            // Points
                            let points = 0;
                            if (animal.type === JJ.EntityType.Sheep) points = 100;
                            else if (animal.type === JJ.EntityType.Cow) points = 200;
                            else if (animal.type === JJ.EntityType.Goat) points = 300;
                            score += points;

                            // Effects
                            JJ.Effects.spawnFloatingText(animal.position, '+' + points);

                            // SFX
                            if (animal.type === JJ.EntityType.Sheep) JJ.Audio.playSFX('sheep_bleat');
                            else if (animal.type === JJ.EntityType.Cow) JJ.Audio.playSFX('cow_moo');
                            else if (animal.type === JJ.EntityType.Goat) JJ.Audio.playSFX('goat_bleat');

                            // Check if pen should close
                            const typeTotal = totalCounts[animal.type];
                            if (corralledCounts[animal.type] >= typeTotal) {
                                // Delay gate close to let the last animal slide in
                                const closePen = pen;
                                const closeGateX = gateX;
                                const closeGateW = gateW;
                                const closeGateY = gateY;
                                setTimeout(() => {
                                    closePen.closed = true;
                                    JJ.Effects.spawnGateSlam({ x: closeGateX + closeGateW / 2, y: closeGateY });
                                    JJ.Audio.playSFX('gate_close', 1.0);
                                }, 500);
                            }

                            // Tutorial tracking
                            if (levelNumber === 0) hasHerdedOnce = true;
                        }
                        // Wrong type - push back
                        else {
                            animal.velocity.y = 50;
                        }
                    }
                });
            });
        },

        checkStuck(dt) {
            const animals = JJ.Entities.getUncorralledAnimals();
            const now = performance.now() / 1000;

            animals.forEach(animal => {
                const dx = animal.position.x - animal.stuckPosition.x;
                const dy = animal.position.y - animal.stuckPosition.y;
                const moved = Math.sqrt(dx * dx + dy * dy);

                if (moved < 10) {
                    animal.stuckTimer += dt;
                } else {
                    animal.stuckTimer = 0;
                    animal.stuckPosition = { ...animal.position };
                }

                if (animal.stuckTimer >= 5 && now - animal.lastUnstuckTime >= 5) {
                    // Nudge toward center of field to escape boundary
                    const centerX = JJ.CANVAS_WIDTH / 2;
                    const centerY = JJ.CANVAS_HEIGHT * 0.5;
                    const toCenterX = centerX - animal.position.x;
                    const toCenterY = centerY - animal.position.y;
                    const dist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY) || 1;
                    animal.velocity.x = (toCenterX / dist) * animal.baseSpeed * 0.7;
                    animal.velocity.y = (toCenterY / dist) * animal.baseSpeed * 0.7;
                    animal.stuckTimer = 0;
                    animal.lastUnstuckTime = now;
                    animal.stuckPosition = { ...animal.position };
                }
            });
        },

        updateTutorial() {
            const jasper = JJ.Entities.getJasper();
            if (!jasper) return;

            if (tutorialStep === 0 && (Math.abs(jasper.velocity.x) > 5 || Math.abs(jasper.velocity.y) > 5)) {
                hasMovedOnce = true;
                tutorialStep = 1;
            }
            if (tutorialStep === 1 && hasHerdedOnce) {
                tutorialStep = 2;
            }
            if (tutorialStep === 2 && jasper.isBarkActive) {
                hasBarkedOnce = true;
                tutorialStep = 3;
            }
        },

        endLevel(timedOut) {
            isComplete = true;
            const result = JJ.Levels.calculateScore(corralledCounts, totalCounts, elapsedTime, config.maxTime);
            result.timedOut = timedOut || false;

            // Audio - stop music but keep ambient playing through level complete
            if (result.timedOut) {
                JJ.Audio.stopAll();
                JJ.Audio.playSFX('game_over');
            } else {
                // Stop only music, keep ambient looping
                if (JJ.Audio.stopMusic) JJ.Audio.stopMusic();
                JJ.Audio.playSFX('celebration');
            }

            // Save progress
            if (levelNumber === 0) {
                JJ.Save.completeTutorial();
            } else {
                JJ.Save.addScore(result.totalScore);
                JJ.Save.setStarRating(levelNumber, result.stars);
                if (!JJ.Levels.isLastLevel(levelNumber)) {
                    JJ.Save.setCurrentLevel(levelNumber + 1);
                }
            }
            JJ.Save.clearAutoSave();

            // Celebration confetti around Jasper's position for all completions
            if (!result.timedOut) {
                const jasper = JJ.Entities.getJasper();
                const celebPos = jasper ? { x: jasper.position.x, y: jasper.position.y } : { x: JJ.CANVAS_WIDTH / 2, y: JJ.CANVAS_HEIGHT / 2 };
                JJ.Effects.spawnConfetti(celebPos);
            }

            // Show level end
            setTimeout(() => {
                if (JJ.Effects) JJ.Effects.init(); // Clear all particles
                JJ.Engine.replaceScene(JJ.Scenes.LevelEnd(levelNumber, result));
            }, levelNumber === 0 ? 1500 : 2000);
        },

        render(ctx) {
            // Game world
            const gameState = {
                pens,
                entities: JJ.Entities.getAllEntities(),
                corralledCounts,
                totalCounts,
                jasper: JJ.Entities.getJasper(),
                elapsedTime,
                maxTime: config.maxTime,
                score,
                levelNumber,
                remainingCounts: {
                    sheep: totalCounts.sheep - corralledCounts.sheep,
                    cow: totalCounts.cow - corralledCounts.cow,
                    goat: totalCounts.goat - corralledCounts.goat,
                },
            };

            JJ.Render.renderScene(ctx, gameState);

            // HUD - always show during gameplay (bark button needed for tutorial step 2)
            JJ.UI.drawHUD(ctx, gameState);

            // Tutorial prompts
            if (levelNumber === 0 && tutorialStep < 3) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(JJ.CANVAS_WIDTH / 2 - 350, JJ.CANVAS_HEIGHT - 100, 700, 50, 10);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(tutorialPrompts[tutorialStep], JJ.CANVAS_WIDTH / 2, JJ.CANVAS_HEIGHT - 70);
            }
        },

        onPause() { isPaused = true; this.isPaused = true; },
        onResume() { isPaused = false; this.isPaused = false; },
        onExit() { isComplete = true; },
    };
};


// === PAUSE SCENE ===
JJ.Scenes.Pause = function () {
    const buttons = [
        { label: 'Resume', action: 'resume' },
        { label: 'Restart Level', action: 'restart' },
        { label: 'Quit to Menu', action: 'quit' },
    ];

    function getButtonRect(i) {
        const bw = 220, bh = 48;
        const x = JJ.CANVAS_WIDTH / 2 - bw / 2;
        const y = 440 + i * 64;
        return { x, y, w: bw, h: bh };
    }

    return {
        name: 'pause',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onClick);
            JJ.Engine.getCanvas().addEventListener('touchstart', this._onTouch);
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onClick);
            JJ.Engine.getCanvas().removeEventListener('touchstart', this._onTouch);
        },
        _onClick(e) { handlePauseClick(e.clientX, e.clientY); },
        _onTouch(e) { e.preventDefault(); handlePauseClick(e.touches[0].clientX, e.touches[0].clientY); },
        update(dt) {},
        render(ctx) {
            // Dim overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Paused', JJ.CANVAS_WIDTH / 2, 380);

            buttons.forEach((btn, i) => {
                const r = getButtonRect(i);
                ctx.fillStyle = 'rgba(50, 48, 45, 0.9)';
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 8);
                ctx.fill();
                ctx.strokeStyle = '#6a6560';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#e0dbd4';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(btn.label, r.x + r.w / 2, r.y + r.h / 2 + 7);
            });
        },
    };

    function handlePauseClick(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const canvas = JJ.Engine.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const cx = (clientX - rect.left) / scale;
        const cy = (clientY - rect.top) / scale;

        buttons.forEach((btn, i) => {
            const r = getButtonRect(i);
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                switch (btn.action) {
                    case 'resume':
                        JJ.Engine.popScene();
                        break;
                    case 'restart':
                        JJ.Engine.popScene();
                        const scene = JJ.Engine.currentScene();
                        const lvl = scene && scene.name === 'gameplay' ? scene.levelNumber : 1;
                        JJ.Engine.replaceScene(JJ.Scenes.Gameplay(JJ.Save.getData().currentLevel || 1));
                        break;
                    case 'quit':
                        JJ.Save.save();
                        JJ.Engine.popScene();
                        JJ.Engine.replaceScene(JJ.Scenes.MainMenu());
                        break;
                }
            }
        });
    }
};

// === LEVEL END SCENE ===
JJ.Scenes.LevelEnd = function (levelNumber, result) {
    // Load background images
    let bgImage = null;
    let bgLoaded = false;
    const bgSrc = (result && result.timedOut) ? 'assets/game-over-bg.jpg' : 'assets/level-complete-bg.jpg';
    bgImage = new Image();
    bgImage.onload = function () { bgLoaded = true; };
    bgImage.src = bgSrc;

    // Buttons setup
    const buttons = [];

    if (result && result.timedOut) {
        // Time's Up screen: Try Again + Next Level
        buttons.push({ label: 'TRY AGAIN', action: 'replay' });
        if (!JJ.Levels.isLastLevel(levelNumber)) {
            buttons.push({ label: 'NEXT LEVEL', action: 'next' });
        }
    } else if (levelNumber === 0) {
        // Tutorial Complete
        buttons.push({ label: 'START LEVEL 1', action: 'next' });
    } else if (JJ.Levels.isLastLevel(levelNumber)) {
        buttons.push({ label: 'VICTORY! BACK TO MENU', action: 'menu' });
    } else {
        // Level Complete
        buttons.push({ label: 'NEXT LEVEL', action: 'next' });
    }

    function getButtonRect(i) {
        const bw = 300, bh = 56;
        const x = JJ.CANVAS_WIDTH / 2 - bw / 2;
        const y = 560 + i * 72;
        return { x, y, w: bw, h: bh };
    }

    return {
        name: 'levelend',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onClick);
            JJ.Engine.getCanvas().addEventListener('touchend', this._onTouch);
            // Play level complete music only on successful non-tutorial completion
            if (JJ.Audio && result && !result.timedOut && levelNumber !== 0) JJ.Audio.playLevelComplete();
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onClick);
            JJ.Engine.getCanvas().removeEventListener('touchend', this._onTouch);
            // Stop level complete music when leaving; ambient continues into next level
            if (JJ.Audio) JJ.Audio.stopMusic();
        },
        _onClick(e) { handleEndClick(e.clientX, e.clientY); },
        _onTouch(e) {
            e.preventDefault();
            if (e.changedTouches && e.changedTouches[0]) {
                handleEndClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
        },
        update(dt) {},
        render(ctx) {
            // Photo background
            if (bgLoaded) {
                ctx.drawImage(bgImage, 0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            } else {
                ctx.fillStyle = '#1a2a1a';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            }

            // Title (moved up 30px)
            let title;
            if (levelNumber === 0) {
                title = 'Tutorial Complete!';
            } else if (result && result.timedOut) {
                title = "Time's Up!";
            } else if (JJ.Levels.isLastLevel(levelNumber)) {
                title = 'Congratulations!';
            } else {
                title = 'Level Complete!';
            }
            ctx.fillStyle = (result && result.timedOut) ? '#e74c3c' : '#f5a623';
            ctx.font = 'bold 48px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, JJ.CANVAS_WIDTH / 2, 170);

            if (result) {
                // Stars (moved up 30px)
                const starStr = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
                ctx.fillStyle = '#FFD700';
                ctx.font = '60px sans-serif';
                ctx.fillText(starStr, JJ.CANVAS_WIDTH / 2, 270);

                // Score breakdown (moved up 30px)
                ctx.fillStyle = '#fff';
                ctx.font = '22px sans-serif';
                let y = 350;
                ctx.fillText('Sheep: ' + result.sheepPoints + ' pts', JJ.CANVAS_WIDTH / 2, y); y += 36;
                ctx.fillText('Cows: ' + result.cowPoints + ' pts', JJ.CANVAS_WIDTH / 2, y); y += 36;
                ctx.fillText('Goats: ' + result.goatPoints + ' pts', JJ.CANVAS_WIDTH / 2, y); y += 36;
                if (result.timeBonus > 0) {
                    ctx.fillStyle = '#8BC34A';
                    ctx.fillText('Time Bonus: ' + result.timeBonus + (result.speedMultiplier > 1 ? ' (1.5x speed!)' : ''), JJ.CANVAS_WIDTH / 2, y);
                    y += 36;
                }
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 28px sans-serif';
                ctx.fillText('Total: ' + result.totalScore, JJ.CANVAS_WIDTH / 2, y + 20);
            }

            // Buttons (all caps, Rye font)
            buttons.forEach((btn, i) => {
                const r = getButtonRect(i);
                ctx.fillStyle = 'rgba(55, 52, 48, 0.95)';
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 10);
                ctx.fill();
                ctx.strokeStyle = '#7a7570';
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.fillStyle = '#e0dbd4';
                ctx.font = 'bold 22px Rye, Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText(btn.label, r.x + r.w / 2, r.y + r.h / 2 + 8);
            });
        },
    };

    function handleEndClick(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const canvas = JJ.Engine.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const cx = (clientX - rect.left) / scale;
        const cy = (clientY - rect.top) / scale;

        // Check buttons
        buttons.forEach((btn, i) => {
            const r = getButtonRect(i);
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                executeAction(btn.action);
            }
        });
    }

    function executeAction(action) {
        switch (action) {
            case 'next':
                const nextLevel = levelNumber === 0 ? 1 : levelNumber + 1;
                JJ.Engine.replaceScene(JJ.Scenes.Gameplay(nextLevel));
                break;
            case 'replay':
                JJ.Engine.replaceScene(JJ.Scenes.Gameplay(levelNumber));
                break;
            case 'menu':
                JJ.Engine.replaceScene(JJ.Scenes.MainMenu());
                break;
        }
    }
};

// === LEVEL SELECT SCENE ===
JJ.Scenes.LevelSelect = function () {
    const save = JJ.Save.getData();

    function getLevelRect(i) {
        const cols = 4;
        const bw = 160, bh = 120;
        const gap = 30;
        const totalW = cols * bw + (cols - 1) * gap;
        const startX = JJ.CANVAS_WIDTH / 2 - totalW / 2;
        const col = i % cols;
        const row = Math.floor(i / cols);
        return { x: startX + col * (bw + gap), y: 300 + row * (bh + gap), w: bw, h: bh };
    }

    return {
        name: 'levelselect',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onClick);
            JJ.Engine.getCanvas().addEventListener('touchstart', this._onTouch);
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onClick);
            JJ.Engine.getCanvas().removeEventListener('touchstart', this._onTouch);
        },
        _onClick(e) { handleSelectClick(e.clientX, e.clientY); },
        _onTouch(e) { e.preventDefault(); handleSelectClick(e.touches[0].clientX, e.touches[0].clientY); },
        update(dt) {},
        render(ctx) {
            ctx.fillStyle = '#1a2a1a';
            ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 40px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Level Select', JJ.CANVAS_WIDTH / 2, 200);

            // Tutorial + 6 levels = 7 cards
            const levels = [0, 1, 2, 3, 4, 5, 6];
            levels.forEach((lvl, i) => {
                const r = getLevelRect(i);
                const unlocked = lvl === 0 || lvl <= (save.currentLevel || 1);
                const stars = save.starRatings[lvl] || 0;

                ctx.fillStyle = unlocked ? 'rgba(50, 48, 45, 0.9)' : 'rgba(30, 30, 28, 0.6)';
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 10);
                ctx.fill();

                if (unlocked) {
                    ctx.strokeStyle = '#6a6560';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                ctx.fillStyle = unlocked ? '#fff' : '#666';
                ctx.font = 'bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(lvl === 0 ? 'Tutorial' : 'Level ' + lvl, r.x + r.w / 2, r.y + 45);

                if (stars > 0) {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = '24px sans-serif';
                    ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), r.x + r.w / 2, r.y + 85);
                }

                if (!unlocked) {
                    ctx.fillStyle = '#888';
                    ctx.font = '30px sans-serif';
                    ctx.fillText('🔒', r.x + r.w / 2, r.y + 85);
                }
            });

            // Back button
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.beginPath();
            ctx.roundRect(20, 20, 100, 40, 8);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('← Back', 70, 46);
        },
    };

    function handleSelectClick(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const canvas = JJ.Engine.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const cx = (clientX - rect.left) / scale;
        const cy = (clientY - rect.top) / scale;

        // Back button
        if (cx >= 20 && cx <= 120 && cy >= 20 && cy <= 60) {
            JJ.Engine.replaceScene(JJ.Scenes.MainMenu());
            return;
        }

        const levels = [0, 1, 2, 3, 4, 5, 6];
        levels.forEach((lvl, i) => {
            const r = getLevelRect(i);
            const unlocked = lvl === 0 || lvl <= (save.currentLevel || 1);
            if (unlocked && cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                JJ.Engine.replaceScene(JJ.Scenes.Gameplay(lvl));
            }
        });
    }
};

// === SETTINGS SCENE ===
JJ.Scenes.Settings = function () {
    return {
        name: 'settings',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onClick);
            JJ.Engine.getCanvas().addEventListener('touchstart', this._onTouch);
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onClick);
            JJ.Engine.getCanvas().removeEventListener('touchstart', this._onTouch);
        },
        _onClick(e) { handleSettingsClick(e.clientX, e.clientY); },
        _onTouch(e) { e.preventDefault(); handleSettingsClick(e.touches[0].clientX, e.touches[0].clientY); },
        update(dt) {},
        render(ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 40px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Settings', JJ.CANVAS_WIDTH / 2, 250);

            const settings = JJ.Save.getAudioSettings();
            const labels = ['SFX Volume', 'Music Volume', 'Ambient Volume'];
            const keys = ['sfx', 'music', 'ambient'];

            labels.forEach((label, i) => {
                const y = 340 + i * 70;
                ctx.fillStyle = '#ccc';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(label, JJ.CANVAS_WIDTH / 2 - 200, y);

                // Volume bar
                const barX = JJ.CANVAS_WIDTH / 2 + 20;
                const barW = 200;
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, y - 12, barW, 16);
                ctx.fillStyle = '#4a7c3f';
                ctx.fillRect(barX, y - 12, barW * settings[keys[i]], 16);
                ctx.strokeStyle = '#666';
                ctx.strokeRect(barX, y - 12, barW, 16);
            });

            // Bark button position
            const barkPos = JJ.Save.getBarkButtonPosition();
            ctx.fillStyle = '#ccc';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Bark Button: ' + barkPos.toUpperCase(), JJ.CANVAS_WIDTH / 2 - 200, 560);

            // Reset progress
            ctx.fillStyle = 'rgba(180, 50, 50, 0.8)';
            ctx.beginPath();
            ctx.roundRect(JJ.CANVAS_WIDTH / 2 - 100, 620, 200, 44, 8);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Reset Progress', JJ.CANVAS_WIDTH / 2, 648);

            // Close button
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.beginPath();
            ctx.roundRect(JJ.CANVAS_WIDTH / 2 - 60, 700, 120, 40, 8);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '18px sans-serif';
            ctx.fillText('Close', JJ.CANVAS_WIDTH / 2, 726);
        },
    };

    function handleSettingsClick(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const canvas = JJ.Engine.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const cx = (clientX - rect.left) / scale;
        const cy = (clientY - rect.top) / scale;

        // Volume bars
        const barX = JJ.CANVAS_WIDTH / 2 + 20;
        const barW = 200;
        const keys = ['sfx', 'music', 'ambient'];
        keys.forEach((key, i) => {
            const y = 340 + i * 70 - 12;
            if (cx >= barX && cx <= barX + barW && cy >= y && cy <= y + 16) {
                const vol = (cx - barX) / barW;
                JJ.Audio.setVolume(key, vol);
                const settings = JJ.Save.getAudioSettings();
                settings[key] = vol;
                JJ.Save.setAudioSettings(settings);
            }
        });

        // Bark button toggle
        if (cx >= JJ.CANVAS_WIDTH / 2 - 200 && cx <= JJ.CANVAS_WIDTH / 2 + 200 && cy >= 545 && cy <= 575) {
            const current = JJ.Save.getBarkButtonPosition();
            JJ.Save.setBarkButtonPosition(current === 'right' ? 'left' : 'right');
        }

        // Reset progress
        if (cx >= JJ.CANVAS_WIDTH / 2 - 100 && cx <= JJ.CANVAS_WIDTH / 2 + 100 && cy >= 620 && cy <= 664) {
            if (confirm('Reset all progress? This cannot be undone.')) {
                JJ.Save.clear();
            }
        }

        // Close
        if (cx >= JJ.CANVAS_WIDTH / 2 - 60 && cx <= JJ.CANVAS_WIDTH / 2 + 60 && cy >= 700 && cy <= 740) {
            JJ.Engine.popScene();
        }
    }
};

// === CREDITS SCENE ===
JJ.Scenes.Credits = function () {
    return {
        name: 'credits',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onClick);
            JJ.Engine.getCanvas().addEventListener('touchstart', this._onTouch);
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onClick);
            JJ.Engine.getCanvas().removeEventListener('touchstart', this._onTouch);
        },
        _onClick() { JJ.Engine.popScene(); },
        _onTouch(e) { e.preventDefault(); JJ.Engine.popScene(); },
        update(dt) {},
        render(ctx) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 40px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('Credits', JJ.CANVAS_WIDTH / 2, 300);

            ctx.fillStyle = '#ccc';
            ctx.font = '22px sans-serif';
            ctx.fillText('Jasper Junction', JJ.CANVAS_WIDTH / 2, 380);
            ctx.fillText('A Corgi Carnival Game', JJ.CANVAS_WIDTH / 2, 420);
            ctx.fillText('Starring Jasper the Pembroke Welsh Corgi', JJ.CANVAS_WIDTH / 2, 480);

            ctx.fillStyle = '#888';
            ctx.font = '16px sans-serif';
            ctx.fillText('Tap anywhere to close', JJ.CANVAS_WIDTH / 2, 600);
        },
    };
};


// === ATTRACT MODE ===
JJ.Scenes.Attract = function () {
    // Demo: AI-controlled Jasper herding animals using real game sprites
    let demoTimer = 0;
    const DEMO_DURATION = 20; // seconds
    let aiTarget = { x: JJ.CANVAS_WIDTH / 2, y: JJ.CANVAS_HEIGHT / 2 };
    let aiChangeTimer = 0;
    let bgImage = null;
    let bgLoaded = false;

    bgImage = new Image();
    bgImage.onload = function () { bgLoaded = true; };
    bgImage.src = 'assets/jasper-junction-background.jpg';

    // Load sprites directly for attract mode
    let sprites = {
        jasperStand: new Image(),
        jasperRun1: new Image(),
        jasperRun2: new Image(),
        sheep1: new Image(),
        sheep2: new Image(),
        cow1: new Image(),
        cow2: new Image(),
        goat1: new Image(),
        goat2: new Image(),
    };
    sprites.jasperStand.src = 'assets/jasper-stand.png';
    sprites.jasperRun1.src = 'assets/jasper-run-1.png';
    sprites.jasperRun2.src = 'assets/jasper-run-2.png';
    sprites.sheep1.src = 'assets/sheep-1.png';
    sprites.sheep2.src = 'assets/sheep-2.png';
    sprites.cow1.src = 'assets/cow-1.png';
    sprites.cow2.src = 'assets/cow-2.png';
    sprites.goat1.src = 'assets/goat-1.png';
    sprites.goat2.src = 'assets/goat-2.png';

    // Demo entities
    let jasper = {
        x: JJ.CANVAS_WIDTH / 2,
        y: JJ.CANVAS_HEIGHT * 0.6,
        vx: 0, vy: 0,
        speed: 130,
        frame: 0,
        frameTimer: 0,
        facing: 'left',
        moving: false,
    };

    let animals = [];
    function createDemoAnimal(type, x, y) {
        return {
            type: type,
            x: x, y: y,
            vx: 0, vy: 0,
            speed: 50 + Math.random() * 20,
            frame: 0,
            frameTimer: 0,
            facing: 'left',
            wanderTimer: Math.random() * 3,
        };
    }

    for (let i = 0; i < 4; i++) {
        animals.push(createDemoAnimal(JJ.EntityType.Sheep, 300 + Math.random() * 800, 300 + Math.random() * 250));
    }
    for (let i = 0; i < 3; i++) {
        animals.push(createDemoAnimal(JJ.EntityType.Cow, 300 + Math.random() * 800, 300 + Math.random() * 250));
    }
    for (let i = 0; i < 2; i++) {
        animals.push(createDemoAnimal(JJ.EntityType.Goat, 300 + Math.random() * 800, 300 + Math.random() * 250));
    }

    return {
        name: 'attract',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onInteract);
            JJ.Engine.getCanvas().addEventListener('touchstart', this._onInteract);
            window.addEventListener('keydown', this._onInteract);
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onInteract);
            JJ.Engine.getCanvas().removeEventListener('touchstart', this._onInteract);
            window.removeEventListener('keydown', this._onInteract);
        },
        _onInteract(e) {
            if (e.preventDefault) e.preventDefault();
            JJ.Engine.popScene();
        },
        update(dt) {
            demoTimer += dt;
            if (demoTimer >= DEMO_DURATION) {
                JJ.Engine.popScene();
                return;
            }

            // AI: Jasper moves toward a target that changes periodically
            aiChangeTimer -= dt;
            if (aiChangeTimer <= 0) {
                if (animals.length > 0) {
                    const target = animals[Math.floor(Math.random() * animals.length)];
                    aiTarget = { x: target.x + 80, y: target.y + 40 };
                }
                aiChangeTimer = 2 + Math.random() * 2;
            }

            // Move Jasper toward target
            const dx = aiTarget.x - jasper.x;
            const dy = aiTarget.y - jasper.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                jasper.vx = (dx / dist) * jasper.speed;
                jasper.vy = (dy / dist) * jasper.speed;
                jasper.facing = jasper.vx > 0 ? 'right' : 'left';
                jasper.moving = true;
            } else {
                jasper.vx = 0;
                jasper.vy = 0;
                jasper.moving = false;
            }
            jasper.x += jasper.vx * dt;
            jasper.y += jasper.vy * dt;
            jasper.x = Math.max(200, Math.min(JJ.CANVAS_WIDTH - 200, jasper.x));
            jasper.y = Math.max(280, Math.min(620, jasper.y));

            jasper.frameTimer += dt;
            if (jasper.frameTimer > 0.15) {
                jasper.frameTimer = 0;
                jasper.frame = (jasper.frame + 1) % 2;
            }

            // Move animals
            animals.forEach(a => {
                const adx = a.x - jasper.x;
                const ady = a.y - jasper.y;
                const adist = Math.sqrt(adx * adx + ady * ady);

                if (adist < 150) {
                    a.vx = (adx / adist) * a.speed * 1.5;
                    a.vy = (ady / adist) * a.speed * 1.5;
                } else {
                    a.wanderTimer -= dt;
                    if (a.wanderTimer <= 0) {
                        const angle = Math.random() * Math.PI * 2;
                        a.vx = Math.cos(angle) * a.speed * 0.4;
                        a.vy = Math.sin(angle) * a.speed * 0.4;
                        a.wanderTimer = 2 + Math.random() * 3;
                    }
                }

                a.x += a.vx * dt;
                a.y += a.vy * dt;
                a.x = Math.max(200, Math.min(JJ.CANVAS_WIDTH - 200, a.x));
                a.y = Math.max(280, Math.min(620, a.y));
                a.vx *= 0.95;
                a.vy *= 0.95;

                if (a.vx > 2) a.facing = 'right';
                else if (a.vx < -2) a.facing = 'left';

                a.frameTimer += dt;
                if (a.frameTimer > 0.2) {
                    a.frameTimer = 0;
                    a.frame = (a.frame + 1) % 2;
                }
            });
        },
        render(ctx) {
            // Background
            if (bgLoaded) {
                ctx.drawImage(bgImage, 0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            } else {
                ctx.fillStyle = '#4a7c3f';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            }

            // Sort all entities by Y for proper overlap
            const allEntities = [...animals, { isJasper: true, ...jasper }];
            allEntities.sort((a, b) => a.y - b.y);

            allEntities.forEach(e => {
                ctx.save();
                ctx.translate(e.x, e.y);
                if (e.facing === 'left') ctx.scale(-1, 1);

                if (e.isJasper) {
                    // Draw Jasper with real sprites
                    let sprite;
                    if (jasper.moving) {
                        sprite = jasper.frame === 0 ? sprites.jasperRun1 : sprites.jasperRun2;
                    } else {
                        sprite = sprites.jasperStand;
                    }
                    if (sprite.complete && sprite.naturalWidth > 0) {
                        ctx.drawImage(sprite, -48, -36, 96, 72);
                    }
                } else {
                    // Draw animal with real sprites
                    let sprite, drawW, drawH;
                    if (e.type === JJ.EntityType.Sheep) {
                        sprite = e.frame === 0 ? sprites.sheep1 : sprites.sheep2;
                        drawW = 100; drawH = 80;
                    } else if (e.type === JJ.EntityType.Cow) {
                        sprite = e.frame === 0 ? sprites.cow1 : sprites.cow2;
                        drawW = 128; drawH = 96;
                    } else {
                        sprite = e.frame === 0 ? sprites.goat1 : sprites.goat2;
                        drawW = 104; drawH = 88;
                    }
                    if (sprite.complete && sprite.naturalWidth > 0) {
                        ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
                    }
                }

                ctx.restore();
            });

            // "Tap to play" prompt (pulsing)
            const pulse = Math.sin(performance.now() * 0.004) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#fff';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Tap anywhere to play', JJ.CANVAS_WIDTH / 2, JJ.CANVAS_HEIGHT - 60);
            ctx.globalAlpha = 1;
        },
    };
};
