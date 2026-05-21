/**
 * Jasper Junction - Main Entry Point
 * Initializes the game engine and starts the first scene.
 */

'use strict';

(function () {
    // Generate QR code
    function initQR() {
        if (typeof qrcode !== 'undefined') {
            var qr = qrcode(0, 'L');
            qr.addData('https://www.paypal.com/donate/?hosted_button_id=HDD77QKGC6XXN');
            qr.make();
            var el = document.getElementById('qr-code');
            if (el) el.innerHTML = qr.createSvgTag({ cellSize: 2, margin: 0 });
        }
    }

    // Show/hide title overlay based on scene
    function updateOverlay() {
        const overlay = document.getElementById('title-overlay');
        if (!overlay) return;
        const scene = JJ.Engine.currentScene();
        if (scene && scene.name === 'mainmenu') {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
        // Re-check orientation (only enforced outside title screen)
        if (JJ.Engine.checkOrientation) JJ.Engine.checkOrientation();
        requestAnimationFrame(updateOverlay);
    }

    // Wait for DOM
    function boot() {
        // Initialize engine
        JJ.Engine.init();

        // Load save data
        const save = JJ.Save.getData();

        // Apply saved audio settings
        const audioSettings = JJ.Save.getAudioSettings();
        JJ.Audio.setVolumes(audioSettings);

        // Start with main menu
        JJ.Engine.pushScene(JJ.Scenes.MainMenu());

        // Start the game loop
        JJ.Engine.start();

        // Init QR code
        initQR();

        // Start overlay watcher
        updateOverlay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
