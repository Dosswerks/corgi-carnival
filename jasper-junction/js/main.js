/**
 * Jasper Junction - Main Entry Point
 * Initializes the game engine and starts the first scene.
 */

'use strict';

(function () {
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
