/**
 * Jasper Junction - Input Manager
 * Unifies touch, mouse, and keyboard input into canonical coordinate space.
 */

'use strict';

JJ.Input = (function () {
    let canvas;
    let state = {
        targetPosition: null,
        isActive: false,
        barkRequested: false,
        lastBarkTime: 0,
    };

    const BARK_COOLDOWN = 5; // seconds
    const BARK_DOUBLE_TAP_WINDOW = 300; // ms
    const TAP_DEADZONE = 10; // pixels in canonical space

    let lastTapTime = 0;
    let keysDown = {};
    let keyDirection = { x: 0, y: 0 };
    let barkButtonActive = false;

    function init(canvasEl) {
        canvas = canvasEl;

        // Touch events
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });

        // Mouse events
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);

        // Keyboard events
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
    }

    function deviceToCanonical(clientX, clientY) {
        const scale = JJ.Engine.getScale();
        const offset = JJ.Engine.getOffset();
        const rect = canvas.getBoundingClientRect();

        const x = (clientX - rect.left - offset.x) / scale;
        const y = (clientY - rect.top - offset.y) / scale;

        return { x, y };
    }

    function isInBounds(pos) {
        return pos.x >= 0 && pos.x <= JJ.CANVAS_WIDTH &&
               pos.y >= 0 && pos.y <= JJ.CANVAS_HEIGHT;
    }

    function isInDeadzone(pos) {
        if (!JJ.Entities || !JJ.Entities.getJasper) return false;
        const jasper = JJ.Entities.getJasper();
        if (!jasper) return false;
        const dx = pos.x - jasper.position.x;
        const dy = pos.y - jasper.position.y;
        return Math.sqrt(dx * dx + dy * dy) < TAP_DEADZONE;
    }

    function checkDoubleTap() {
        const now = performance.now();
        if (now - lastTapTime < BARK_DOUBLE_TAP_WINDOW) {
            tryBark();
            lastTapTime = 0;
        } else {
            lastTapTime = now;
        }
    }

    function tryBark() {
        const now = performance.now() / 1000;
        if (now - state.lastBarkTime >= BARK_COOLDOWN) {
            state.barkRequested = true;
        }
    }

    // Touch handlers
    function onTouchStart(e) {
        // Only process input during gameplay
        const scene = JJ.Engine.currentScene();
        if (!scene || scene.name !== 'gameplay') return;

        e.preventDefault();
        const touch = e.touches[0];
        const pos = deviceToCanonical(touch.clientX, touch.clientY);

        if (!isInBounds(pos)) return;

        checkDoubleTap();

        if (!isInDeadzone(pos)) {
            state.targetPosition = pos;
            state.isActive = true;
        }
    }

    function onTouchMove(e) {
        if (!state.isActive) return;
        const scene = JJ.Engine.currentScene();
        if (!scene || scene.name !== 'gameplay') return;

        e.preventDefault();
        const touch = e.touches[0];
        const pos = deviceToCanonical(touch.clientX, touch.clientY);

        if (!isInBounds(pos)) return;
        state.targetPosition = pos;
    }

    function onTouchEnd(e) {
        e.preventDefault();
        state.isActive = false;
        state.targetPosition = null;
    }

    // Mouse handlers
    function onMouseDown(e) {
        const scene = JJ.Engine.currentScene();
        if (scene && scene.name !== 'gameplay') return;

        const pos = deviceToCanonical(e.clientX, e.clientY);
        if (!isInBounds(pos)) return;

        checkDoubleTap();

        if (!isInDeadzone(pos)) {
            state.targetPosition = pos;
            state.isActive = true;
        }
    }

    function onMouseMove(e) {
        if (!state.isActive) return;
        const scene = JJ.Engine.currentScene();
        if (scene && scene.name !== 'gameplay') return;

        const pos = deviceToCanonical(e.clientX, e.clientY);
        if (!isInBounds(pos)) return;
        state.targetPosition = pos;
    }

    function onMouseUp(e) {
        state.isActive = false;
        state.targetPosition = null;
    }

    // Keyboard handlers
    function onKeyDown(e) {
        keysDown[e.code] = true;

        if (e.code === 'Space') {
            e.preventDefault();
            tryBark();
        }

        if (e.code === 'Escape') {
            // Toggle pause
            const scene = JJ.Engine.currentScene();
            if (scene && scene.name === 'gameplay') {
                JJ.Engine.pushScene(JJ.Scenes.Pause());
            } else if (scene && scene.name === 'pause') {
                JJ.Engine.popScene();
            }
        }

        updateKeyDirection();
    }

    function onKeyUp(e) {
        keysDown[e.code] = false;
        updateKeyDirection();
    }

    function updateKeyDirection() {
        let dx = 0, dy = 0;

        if (keysDown['ArrowLeft'] || keysDown['KeyA']) dx -= 1;
        if (keysDown['ArrowRight'] || keysDown['KeyD']) dx += 1;
        if (keysDown['ArrowUp'] || keysDown['KeyW']) dy -= 1;
        if (keysDown['ArrowDown'] || keysDown['KeyS']) dy += 1;

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        keyDirection = { x: dx, y: dy };
    }

    function update() {
        // Keyboard movement creates a virtual target position ahead of Jasper
        if (keyDirection.x !== 0 || keyDirection.y !== 0) {
            const jasper = JJ.Entities ? JJ.Entities.getJasper() : null;
            if (jasper) {
                state.targetPosition = {
                    x: jasper.position.x + keyDirection.x * 200,
                    y: jasper.position.y + keyDirection.y * 200,
                };
                state.isActive = true;
            }
        } else if (!state.isActive && !('ontouchstart' in window)) {
            // Only clear for keyboard when no keys pressed and no mouse held
        }
    }

    function getTargetPosition() { return state.targetPosition; }
    function isInputActive() { return state.isActive || (keyDirection.x !== 0 || keyDirection.y !== 0); }

    function isBarkTriggered() {
        if (state.barkRequested) {
            state.barkRequested = false;
            state.lastBarkTime = performance.now() / 1000;
            return true;
        }
        return false;
    }

    function getBarkCooldownRemaining() {
        const elapsed = (performance.now() / 1000) - state.lastBarkTime;
        return Math.max(0, BARK_COOLDOWN - elapsed);
    }

    function isBarkReady() {
        return getBarkCooldownRemaining() <= 0;
    }

    function triggerBarkFromButton() {
        tryBark();
    }

    return {
        init,
        update,
        getTargetPosition,
        isInputActive,
        isBarkTriggered,
        getBarkCooldownRemaining,
        isBarkReady,
        triggerBarkFromButton,
        BARK_COOLDOWN,
    };
})();
