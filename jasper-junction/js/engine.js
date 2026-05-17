/**
 * Jasper Junction - Game Engine
 * Core game loop with fixed-timestep updates and variable rendering.
 * Manages scene stack, canvas scaling, and application lifecycle.
 */

'use strict';

const JJ = window.JJ || {};
window.JJ = JJ;

// Constants
JJ.CANVAS_WIDTH = 1676;
JJ.CANVAS_HEIGHT = 939;
JJ.FIXED_DT = 1 / 60; // 16.67ms
JJ.MAX_TICKS_PER_FRAME = 4;

JJ.Engine = (function () {
    let canvas, ctx;
    let sceneStack = [];
    let accumulator = 0;
    let lastTime = 0;
    let running = false;
    let paused = false;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let animFrameId = null;

    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => {
            setTimeout(resize, 100);
        });

        // Visibility change - pause on blur
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseGame();
                if (JJ.Audio) JJ.Audio.stopAll();
            } else {
                // Show pause menu on return rather than auto-resuming
                showPauseOnReturn();
            }
        });

        window.addEventListener('blur', () => {
            pauseGame();
            if (JJ.Audio) JJ.Audio.stopAll();
        });

        // Check orientation
        checkOrientation();
        window.addEventListener('resize', checkOrientation);

        // Initialize subsystems
        if (JJ.Input) JJ.Input.init(canvas);
        if (JJ.Audio) JJ.Audio.init();
        if (JJ.Save) JJ.Save.init();
        if (JJ.Effects) JJ.Effects.init();
    }

    function resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const scaleX = vw / JJ.CANVAS_WIDTH;
        const scaleY = vh / JJ.CANVAS_HEIGHT;
        scale = Math.min(scaleX, scaleY);

        const displayWidth = Math.floor(JJ.CANVAS_WIDTH * scale);
        const displayHeight = Math.floor(JJ.CANVAS_HEIGHT * scale);

        canvas.width = JJ.CANVAS_WIDTH;
        canvas.height = JJ.CANVAS_HEIGHT;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';

        offsetX = (vw - displayWidth) / 2;
        offsetY = (vh - displayHeight) / 2;
    }

    function checkOrientation() {
        const prompt = document.getElementById('orientation-prompt');
        if (!prompt) return;

        const isPortrait = window.innerHeight > window.innerWidth * 1.2; // More lenient ratio
        const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1024;

        if (isMobile && isPortrait) {
            prompt.style.display = 'flex';
            pauseGame();
        } else {
            prompt.style.display = 'none';
        }
    }

    function start() {
        if (running) return;
        running = true;
        paused = false;
        lastTime = performance.now();
        accumulator = 0;
        loop(lastTime);
    }

    function loop(timestamp) {
        if (!running) return;
        animFrameId = requestAnimationFrame(loop);

        if (paused) return;

        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // Clamp large dt (e.g., after tab switch)
        const clampedDt = Math.min(dt, JJ.FIXED_DT * JJ.MAX_TICKS_PER_FRAME);
        accumulator += clampedDt;

        let ticks = 0;
        while (accumulator >= JJ.FIXED_DT && ticks < JJ.MAX_TICKS_PER_FRAME) {
            update(JJ.FIXED_DT);
            accumulator -= JJ.FIXED_DT;
            ticks++;
        }

        const alpha = accumulator / JJ.FIXED_DT;
        render(alpha);
    }

    function update(dt) {
        if (JJ.Input) JJ.Input.update();

        const scene = currentScene();
        if (scene && scene.update) {
            scene.update(dt);
        }

        if (JJ.Effects) JJ.Effects.update(dt);
    }

    function render(alpha) {
        ctx.clearRect(0, 0, JJ.CANVAS_WIDTH, JJ.CANVAS_HEIGHT);

        const scene = currentScene();
        if (scene && scene.render) {
            scene.render(ctx, alpha);
        }

        if (JJ.Effects) JJ.Effects.render(ctx);
    }

    function pauseGame() {
        paused = true;
    }

    function resumeGame() {
        if (!paused) return;
        paused = false;
        lastTime = performance.now();
        accumulator = 0;
    }

    function showPauseOnReturn() {
        // If in gameplay, show pause menu
        const scene = currentScene();
        if (scene && scene.name === 'gameplay' && !scene.isPaused) {
            if (JJ.Scenes && JJ.Scenes.Pause) {
                pushScene(JJ.Scenes.Pause());
            }
        }
        resumeGame();
    }

    // Scene management
    function pushScene(scene) {
        const current = currentScene();
        if (current && current.onPause) current.onPause();
        sceneStack.push(scene);
        if (scene.onEnter) scene.onEnter();
    }

    function popScene() {
        const scene = sceneStack.pop();
        if (scene && scene.onExit) scene.onExit();
        const next = currentScene();
        if (next && next.onResume) next.onResume();
        return scene;
    }

    function replaceScene(scene) {
        const old = sceneStack.pop();
        if (old && old.onExit) old.onExit();
        sceneStack.push(scene);
        if (scene.onEnter) scene.onEnter();
    }

    function currentScene() {
        return sceneStack.length > 0 ? sceneStack[sceneStack.length - 1] : null;
    }

    function getScale() { return scale; }
    function getOffset() { return { x: offsetX, y: offsetY }; }
    function getCanvas() { return canvas; }
    function getCtx() { return ctx; }
    function isPaused() { return paused; }

    return {
        init,
        start,
        resize,
        pauseGame,
        resumeGame,
        pushScene,
        popScene,
        replaceScene,
        currentScene,
        getScale,
        getOffset,
        getCanvas,
        getCtx,
        isPaused,
    };
})();
