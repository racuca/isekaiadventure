
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Ignore audio errors (e.g. context not started)
    }
};

export const playMoveSound = () => {
    playTone(100, 'triangle', 0.05, 0.05); 
};

export const playBumpSound = () => {
    playTone(60, 'sawtooth', 0.1, 0.05);
};

export const playSelectSound = () => {
    playTone(800, 'sine', 0.05, 0.02);
};

export const playAttackSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
};

export const playDamageSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const bufferSize = ctx.sampleRate * 0.2; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    } catch (e) {}
};

export const playHealSound = () => {
    playTone(523.25, 'sine', 0.1, 0.05); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.1, 0.05), 100); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.3, 0.05), 200); // G5
};

export const playGoldSound = () => {
    playTone(1500, 'sine', 0.1, 0.05);
    setTimeout(() => playTone(2000, 'sine', 0.2, 0.05), 50);
};

export const playLevelUpSound = () => {
     playTone(523.25, 'square', 0.1, 0.05);
     setTimeout(() => playTone(659.25, 'square', 0.1, 0.05), 100);
     setTimeout(() => playTone(783.99, 'square', 0.1, 0.05), 200);
     setTimeout(() => playTone(1046.50, 'square', 0.4, 0.05), 300);
};

export const playStartSound = () => {
    playTone(440, 'triangle', 0.1, 0.05);
    setTimeout(() => playTone(880, 'triangle', 0.4, 0.05), 100);
};

export const playRunSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
};
