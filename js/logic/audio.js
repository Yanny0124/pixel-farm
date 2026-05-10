// ==========================================
// Logic/Audio: 轻量 Web Audio 反馈
// ==========================================
let audioEnabled = true;
let audioCtx = null;

const SOUND_PATTERNS = {
    plant: [{ f: 420, t: 0.04, v: 0.05 }, { f: 560, t: 0.05, v: 0.04 }],
    harvest: [{ f: 660, t: 0.05, v: 0.06 }, { f: 880, t: 0.07, v: 0.05 }],
    resonance: [{ f: 523, t: 0.06, v: 0.06 }, { f: 659, t: 0.06, v: 0.06 }, { f: 784, t: 0.1, v: 0.05 }],
    build: [{ f: 180, t: 0.05, v: 0.08 }, { f: 260, t: 0.07, v: 0.06 }],
    craftStart: [{ f: 300, t: 0.04, v: 0.05 }, { f: 360, t: 0.04, v: 0.05 }],
    craftDone: [{ f: 600, t: 0.05, v: 0.06 }, { f: 760, t: 0.08, v: 0.05 }],
    sell: [{ f: 880, t: 0.04, v: 0.05 }, { f: 1175, t: 0.05, v: 0.04 }],
    order: [{ f: 520, t: 0.05, v: 0.06 }, { f: 780, t: 0.05, v: 0.06 }, { f: 1040, t: 0.08, v: 0.05 }],
    miracle: [{ f: 392, t: 0.08, v: 0.07 }, { f: 523, t: 0.1, v: 0.06 }, { f: 784, t: 0.14, v: 0.05 }],
    talk: [{ f: 480, t: 0.035, v: 0.035 }, { f: 520, t: 0.035, v: 0.03 }]
};

function getAudioContext() {
    if (!audioEnabled) return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playTone(ctx, frequency, startTime, duration, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
}

function playSound(name) {
    const pattern = SOUND_PATTERNS[name];
    if (!pattern) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    let time = ctx.currentTime;
    pattern.forEach(note => {
        playTone(ctx, note.f, time, note.t, note.v);
        time += note.t * 0.82;
    });
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    if (audioEnabled) playSound('talk');
    saveGame();
}
