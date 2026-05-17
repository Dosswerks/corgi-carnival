/**
 * Jasper Junction - Scenes
 * MainMenu, Gameplay, Pause, LevelEnd, Tutorial scenes.
 */

'use strict';

JJ.Scenes = {};

// === MAIN MENU ===
JJ.Scenes.MainMenu = function () {
    const buttons = [
        { label: 'Tutorial', action: 'tutorial' },
        { label: 'New Game', action: 'newgame' },
    ];
    let logoImage = null;
    let logoLoaded = false;
    let bgImage = null;
    let bgLoaded = false;
    let activeButton = -1; // For hover/tap visual feedback

    // Load logo
    logoImage = new Image();
    logoImage.onload = function () { logoLoaded = true; };
    logoImage.src = 'assets/jasper-junction-logo.png';

    // Load menu background
    bgImage = new Image();
    bgImage.onload = function () { bgLoaded = true; };
    bgImage.src = 'assets/jasper-junction-menu-bg.jpg';

    function getButtonRect(i) {
        const bw = 260, bh = 52;
        const x = JJ.CANVAS_WIDTH / 2 - bw / 2;
        const y = 520 + i * 68;
        return { x, y, w: bw, h: bh };
    }

    return {
        name: 'mainmenu',
        onEnter() {
            const canvas = JJ.Engine.getCanvas();
            canvas.addEventListener('click', this._onClick);
            canvas.addEventListener('touchstart', this._onTouchStart);
            canvas.addEventListener('touchend', this._onTouchEnd);
            canvas.addEventListener('mousemove', this._onMouseMove);
            canvas.addEventListener('mouseleave', this._onMouseLeave);
        },
        onExit() {
            const canvas = JJ.Engine.getCanvas();
            canvas.removeEventListener('click', this._onClick);
            canvas.removeEventListener('touchstart', this._onTouchStart);
            canvas.removeEventListener('touchend', this._onTouchEnd);
            canvas.removeEventListener('mousemove', this._onMouseMove);
            canvas.removeEventListener('mouseleave', this._onMouseLeave);
        },
        _onClick(e) {
            handleMenuClick(e.clientX, e.clientY);
        },
        _onTouchStart(e) {
            e.preventDefault();
            const t = e.touches[0];
            const pos = getCanonicalPos(t.clientX, t.clientY);
            activeButton = getButtonAt(pos.x, pos.y);
        },
        _onTouchEnd(e) {
            e.preventDefault();
            if (activeButton >= 0) {
                executeMenuAction(buttons[activeButton].action);
            }
            activeButton = -1;
        },
        _onMouseMove(e) {
            const pos = getCanonicalPos(e.clientX, e.clientY);
            activeButton = getButtonAt(pos.x, pos.y);
        },
        _onMouseLeave() {
            activeButton = -1;
        },
        update(dt) {},
        render(ctx) {
            // Background
            if (bgLoaded) {
                ctx.drawImage(bgImage, 0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            } else {
                ctx.fillStyle = '#1a2a1a';
                ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
            }

            // Logo image
            if (logoLoaded) {
                const logoH = 320;
                const logoW = logoH * (logoImage.width / logoImage.height);
                const logoX = JJ.CANVAS_WIDTH / 2 - logoW / 2;
                const logoY = 50;
                ctx.drawImage(logoImage, logoX, logoY, logoW, logoH);
            } else {
                ctx.fillStyle = '#f5a623';
                ctx.font = 'bold 64px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillText('Jasper Junction', JJ.CANVAS_WIDTH / 2, 200);
            }

            // Tagline
            ctx.fillStyle = '#ccc';
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Herd sheep, cows & goats on a Welsh hillside', JJ.CANVAS_WIDTH / 2, 450);

            ctx.fillStyle = '#a8a4b8';
            ctx.font = '16px sans-serif';
            ctx.fillText('A Corgi Carnival Game', JJ.CANVAS_WIDTH / 2, 478);

            // Buttons with hover/active states
            buttons.forEach((btn, i) => {
                const r = getButtonRect(i);
                const isActive = (i === activeButton);

                if (isActive) {
                    ctx.fillStyle = 'rgba(100, 160, 80, 0.95)';
                    ctx.shadowColor = 'rgba(139, 195, 74, 0.5)';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.fillStyle = 'rgba(74, 124, 63, 0.8)';
                }

                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 8);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = isActive ? '#aade6a' : '#8BC34A';
                ctx.lineWidth = isActive ? 3 : 2;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(btn.label, r.x + r.w / 2, r.y + r.h / 2 + 7);
            });

            // Footer handled by HTML overlay (#title-overlay)
        },
    };

    function getCanonicalPos(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const canvas = JJ.Engine.getCanvas();
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / scale,
            y: (clientY - rect.top) / scale,
        };
    }

    function getButtonAt(cx, cy) {
        for (let i = 0; i < buttons.length; i++) {
            const r = getButtonRect(i);
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                return i;
            }
        }
        return -1;
    }

    function handleMenuClick(clientX, clientY) {
        const pos = getCanonicalPos(clientX, clientY);
        const idx = getButtonAt(pos.x, pos.y);
        if (idx >= 0) {
            executeMenuAction(buttons[idx].action);
        }
    }

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
        'Tap anywhere to move Jasper',
        'Get close to sheep to push them toward the pen',
        'Double-tap or press Space to bark (doubles your range!)',
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
                JJ.Audio.playAmbient();
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

                    // Check if animal is within the gate opening
                    if (animal.position.x >= gateX - 10 &&
                        animal.position.x <= gateX + gateW + 10 &&
                        animal.position.y < gateY + 20) {

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
                                    JJ.Audio.playSFX('gate_close');
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

                if (animal.stuckTimer >= 10 && now - animal.lastUnstuckTime >= 10) {
                    // Nudge in a random direction away from nearest boundary
                    const angle = Math.random() * Math.PI * 2;
                    animal.velocity.x = Math.cos(angle) * animal.baseSpeed * 0.5;
                    animal.velocity.y = Math.sin(angle) * animal.baseSpeed * 0.5;
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

            // Audio
            JJ.Audio.stopAll();
            if (result.timedOut) {
                JJ.Audio.playSFX('game_over');
            } else {
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

            // Confetti for 3 stars
            if (result.stars === 3 && !result.timedOut) {
                JJ.Effects.spawnConfetti({ x: JJ.CANVAS_WIDTH / 2, y: JJ.CANVAS_HEIGHT / 2 });
            }

            // Show level end
            setTimeout(() => {
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

            // HUD (not during tutorial intro)
            if (levelNumber !== 0 || tutorialStep > 0) {
                JJ.UI.drawHUD(ctx, gameState);
            }

            // Tutorial prompts
            if (levelNumber === 0 && tutorialStep < 3) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(JJ.CANVAS_WIDTH / 2 - 250, JJ.CANVAS_HEIGHT - 100, 500, 50, 10);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(tutorialPrompts[tutorialStep], JJ.CANVAS_WIDTH / 2, JJ.CANVAS_HEIGHT - 68);
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
                ctx.fillStyle = 'rgba(74, 124, 63, 0.9)';
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 8);
                ctx.fill();
                ctx.strokeStyle = '#8BC34A';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#fff';
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
    const buttons = [];
    if (levelNumber === 0) {
        buttons.push({ label: 'Start Level 1!', action: 'next' });
    } else if (JJ.Levels.isLastLevel(levelNumber)) {
        buttons.push({ label: 'Victory! Back to Menu', action: 'menu' });
    } else {
        buttons.push({ label: 'Next Level', action: 'next' });
        buttons.push({ label: 'Replay', action: 'replay' });
        buttons.push({ label: 'Menu', action: 'menu' });
    }

    function getButtonRect(i) {
        const bw = 200, bh = 44;
        const totalWidth = buttons.length * bw + (buttons.length - 1) * 20;
        const startX = JJ.CANVAS_WIDTH / 2 - totalWidth / 2;
        const x = startX + i * (bw + 20);
        const y = 700;
        return { x, y, w: bw, h: bh };
    }

    return {
        name: 'levelend',
        onEnter() {
            JJ.Engine.getCanvas().addEventListener('click', this._onClick);
            JJ.Engine.getCanvas().addEventListener('touchend', this._onTouch);
        },
        onExit() {
            JJ.Engine.getCanvas().removeEventListener('click', this._onClick);
            JJ.Engine.getCanvas().removeEventListener('touchend', this._onTouch);
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
            ctx.fillStyle = '#1a2a1a';
            ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

            // Title
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
            ctx.fillText(title, JJ.CANVAS_WIDTH / 2, 200);

            if (result) {
                // Stars
                const starStr = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
                ctx.fillStyle = '#FFD700';
                ctx.font = '60px sans-serif';
                ctx.fillText(starStr, JJ.CANVAS_WIDTH / 2, 300);

                // Score breakdown
                ctx.fillStyle = '#fff';
                ctx.font = '22px sans-serif';
                let y = 380;
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

            // Buttons
            buttons.forEach((btn, i) => {
                const r = getButtonRect(i);
                ctx.fillStyle = 'rgba(74, 124, 63, 0.9)';
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 8);
                ctx.fill();
                ctx.strokeStyle = '#8BC34A';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(btn.label, r.x + r.w / 2, r.y + r.h / 2 + 6);
            });
        },
    };

    function handleEndClick(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const canvas = JJ.Engine.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const cx = (clientX - rect.left) / scale;
        const cy = (clientY - rect.top) / scale;

        buttons.forEach((btn, i) => {
            const r = getButtonRect(i);
            if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) {
                switch (btn.action) {
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
        });
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

                ctx.fillStyle = unlocked ? 'rgba(74, 124, 63, 0.8)' : 'rgba(60, 60, 60, 0.6)';
                ctx.beginPath();
                ctx.roundRect(r.x, r.y, r.w, r.h, 10);
                ctx.fill();

                if (unlocked) {
                    ctx.strokeStyle = '#8BC34A';
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
