/**
 * Jasper Junction - Effects Manager
 * Particle system, screen shake, floating text.
 */

'use strict';

JJ.Effects = (function () {
    let particles = [];
    let shakeAmplitude = 0;
    let shakeDuration = 0;
    let shakeTimer = 0;
    const MAX_PARTICLES = 400;

    function init() {
        particles = [];
    }

    function update(dt) {
        // Update screen shake
        if (shakeTimer > 0) {
            shakeTimer -= dt;
            if (shakeTimer <= 0) {
                shakeTimer = 0;
                JJ.Render.clearScreenShake();
            } else {
                const intensity = shakeTimer / shakeDuration;
                const sx = (Math.random() - 0.5) * 2 * shakeAmplitude * intensity;
                const sy = (Math.random() - 0.5) * 2 * shakeAmplitude * intensity;
                JJ.Render.setScreenShake(sx, sy);
            }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            p.position.x += p.velocity.x * dt;
            p.position.y += p.velocity.y * dt;
            p.alpha = Math.max(0, p.life / p.maxLife);

            // Gravity for some types
            if (p.type === 'confetti') {
                p.velocity.y += 200 * dt;
            }
            if (p.type === 'floating_text') {
                p.velocity.y = -40; // Rise
            }
            if (p.type === 'celebration_text') {
                // Stay in place, no movement
                p.velocity.x = 0;
                p.velocity.y = 0;
            }
        }
    }

    function render(ctx) {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;

            if (p.type === 'celebration_text') {
                // Scale-in effect
                p.scaleIn = Math.min(1, (p.scaleIn || 0) + 0.08);
                const scale = p.scaleIn;
                ctx.translate(p.position.x, p.position.y);
                ctx.scale(scale, scale);
                // Text shadow/outline for readability
                ctx.font = 'bold ' + p.size + 'px Georgia, serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 6;
                ctx.strokeText(p.text, 0, 0);
                ctx.fillStyle = p.color;
                ctx.fillText(p.text, 0, 0);
            } else if (p.type === 'floating_text') {
                ctx.fillStyle = p.color;
                ctx.font = 'bold ' + p.size + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.position.x, p.position.y);
            } else if (p.type === 'bark_wave') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.position.x, p.position.y, p.radius * (1 - p.life / p.maxLife), 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.position.x, p.position.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    function spawnDustTrail(position) {
        for (let i = 0; i < 2; i++) {
            if (particles.length >= MAX_PARTICLES) return;
            particles.push({
                position: { x: position.x + (Math.random() - 0.5) * 16, y: position.y },
                velocity: { x: (Math.random() - 0.5) * 20, y: -8 - Math.random() * 8 },
                life: 0.5,
                maxLife: 0.5,
                size: 3 + Math.random() * 2,
                alpha: 0.6,
                color: '#b8a080',
                type: 'dust',
            });
        }
    }

    function spawnBarkWave(position, radius) {
        if (particles.length >= MAX_PARTICLES) return;
        particles.push({
            position: { x: position.x, y: position.y },
            velocity: { x: 0, y: 0 },
            life: 0.3,
            maxLife: 0.3,
            size: 0,
            alpha: 0.8,
            color: '#f5a623',
            type: 'bark_wave',
            radius: radius,
        });
    }

    function spawnGateSlam(position) {
        for (let i = 0; i < 4; i++) {
            if (particles.length >= MAX_PARTICLES) return;
            particles.push({
                position: { x: position.x + (Math.random() - 0.5) * 20, y: position.y },
                velocity: { x: (Math.random() - 0.5) * 60, y: -30 - Math.random() * 30 },
                life: 0.4,
                maxLife: 0.4,
                size: 4 + Math.random() * 3,
                alpha: 0.7,
                color: '#8a7a6a',
                type: 'dust',
            });
        }
    }

    function spawnConfetti(position) {
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8800', '#ff0088'];

        // Four staggered explosions around the position
        const offsets = [
            { x: -80, y: -40, delay: 0 },
            { x: 60, y: -60, delay: 200 },
            { x: -50, y: 50, delay: 400 },
            { x: 70, y: 30, delay: 600 },
        ];

        offsets.forEach(offset => {
            setTimeout(() => {
                const cx = position.x + offset.x + (Math.random() - 0.5) * 40;
                const cy = position.y + offset.y + (Math.random() - 0.5) * 40;

                for (let i = 0; i < 25; i++) {
                    if (particles.length >= MAX_PARTICLES) return;
                    const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.5;
                    const speed = 80 + Math.random() * 180;
                    particles.push({
                        position: { x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 30 },
                        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 80 },
                        life: 2.5,
                        maxLife: 2.5,
                        size: 4 + Math.random() * 5,
                        alpha: 1,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        type: 'confetti',
                    });
                }
            }, offset.delay);
        });

        // "WELL DONE!" text - large, center screen, fades out
        setTimeout(() => {
            particles.push({
                position: { x: JJ.CANVAS_WIDTH / 2, y: JJ.CANVAS_HEIGHT / 2 },
                velocity: { x: 0, y: 0 },
                life: 2.5,
                maxLife: 2.5,
                size: 64,
                alpha: 1,
                color: '#FFD700',
                type: 'celebration_text',
                text: 'WELL DONE!',
                scaleIn: 0,
            });
        }, 300);
    }

    function spawnFloatingText(position, text, color) {
        if (particles.length >= MAX_PARTICLES) return;
        particles.push({
            position: { x: position.x, y: position.y },
            velocity: { x: 0, y: -40 },
            life: 1,
            maxLife: 1,
            size: 18,
            alpha: 1,
            color: color || '#FFD700',
            type: 'floating_text',
            text: text,
        });
    }

    function spawnTeleportPuff(position) {
        for (let i = 0; i < 5; i++) {
            if (particles.length >= MAX_PARTICLES) return;
            particles.push({
                position: { x: position.x + (Math.random() - 0.5) * 15, y: position.y + (Math.random() - 0.5) * 15 },
                velocity: { x: (Math.random() - 0.5) * 40, y: -20 - Math.random() * 20 },
                life: 0.5,
                maxLife: 0.5,
                size: 5 + Math.random() * 3,
                alpha: 0.8,
                color: '#d4b8ff',
                type: 'dust',
            });
        }
    }

    function setScreenShake(amplitude, duration) {
        shakeAmplitude = amplitude;
        shakeDuration = duration;
        shakeTimer = duration;
    }

    return {
        init,
        update,
        render,
        spawnDustTrail,
        spawnBarkWave,
        spawnGateSlam,
        spawnConfetti,
        spawnFloatingText,
        spawnTeleportPuff,
        setScreenShake,
    };
})();
