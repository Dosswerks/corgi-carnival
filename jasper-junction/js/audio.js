/**
 * Jasper Junction - Audio Manager
 * Web Audio API with SFX limiting, ducking, and volume management.
 */

'use strict';

JJ.Audio = (function () {
    let audioCtx = null;
    let initialized = false;
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
    let duckTimer = null;
    let originalMusicVolume = 0.4;

    function init() {
        // Defer AudioContext creation until first user interaction
        const startAudio = () => {
            if (initialized) return;
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
            } catch (e) {
                console.warn('Audio initialization failed:', e);
            }
            document.removeEventListener('touchstart', startAudio);
            document.removeEventListener('mousedown', startAudio);
            document.removeEventListener('keydown', startAudio);
        };

        document.addEventListener('touchstart', startAudio, { once: true });
        document.addEventListener('mousedown', startAudio, { once: true });
        document.addEventListener('keydown', startAudio, { once: true });
    }

    function playSFX(id, priority) {
        if (!initialized || !audioCtx || muted.sfx) return;

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

        // Generate synthesized SFX
        const buffer = generateSFX(id);
        if (!buffer) return;

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = volumes.sfx * volumeReduction;
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

    function generateSFX(id) {
        if (!audioCtx) return null;
        const sampleRate = audioCtx.sampleRate;
        let duration, buffer, data;

        switch (id) {
            case 'bark':
                duration = 0.2;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 400 - t * 800;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.5;
                    data[i] += (Math.random() - 0.5) * 0.1 * (1 - t / duration);
                }
                break;

            case 'sheep_bleat':
                duration = 0.4;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 600 + Math.sin(t * 20) * 100;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.3;
                }
                break;

            case 'cow_moo':
                duration = 0.6;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 150 + Math.sin(t * 3) * 30;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.4;
                }
                break;

            case 'goat_bleat':
                duration = 0.3;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 800 + Math.sin(t * 30) * 200;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.3;
                }
                break;

            case 'goat_scream':
                duration = 0.5;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 1000 + Math.sin(t * 50) * 400;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.4;
                    data[i] += (Math.random() - 0.5) * 0.2 * (1 - t / duration);
                }
                break;

            case 'impact':
                duration = 0.15;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    data[i] = (Math.random() - 0.5) * (1 - t / duration) * 0.6;
                }
                break;

            case 'gate_close':
                duration = 0.3;
                buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
                data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const freq = 200 - t * 300;
                    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration) * 0.5;
                    data[i] += (Math.random() - 0.5) * 0.3 * (1 - t / duration);
                }
                break;

            default:
                return null;
        }

        return buffer;
    }

    function playMusic() {
        // Placeholder - would load and loop music
    }

    function playAmbient() {
        // Placeholder - would load and loop ambient
    }

    function stopAll() {
        activeSFX.forEach(s => {
            try { s.source.stop(); } catch (e) {}
        });
        activeSFX = [];
        if (musicSource) { try { musicSource.stop(); } catch (e) {} musicSource = null; }
        if (ambientSource) { try { ambientSource.stop(); } catch (e) {} ambientSource = null; }
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
        stopAll,
        fadeIn,
        setVolume,
        mute,
        getVolumes,
        getMuted,
        setMuted,
        setVolumes,
    };
})();
