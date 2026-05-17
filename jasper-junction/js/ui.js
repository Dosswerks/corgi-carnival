/**
 * Jasper Junction - UI Manager
 * HUD rendering, bark cooldown, directional indicators, menus.
 */

'use strict';

JJ.UI = (function () {
    function drawHUD(ctx, gameState) {
        if (!gameState) return;

        ctx.save();

        // === HUD in lower-right corner ===
        const hudX = JJ.CANVAS_WIDTH - 300;
        const hudY = 750;

        // Timer (countdown)
        const remaining = Math.max(0, (gameState.maxTime || 120) - gameState.elapsedTime);
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        const timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, 280, 130, 10);
        ctx.fill();

        // Level number
        ctx.fillStyle = '#f5a623';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        const levelText = gameState.levelNumber === 0 ? 'Tutorial' : 'Level ' + gameState.levelNumber;
        ctx.fillText(levelText, hudX + 12, hudY + 24);

        // Timer
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(timeStr, hudX + 268, hudY + 24);

        // Animal counts
        const counts = gameState.remainingCounts || { sheep: 0, cow: 0, goat: 0 };
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText('🐑 ' + counts.sheep + ' remaining', hudX + 12, hudY + 55);
        ctx.fillText('🐄 ' + counts.cow + ' remaining', hudX + 12, hudY + 80);
        ctx.fillText('🐐 ' + counts.goat + ' remaining', hudX + 12, hudY + 105);

        // Score
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Score: ' + gameState.score, hudX + 268, hudY + 118);

        // Bark cooldown indicator (near Jasper)
        drawBarkIndicator(ctx, gameState);

        // Bark button
        drawBarkButton(ctx);

        // Pause button (top-right)
        drawPauseButton(ctx);

        // Directional indicators
        drawDirectionalIndicators(ctx, gameState);

        // AFK prompt
        if (gameState.jasper && gameState.jasper.idleTimer >= 15) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(JJ.CANVAS_WIDTH / 2 - 120, JJ.CANVAS_HEIGHT / 2 - 20, 240, 40, 8);
            ctx.fill();
            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Keep herding!', JJ.CANVAS_WIDTH / 2, JJ.CANVAS_HEIGHT / 2 + 6);
        }

        ctx.restore();
    }

    function drawAnimalCounts(ctx, gameState) {
        const counts = gameState.remainingCounts || { sheep: 0, cow: 0, goat: 0 };
        const x = JJ.CANVAS_WIDTH / 2 + 100;
        const y = 225;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(x, y, 200, 36, 8);
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';

        // Sheep
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText('🐑' + counts.sheep, x + 35, y + 24);
        // Cow
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText('🐄' + counts.cow, x + 100, y + 24);
        // Goat
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText('🐐' + counts.goat, x + 165, y + 24);
    }

    function drawBarkIndicator(ctx, gameState) {
        if (!gameState.jasper) return;
        const jasper = gameState.jasper;
        const cooldown = JJ.Input.getBarkCooldownRemaining();
        const ready = cooldown <= 0;

        const ix = jasper.position.x + 30;
        const iy = jasper.position.y - 30;

        // Cooldown circle
        ctx.beginPath();
        ctx.arc(ix, iy, 12, 0, Math.PI * 2);
        ctx.fillStyle = ready ? 'rgba(245, 166, 35, 0.8)' : 'rgba(100, 100, 100, 0.6)';
        ctx.fill();

        if (!ready) {
            // Draw cooldown arc
            const progress = 1 - (cooldown / JJ.Input.BARK_COOLDOWN);
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.arc(ix, iy, 12, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = 'rgba(245, 166, 35, 0.6)';
            ctx.fill();
        } else {
            // Ready pulse
            const pulse = Math.sin(performance.now() * 0.005) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.arc(ix, iy, 14, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(245, 166, 35, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Bark icon
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔊', ix, iy + 4);
    }

    function drawBarkButton(ctx) {
        const pos = JJ.Save ? JJ.Save.getBarkButtonPosition() : 'right';
        const bx = pos === 'right' ? JJ.CANVAS_WIDTH - 70 : 70;
        const by = JJ.CANVAS_HEIGHT - 70;
        const ready = JJ.Input.isBarkReady();

        ctx.beginPath();
        ctx.arc(bx, by, 30, 0, Math.PI * 2);
        ctx.fillStyle = ready ? 'rgba(245, 166, 35, 0.8)' : 'rgba(100, 100, 100, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BARK', bx, by + 5);
    }

    function drawPauseButton(ctx) {
        const px = JJ.CANVAS_WIDTH - 40;
        const py = 40;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.roundRect(px - 18, py - 18, 36, 36, 6);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 8, py - 10, 5, 20);
        ctx.fillRect(px + 3, py - 10, 5, 20);
    }

    function drawDirectionalIndicators(ctx, gameState) {
        if (!gameState.jasper) return;
        const jasper = gameState.jasper;
        const threshold = Math.max(JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT) * 0.8;

        const uncorralled = JJ.Entities.getUncorralledAnimals();
        uncorralled.forEach(animal => {
            const dx = animal.position.x - jasper.position.x;
            const dy = animal.position.y - jasper.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > threshold) {
                const angle = Math.atan2(dy, dx);
                const edgeX = jasper.position.x + Math.cos(angle) * 150;
                const edgeY = jasper.position.y + Math.sin(angle) * 150;

                ctx.save();
                ctx.translate(edgeX, edgeY);
                ctx.rotate(angle);
                ctx.fillStyle = 'rgba(255, 200, 50, 0.7)';
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(-5, -6);
                ctx.lineTo(-5, 6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        });
    }

    return {
        drawHUD,
    };
})();
