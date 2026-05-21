/**
 * Jasper Junction - Audio Manager
 * Web Audio API with SFX limiting, ducking, and volume management.
 * iOS compatibility: uses HTML5 Audio element to establish playback session
 * (overrides silent/mute switch), then Web Audio API for mixing.
 */

'use strict';

JJ.Audio = (function () {
    let audioCtx = null;
    let initialized = false;
    // SFX audio buffers (loaded from MP3 files)
    let sfxBuffers = {};
    const SFX_FILES = {
        bark: 'assets/bark.mp3',
        sheep_bleat: 'assets/sheep-bleat.mp3',
        cow_moo: 'assets/cow-moo.mp3',
        goat_bleat: 'assets/goat-bleat.mp3',
        goat_scream: 'assets/goat-scream.mp3',
        impact: 'assets/impact.mp3',
        gate_close: 'assets/gate-close.mp3',
        level_start: 'assets/level-start.mp3',
        celebration: 'assets/celebration.mp3',
        game_over: 'assets/game-over.mp3',
    };

    function loadSFX() {
        if (!audioCtx) return;
        Object.keys(SFX_FILES).forEach(id => {
            fetch(SFX_FILES[id])
                .then(response => {
                    if (!response.ok) return null;
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    if (!arrayBuffer) return;
                    return audioCtx.decodeAudioData(arrayBuffer);
                })
                .then(buffer => {
                    if (buffer) sfxBuffers[id] = buffer;
                })
                .catch(e => console.warn('SFX load failed:', id, e));
        });
    }

    let activeSFX = [];
    const MAX_CONCURRENT_SFX = 4;

    let volumes = {
        sfx: 0.7,
        music: 0.4,
        ambient: 0.3,
    };
    let muted = {
        sfx: false,
        music: false,
        ambient: false,
    };

    let musicGain = null;
    let ambientGain = null;
    let sfxGain = null;
    let masterGain = null;

    let musicSource = null;
    let ambientSource = null;
    let levelCompleteSource = null;
    let duckTimer = null;
    let originalMusicVolume = 0.4;

    // HTML5 Audio element used to establish iOS audio session.
    // Playing any audio via <audio> element sets the session category to
    // "playback" which overrides the hardware mute/silent switch.
    let sessionAudio = null;

    function init() {
        // Create a tiny silent audio element for iOS session unlock.
        // This must exist before the first user gesture.
        sessionAudio = document.createElement('audio');
        sessionAudio.setAttribute('playsinline', '');
        sessionAudio.setAttribute('webkit-playsinline', '');
        // Tiny silent MP3 (base64) — 0.1s of silence, ~200 bytes
        sessionAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwMHAAAAAAD/+1DEAAAH+ANoAAAAACIYA1gAAAATAAANIAAAAQAAADSAAAAEMcnBgAAAgAABDHJwYAAAAAAA//tQxBcAAADSAAAAAAAAANIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        sessionAudio.load();

        // Listen for user gestures to unlock audio
        const unlockEvents = ['touchstart', 'touchend', 'click', 'mousedown', 'keydown'];
        unlockEvents.forEach(evt => {
            document.addEventListener(evt, unlockAudio, { capture: true });
        });
    }

    let pendingMusic = false;
    let pendingAmbient = false;
    let unlockListenersRemoved = false;

    function unlockAudio() {
        // If already fully initialized, just clean up listeners
        if (initialized) {
            removeUnlockListeners();
            return;
        }

        // Step 1: Play the HTML5 audio element to establish iOS audio session.
        // This overrides the hardware mute switch.
        if (sessionAudio) {
            try {
                var playPromise = sessionAudio.play();
                if (playPromise) {
                    playPromise.catch(function() {});
                }
            } catch (e) {}
        }

        // Step 2: Create Web Audio context if not yet created
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Audio initialization failed:', e);
                return;
            }
        }

        // Step 3: Resume the context (required for iOS/Chrome autoplay policy)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Step 4: Play a silent buffer through Web Audio API to fully unlock it
        playSilentBuffer();

        // Step 5: Set up gain nodes and mark as initialized
        finishInit();
    }

    function playSilentBuffer() {
        if (!audioCtx) return;
        try {
            var silentBuffer = audioCtx.createBuffer(1, 1, 22050);
            var source = audioCtx.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(audioCtx.destination);
            source.start(0);
        } catch (e) {}
    }

    function removeUnlockListeners() {
        if (unlockListenersRemoved) return;
        unlockListenersRemoved = true;
        var unlockEvents = ['touchstart', 'touchend', 'click', 'mousedown', 'keydown'];
        unlockEvents.forEach(function(evt) {
            document.removeEventListener(evt, unlockAudio, { capture: true });
        });
    }

    function finishInit() {
        if (initialized) return;

        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);

        musicGain = audioCtx.createGain();
        musicGain.connect(masterGain);
        musicGain.gain.value = volumes.music;

        ambientGain = audioCtx.createGain();
        ambientGain.connect(masterGain);
        ambientGain.gain.value = volumes.ambient;

        sfxGain = audioCtx.createGain();
        sfxGain.connect(masterGain);
        sfxGain.gain.value = volumes.sfx;

        initialized = true;
        removeUnlockListeners();
        loadSFX();

        // Retry music/ambient if gameplay already requested them
        if (pendingMusic) { pendingMusic = false; playMusic(); }
        if (pendingAmbient) { pendingAmbient = false; playAmbient(); }
    }

    function playSFX(id, volumeOverride) {
        if (!initialized || !audioCtx || muted.sfx) return;
        if (!sfxBuffers[id]) return; // Not loaded yet

        // Re-resume context if iOS suspended it (e.g., after tab switch)
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Evict oldest if at capacity
        if (activeSFX.length >= MAX_CONCURRENT_SFX) {
            const oldest = activeSFX.shift();
            if (oldest && oldest.source) {
                try { oldest.source.stop(); } catch (e) {}
            }
        }

        // Volume overlap reduction for rapid SFX
        const now = audioCtx.currentTime;
        const recentSFX = activeSFX.filter(s => now - s.startTime < 0.5);
        const volumeReduction = recentSFX.length > 0 ? 0.5 : 1;

        const source = audioCtx.createBufferSource();
        source.buffer = sfxBuffers[id];
        source.loop = false;

        const baseVol = volumeOverride !== undefined ? volumeOverride : volumes.sfx;
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = baseVol * volumeReduction;
        source.connect(gainNode);
        gainNode.connect(sfxGain);

        source.start();
        const entry = { source, startTime: now, id };
        activeSFX.push(entry);

        source.onended = () => {
            const idx = activeSFX.indexOf(entry);
            if (idx >= 0) activeSFX.splice(idx, 1);
        };

        // Duck music
        duckMusic();
    }

    function duckMusic() {
        if (!musicGain) return;
        musicGain.gain.setValueAtTime(volumes.music * 0.7, audioCtx.currentTime);

        if (duckTimer) clearTimeout(duckTimer);
        duckTimer = setTimeout(() => {
            if (musicGain && audioCtx) {
                musicGain.gain.linearRampToValueAtTime(volumes.music, audioCtx.currentTime + 0.3);
            }
        }, 300);
    }

    function playMusic() {
        if (!initialized || !audioCtx) {
            pendingMusic = true;
            return;
        }
        if (muted.music) return;
        if (musicSource) return; // Already playing

        // Re-resume context if iOS suspended it
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Load MP3 file
        fetch('assets/music.mp3')
            .then(response => {
                if (!response.ok) return null;
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                if (!arrayBuffer) return;
                return audioCtx.decodeAudioData(arrayBuffer);
            })
            .then(buffer => {
                if (!buffer || musicSource) return;
                musicSource = audioCtx.createBufferSource();
                musicSource.buffer = buffer;
                musicSource.loop = true;
                musicSource.connect(musicGain);
                musicSource.start();
            })
            .catch(e => console.warn('Music load failed:', e));
    }

    function playAmbient() {
        if (!initialized || !audioCtx) {
            pendingAmbient = true;
            return;
        }
        if (muted.ambient) return;
        if (ambientSource) return; // Already playing

        // Re-resume context if iOS suspended it
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Load MP3 file
        fetch('assets/ambient.mp3')
            .then(response => {
                if (!response.ok) return null;
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                if (!arrayBuffer) return;
                return audioCtx.decodeAudioData(arrayBuffer);
            })
            .then(buffer => {
                if (!buffer || ambientSource) return;
                ambientSource = audioCtx.createBufferSource();
                ambientSource.buffer = buffer;
                ambientSource.loop = true;
                ambientSource.connect(ambientGain);
                ambientSource.start();
            })
            .catch(e => console.warn('Ambient load failed:', e));
    }

    function stopAll() {
        activeSFX.forEach(s => {
            try { s.source.stop(); } catch (e) {}
        });
        activeSFX = [];
        if (musicSource) { try { musicSource.stop(); } catch (e) {} musicSource = null; }
        if (ambientSource) { try { ambientSource.stop(); } catch (e) {} ambientSource = null; }
        if (levelCompleteSource) { try { levelCompleteSource.stop(); } catch (e) {} levelCompleteSource = null; }
    }

    function stopMusic() {
        if (musicSource) { try { musicSource.stop(); } catch (e) {} musicSource = null; }
        if (levelCompleteSource) { try { levelCompleteSource.stop(); } catch (e) {} levelCompleteSource = null; }
    }

    function stopAmbient() {
        if (ambientSource) { try { ambientSource.stop(); } catch (e) {} ambientSource = null; }
    }

    function stopSFX() {
        activeSFX.forEach(s => {
            try { s.source.stop(); } catch (e) {}
        });
        activeSFX = [];
    }

    function playLevelComplete() {
        if (!initialized || !audioCtx) return;
        if (muted.music) return;
        if (levelCompleteSource) return; // Already playing

        fetch('assets/level-complete.mp3')
            .then(response => {
                if (!response.ok) return null;
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                if (!arrayBuffer) return;
                return audioCtx.decodeAudioData(arrayBuffer);
            })
            .then(buffer => {
                if (!buffer || levelCompleteSource) return;
                levelCompleteSource = audioCtx.createBufferSource();
                levelCompleteSource.buffer = buffer;
                levelCompleteSource.loop = false;
                levelCompleteSource.connect(musicGain);
                levelCompleteSource.start();
            })
            .catch(e => console.warn('Level complete music load failed:', e));
    }

    function fadeIn(duration) {
        if (!masterGain || !audioCtx) return;
        masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + (duration || 0.5));
    }

    function setVolume(channel, value) {
        volumes[channel] = Math.max(0, Math.min(1, value));
        if (channel === 'music' && musicGain) musicGain.gain.value = volumes.music;
        if (channel === 'ambient' && ambientGain) ambientGain.gain.value = volumes.ambient;
        if (channel === 'sfx' && sfxGain) sfxGain.gain.value = volumes.sfx;
    }

    function mute(channel) {
        muted[channel] = !muted[channel];
    }

    function getVolumes() { return { ...volumes }; }
    function getMuted() { return { ...muted }; }
    function setMuted(m) { muted = { ...muted, ...m }; }
    function setVolumes(v) {
        Object.keys(v).forEach(k => setVolume(k, v[k]));
    }

    return {
        init,
        playSFX,
        playMusic,
        playAmbient,
        playLevelComplete,
        stopAll,
        stopMusic,
        stopAmbient,
        stopSFX,
        fadeIn,
        setVolume,
        mute,
        getVolumes,
        getMuted,
        setMuted,
        setVolumes,
    };
})();
