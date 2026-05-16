/**
 * Jasper Junction - Save System
 * localStorage persistence with auto-save and versioned schema.
 */

'use strict';

JJ.Save = (function () {
    const STORAGE_KEY = 'jasper_junction_save_v1';
    const SAVE_VERSION = 1;

    let saveData = null;

    function getDefaultSave() {
        return {
            version: SAVE_VERSION,
            currentLevel: 0, // 0 = tutorial not done
            cumulativeScore: 0,
            starRatings: {},
            tutorialCompleted: false,
            audioSettings: {
                sfx: 0.7,
                music: 0.4,
                ambient: 0.3,
                mutedSfx: false,
                mutedMusic: false,
                mutedAmbient: false,
            },
            autoSaveState: null,
            lastSaveTimestamp: 0,
            barkButtonPosition: 'right', // 'right' or 'left'
        };
    }

    function init() {
        load();
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                saveData = JSON.parse(raw);
                if (saveData.version !== SAVE_VERSION) {
                    // Version mismatch - start fresh
                    console.warn('Save version mismatch, starting fresh');
                    saveData = getDefaultSave();
                }
            } else {
                saveData = getDefaultSave();
            }
        } catch (e) {
            console.warn('Failed to load save data:', e);
            saveData = getDefaultSave();
        }
        return saveData;
    }

    function save() {
        if (!saveData) return;
        saveData.lastSaveTimestamp = Date.now();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn('localStorage full, cannot save');
            } else {
                console.warn('Save failed:', e);
            }
        }
    }

    function clear() {
        saveData = getDefaultSave();
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
    }

    function getData() {
        return saveData || getDefaultSave();
    }

    function setCurrentLevel(level) {
        saveData.currentLevel = level;
        save();
    }

    function addScore(points) {
        saveData.cumulativeScore += points;
        save();
    }

    function setStarRating(level, stars) {
        const existing = saveData.starRatings[level] || 0;
        if (stars > existing) {
            saveData.starRatings[level] = stars;
        }
        save();
    }

    function completeTutorial() {
        saveData.tutorialCompleted = true;
        saveData.currentLevel = 1;
        save();
    }

    function setAutoSave(levelState) {
        saveData.autoSaveState = levelState;
        save();
    }

    function clearAutoSave() {
        saveData.autoSaveState = null;
        save();
    }

    function getAudioSettings() {
        return saveData ? saveData.audioSettings : getDefaultSave().audioSettings;
    }

    function setAudioSettings(settings) {
        saveData.audioSettings = { ...saveData.audioSettings, ...settings };
        save();
    }

    function getBarkButtonPosition() {
        return saveData ? saveData.barkButtonPosition : 'right';
    }

    function setBarkButtonPosition(pos) {
        saveData.barkButtonPosition = pos;
        save();
    }

    return {
        init,
        load,
        save,
        clear,
        getData,
        setCurrentLevel,
        addScore,
        setStarRating,
        completeTutorial,
        setAutoSave,
        clearAutoSave,
        getAudioSettings,
        setAudioSettings,
        getBarkButtonPosition,
        setBarkButtonPosition,
    };
})();
