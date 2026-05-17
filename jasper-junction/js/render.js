/**
 * Jasper Junction - Render Manager
 * Handles all canvas drawing: background, entities, UI, effects.
 */

'use strict';

JJ.Render = (function () {
    let bgCanvas = null; // Offscreen background
    let bgImage = null; // Background image
    let bgImageLoaded = false;
    let screenShakeX = 0;
    let screenShakeY = 0;

    function init(ctx) {
        // Load background image
        bgImage = new Image();
        bgImage.onload = function() {
            bgImageLoaded = true;
        };
        bgImage.src = 'assets/jasper-junction-background.jpg';

        // Load custom Jasper sprites
        initJasperSprites();

        // Load custom animal sprites
        initAnimalSprites();
    }

    function drawBackground(ctx) {
        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, JJ.CANVAS_HEIGHT);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(0.3, '#B0E0E6');
        skyGrad.addColorStop(1, '#4a7c3f');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

        // Rolling hills (background layers)
        ctx.fillStyle = '#5a9c4a';
        ctx.beginPath();
        ctx.moveTo(0, 300);
        for (let x = 0; x <= JJ.CANVAS_WIDTH; x += 60) {
            ctx.lineTo(x, 280 + Math.sin(x * 0.005) * 40 + Math.sin(x * 0.012) * 20);
        }
        ctx.lineTo(JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
        ctx.lineTo(0, JJ.CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Main field
        ctx.fillStyle = '#4a8c3a';
        ctx.beginPath();
        ctx.moveTo(0, 400);
        for (let x = 0; x <= JJ.CANVAS_WIDTH; x += 40) {
            ctx.lineTo(x, 380 + Math.sin(x * 0.008) * 20);
        }
        ctx.lineTo(JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
        ctx.lineTo(0, JJ.CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Foreground grass
        ctx.fillStyle = '#3d7a30';
        ctx.fillRect(0, 500, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT - 500);

        // Stone walls (horizontal lines)
        ctx.strokeStyle = '#8a8a7a';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(0, 450);
        ctx.lineTo(JJ.CANVAS_WIDTH, 450);
        ctx.stroke();
        ctx.setLineDash([]);

        // Fence posts along bottom
        ctx.strokeStyle = '#5a4a3a';
        ctx.lineWidth = 4;
        for (let x = 50; x < JJ.CANVAS_WIDTH; x += 120) {
            ctx.beginPath();
            ctx.moveTo(x, JJ.CANVAS_HEIGHT - 5);
            ctx.lineTo(x, JJ.CANVAS_HEIGHT - 35);
            ctx.stroke();
        }
        // Fence rail
        ctx.strokeStyle = '#6a5a4a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, JJ.CANVAS_HEIGHT - 20);
        ctx.lineTo(JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT - 20);
        ctx.stroke();

        // Grass tufts
        ctx.fillStyle = '#2d6a22';
        for (let i = 0; i < 80; i++) {
            const gx = Math.random() * JJ.CANVAS_WIDTH;
            const gy = 500 + Math.random() * (JJ.CANVAS_HEIGHT - 520);
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx - 3, gy - 8);
            ctx.lineTo(gx + 1, gy - 6);
            ctx.lineTo(gx + 4, gy - 9);
            ctx.lineTo(gx + 2, gy);
            ctx.closePath();
            ctx.fill();
        }
    }

    function renderScene(ctx, gameState) {
        ctx.save();

        // Apply screen shake
        if (screenShakeX !== 0 || screenShakeY !== 0) {
            ctx.translate(screenShakeX, screenShakeY);
        }

        // Draw background
        if (bgImageLoaded) {
            ctx.drawImage(bgImage, 0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#4a7c3f';
            ctx.fillRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);
        }

        // Draw pens
        if (gameState && gameState.pens) {
            drawPens(ctx, gameState.pens, gameState);
        }

        // Draw entities sorted by Z-order
        if (gameState && gameState.entities) {
            const sorted = [...gameState.entities]
                .sort((a, b) => a.zOrder - b.zOrder || a.creationOrder - b.creationOrder);

            sorted.forEach(e => drawEntity(ctx, e));
        }

        ctx.restore();
    }

    function drawPens(ctx, pens, gameState) {
        pens.forEach(pen => {
            // Pens are part of the background image - only draw gate state

            // Gate
            const gateX = pen.gateX;
            const gateY = pen.gateY;
            const gateW = pen.gateWidth;

            if (pen.closed) {
                // Draw closed gate overlay
                ctx.fillStyle = 'rgba(90, 58, 26, 0.8)';
                ctx.fillRect(gateX, gateY - 8, gateW, 16);
                ctx.strokeStyle = '#3a2a0a';
                ctx.lineWidth = 2;
                ctx.strokeRect(gateX, gateY - 8, gateW, 16);
            }
        });
    }

    function drawEntity(ctx, entity) {
        ctx.save();
        ctx.translate(entity.position.x, entity.position.y);

        if (entity.facing === 'right') {
            ctx.scale(-1, 1);
        }

        switch (entity.type) {
            case JJ.EntityType.Jasper:
                drawJasper(ctx, entity);
                break;
            case JJ.EntityType.Sheep:
                drawSheep(ctx, entity);
                break;
            case JJ.EntityType.Cow:
                drawCow(ctx, entity);
                break;
            case JJ.EntityType.Goat:
                drawGoat(ctx, entity);
                break;
        }

        ctx.restore();

        // Draw state indicators (not flipped)
        drawStateIndicator(ctx, entity);
    }

    // === Custom Jasper Sprites ===
    let jasperSprites = {
        stand: null,
        run1: null,
        run2: null,
        loaded: false,
        loadCount: 0,
    };

    function initJasperSprites() {
        const onLoad = function () {
            jasperSprites.loadCount++;
            if (jasperSprites.loadCount >= 3) {
                jasperSprites.loaded = true;
            }
        };

        jasperSprites.stand = new Image();
        jasperSprites.stand.onload = onLoad;
        jasperSprites.stand.src = 'assets/jasper-stand.png';

        jasperSprites.run1 = new Image();
        jasperSprites.run1.onload = onLoad;
        jasperSprites.run1.src = 'assets/jasper-run-1.png';

        jasperSprites.run2 = new Image();
        jasperSprites.run2.onload = onLoad;
        jasperSprites.run2.src = 'assets/jasper-run-2.png';
    }

    function drawJasper(ctx, entity) {
        const anim = entity.animationState.currentAnimation;
        const frame = entity.animationState.currentFrame % 2;

        if (jasperSprites.loaded) {
            // Draw custom sprite
            let sprite;
            if (anim === 'run' || anim === 'bark') {
                sprite = frame === 0 ? jasperSprites.run1 : jasperSprites.run2;
            } else {
                sprite = jasperSprites.stand;
            }

            // Draw sprite centered on entity position
            const drawW = 64;
            const drawH = 48;
            ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);

            // Stun stars (still procedural overlay)
            if (anim === 'stunned') {
                const t = performance.now() * 0.005;
                for (let i = 0; i < 3; i++) {
                    const angle = t + (i * Math.PI * 2 / 3);
                    const sx = Math.cos(angle) * 15;
                    const sy = -18 + Math.sin(angle * 2) * 3;
                    ctx.fillStyle = '#FFD700';
                    ctx.font = '10px sans-serif';
                    ctx.fillText('★', sx - 4, sy);
                }
            }
        } else {
            // Fallback: procedural drawing while sprites load
            drawJasperProcedural(ctx, entity);
        }
    }

    function drawJasperProcedural(ctx, entity) {
        const anim = entity.animationState.currentAnimation;
        const frame = entity.animationState.currentFrame % 2;
        const bo = anim === 'idle' ? Math.sin(performance.now() * 0.003) * 0.5 : 0;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 4 + bo, 20, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#c4813a';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, 2 + bo, 20, 10, 0, Math.PI, 0);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(-20, -3 + bo, 40, 14, [0, 0, 8, 8]);
        ctx.fillStyle = '#c4813a';
        ctx.fill();

        ctx.beginPath();
        ctx.rect(-18, -5 + bo, 36, 8);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(0, -3 + bo, 21, 7, 0, Math.PI, 0);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        // White chest
        ctx.beginPath();
        ctx.ellipse(-12, 3 + bo, 9, 9, 1.1, -0.3, Math.PI * 0.8);
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();

        // Tan belly
        ctx.beginPath();
        ctx.ellipse(0, 6 + bo, 16, 5, 0, 0, Math.PI);
        ctx.fillStyle = '#d4954a';
        ctx.fill();

        // Rump
        ctx.beginPath();
        ctx.ellipse(19, 2 + bo, 4, 8, 0.05, 0, Math.PI * 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(19, 5 + bo, 3, 4, 0, -0.2, Math.PI);
        ctx.fillStyle = '#a06828';
        ctx.fill();

        // Legs
        const legY = 8 + bo;
        if (anim === 'run') {
            const legAngle = frame === 0 ? 0.3 : -0.3;
            drawCorgiLeg(ctx, -11, legY, -legAngle, '#f5f0e8');
            drawCorgiLeg(ctx, -7, legY, legAngle, '#c4813a');
            drawCorgiLeg(ctx, 7, legY, legAngle, '#c4813a');
            drawCorgiLeg(ctx, 11, legY, -legAngle, '#a06828');
        } else {
            drawCorgiLeg(ctx, -11, legY, 0, '#f5f0e8');
            drawCorgiLeg(ctx, -7, legY, 0, '#c4813a');
            drawCorgiLeg(ctx, 7, legY, 0, '#c4813a');
            drawCorgiLeg(ctx, 11, legY, 0, '#a06828');
        }

        // Neck ruff
        ctx.beginPath();
        ctx.ellipse(-12, -3 + bo, 7, 9, -0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();

        // Head
        const headX = -18;
        const headY = -6 + bo;

        ctx.beginPath();
        ctx.ellipse(headX, headY, 7.5, 7, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#c4813a';
        ctx.fill();

        // Black mask
        ctx.beginPath();
        ctx.ellipse(headX, headY - 3, 7, 4, -0.1, Math.PI, 0);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        // White blaze
        ctx.beginPath();
        ctx.moveTo(headX - 1, headY - 7);
        ctx.lineTo(headX + 1, headY - 7);
        ctx.lineTo(headX + 1.5, headY - 2);
        ctx.lineTo(headX - 1.5, headY - 2);
        ctx.closePath();
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();

        // White muzzle
        ctx.beginPath();
        ctx.ellipse(headX - 4, headY + 2, 4, 3, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();

        // Nose
        ctx.beginPath();
        ctx.ellipse(headX - 7, headY + 1, 2, 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(headX - 2, headY - 1, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#3d2b1a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(headX - 2.5, headY - 1.8, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Tan cheek
        ctx.beginPath();
        ctx.ellipse(headX - 1, headY + 1, 3, 2.5, 0, 0, Math.PI);
        ctx.fillStyle = '#d4954a';
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.moveTo(headX + 2, headY - 5);
        ctx.lineTo(headX + 5, headY - 13);
        ctx.lineTo(headX + 7, headY - 5);
        ctx.closePath();
        ctx.fillStyle = '#3d3530';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(headX - 1, headY - 5);
        ctx.lineTo(headX + 1, headY - 14);
        ctx.lineTo(headX + 4, headY - 5);
        ctx.closePath();
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(headX, headY - 6);
        ctx.lineTo(headX + 1.5, headY - 12);
        ctx.lineTo(headX + 3, headY - 6);
        ctx.closePath();
        ctx.fillStyle = '#c49060';
        ctx.fill();

        // Bark mouth
        if (anim === 'bark') {
            ctx.beginPath();
            ctx.ellipse(headX - 5, headY + 3, 3.5, 2.5, -0.1, 0, Math.PI);
            ctx.fillStyle = '#b04050';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(headX - 5, headY + 4, 2, 1.5, 0, 0, Math.PI);
            ctx.fillStyle = '#d45a6a';
            ctx.fill();
        }

        // Stun stars
        if (anim === 'stunned') {
            const t = performance.now() * 0.005;
            for (let i = 0; i < 3; i++) {
                const angle = t + (i * Math.PI * 2 / 3);
                const sx = Math.cos(angle) * 15;
                const sy = -18 + Math.sin(angle * 2) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.font = '10px sans-serif';
                ctx.fillText('★', sx - 4, sy);
            }
        }
    }

    function drawCorgiLeg(ctx, x, y, angle, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.roundRect(-2, 0, 4, 8, 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 9, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f0e8';
        ctx.fill();
        ctx.restore();
    }

    // === Custom Animal Sprites ===
    let animalSprites = {
        sheep: { frame1: null, frame2: null, loaded: false, loadCount: 0 },
        cow: { frame1: null, frame2: null, loaded: false, loadCount: 0 },
        goat: { frame1: null, frame2: null, loaded: false, loadCount: 0 },
    };

    function initAnimalSprites() {
        function loadPair(key, src1, src2) {
            const onLoad = function () {
                animalSprites[key].loadCount++;
                if (animalSprites[key].loadCount >= 2) {
                    animalSprites[key].loaded = true;
                }
            };
            animalSprites[key].frame1 = new Image();
            animalSprites[key].frame1.onload = onLoad;
            animalSprites[key].frame1.src = src1;
            animalSprites[key].frame2 = new Image();
            animalSprites[key].frame2.onload = onLoad;
            animalSprites[key].frame2.src = src2;
        }

        loadPair('sheep', 'assets/sheep-1.png', 'assets/sheep-2.png');
        loadPair('cow', 'assets/cow-1.png', 'assets/cow-2.png');
        loadPair('goat', 'assets/goat-1.png', 'assets/goat-2.png');
    }

    function drawSheep(ctx, entity) {
        const frame = entity.animationState.currentFrame % 2;

        if (animalSprites.sheep.loaded) {
            const sprite = frame === 0 ? animalSprites.sheep.frame1 : animalSprites.sheep.frame2;
            const drawW = 48;
            const drawH = 40;
            ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            drawSheepProcedural(ctx, entity);
        }
    }

    function drawCow(ctx, entity) {
        const frame = entity.animationState.currentFrame % 2;

        if (animalSprites.cow.loaded) {
            const sprite = frame === 0 ? animalSprites.cow.frame1 : animalSprites.cow.frame2;
            const drawW = 56;
            const drawH = 48;
            ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            drawCowProcedural(ctx, entity);
        }
    }

    function drawGoat(ctx, entity) {
        const frame = entity.animationState.currentFrame % 2;

        if (animalSprites.goat.loaded) {
            const sprite = frame === 0 ? animalSprites.goat.frame1 : animalSprites.goat.frame2;
            const drawW = 44;
            const drawH = 44;
            ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            drawGoatProcedural(ctx, entity);
        }
    }

    function drawSheepProcedural(ctx, entity) {
        const frame = entity.animationState.currentFrame % 2;
        const bob = frame === 0 ? 0 : -1;

        // Woolly body
        ctx.beginPath();
        ctx.ellipse(0, bob, 18, 14, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();

        // Wool texture bumps
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bx = Math.cos(angle) * 12;
            const by = Math.sin(angle) * 9 + bob;
            ctx.beginPath();
            ctx.arc(bx, by, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#e8e8e8';
            ctx.fill();
        }

        // Head
        ctx.beginPath();
        ctx.ellipse(-14, -2 + bob, 7, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(-16, -3 + bob, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-16, -3 + bob, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.ellipse(-11, -5 + bob, 4, 2, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();

        // Legs
        ctx.fillStyle = '#2a2a2a';
        const legOff = frame === 0 ? 2 : -2;
        ctx.fillRect(-8 + legOff, 12, 3, 8);
        ctx.fillRect(-3, 12, 3, 8);
        ctx.fillRect(4, 12, 3, 8);
        ctx.fillRect(9 - legOff, 12, 3, 8);
    }

    function drawCowProcedural(ctx, entity) {
        const frame = entity.animationState.currentFrame % 2;
        const bob = frame === 0 ? 0 : -1;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, bob, 22, 14, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f5f5';
        ctx.fill();

        // Spots
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.ellipse(-6, -4 + bob, 7, 5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(8, 2 + bob, 6, 4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(2, 6 + bob, 4, 3, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(-18, -2 + bob, 8, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f5f5';
        ctx.fill();

        // Muzzle
        ctx.beginPath();
        ctx.ellipse(-22, 1 + bob, 5, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffccaa';
        ctx.fill();

        // Nostrils
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-23, 1 + bob, 1, 0, Math.PI * 2);
        ctx.arc(-21, 1 + bob, 1, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.beginPath();
        ctx.arc(-16, -4 + bob, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();

        // Horns
        ctx.strokeStyle = '#d4c4a0';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, -8 + bob);
        ctx.quadraticCurveTo(-17, -14 + bob, -14, -15 + bob);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, -8 + bob);
        ctx.quadraticCurveTo(-10, -14 + bob, -13, -15 + bob);
        ctx.stroke();

        // Ears
        ctx.beginPath();
        ctx.ellipse(-10, -6 + bob, 4, 2.5, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f5f5f5';
        ctx.fill();

        // Legs
        ctx.fillStyle = '#f5f5f5';
        const legOff = frame === 0 ? 2 : -2;
        ctx.fillRect(-10 + legOff, 12, 4, 10);
        ctx.fillRect(-4, 12, 4, 10);
        ctx.fillRect(4, 12, 4, 10);
        ctx.fillRect(10 - legOff, 12, 4, 10);
        // Hooves
        ctx.fillStyle = '#333';
        ctx.fillRect(-10 + legOff, 20, 4, 3);
        ctx.fillRect(-4, 20, 4, 3);
        ctx.fillRect(4, 20, 4, 3);
        ctx.fillRect(10 - legOff, 20, 4, 3);
    }

    function drawGoatProcedural(ctx, entity) {
        const frame = entity.animationState.currentFrame % 2;
        const bob = frame === 0 ? 0 : -2; // Goats bounce more

        // Body (lean)
        ctx.beginPath();
        ctx.ellipse(0, bob, 16, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#a08060';
        ctx.fill();

        // Darker back
        ctx.beginPath();
        ctx.ellipse(0, -3 + bob, 14, 6, 0, Math.PI, 0);
        ctx.fillStyle = '#7a6040';
        ctx.fill();

        // White belly
        ctx.beginPath();
        ctx.ellipse(0, 4 + bob, 10, 5, 0, 0, Math.PI);
        ctx.fillStyle = '#e8e0d0';
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(-14, -4 + bob, 6, 5.5, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#a08060';
        ctx.fill();

        // Muzzle
        ctx.beginPath();
        ctx.ellipse(-18, -2 + bob, 3.5, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#c0a080';
        ctx.fill();

        // Nose
        ctx.beginPath();
        ctx.ellipse(-20, -2 + bob, 1.5, 1, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();

        // Eye
        ctx.beginPath();
        ctx.arc(-13, -5 + bob, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700'; // Goat eyes are golden
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-13, -5 + bob, 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();

        // Horns (curved back)
        ctx.strokeStyle = '#d4c4a0';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-12, -8 + bob);
        ctx.quadraticCurveTo(-8, -16 + bob, -4, -14 + bob);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-10, -8 + bob);
        ctx.quadraticCurveTo(-6, -15 + bob, -2, -13 + bob);
        ctx.stroke();

        // Beard
        ctx.beginPath();
        ctx.moveTo(-17, 0 + bob);
        ctx.quadraticCurveTo(-18, 5 + bob, -16, 6 + bob);
        ctx.strokeStyle = '#7a6040';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Ears (floppy)
        ctx.beginPath();
        ctx.ellipse(-10, -3 + bob, 4, 2, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#8a6a4a';
        ctx.fill();

        // Legs (thin)
        ctx.fillStyle = '#a08060';
        const legOff = frame === 0 ? 3 : -3;
        ctx.fillRect(-7 + legOff, 9, 3, 11);
        ctx.fillRect(-3, 9, 3, 11);
        ctx.fillRect(3, 9, 3, 11);
        ctx.fillRect(7 - legOff, 9, 3, 11);
        // Hooves
        ctx.fillStyle = '#333';
        ctx.fillRect(-7 + legOff, 18, 3, 3);
        ctx.fillRect(-3, 18, 3, 3);
        ctx.fillRect(3, 18, 3, 3);
        ctx.fillRect(7 - legOff, 18, 3, 3);
    }

    function drawStateIndicator(ctx, entity) {
        // Removed - goat state indicators were too small to be useful
    }

    function setScreenShake(x, y) {
        screenShakeX = x;
        screenShakeY = y;
    }

    function clearScreenShake() {
        screenShakeX = 0;
        screenShakeY = 0;
    }

    return {
        init,
        renderScene,
        setScreenShake,
        clearScreenShake,
        drawBackground,
    };
})();
