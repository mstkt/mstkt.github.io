/**
 * Microtonal Synthesizer Voice for Makam Instruments
 *
 * Accurately renders 53-EDO microtonal detune in cents via Web Audio API.
 * Supports authentic acoustic timbre envelopes for:
 *  - Ney (Nefesli / Reed flute with breath harmonics)
 *  - Tanbur / Bağlama (Uzun sap mızraplı tel çalgısı)
 *  - Ud / Kanun (Ağaç rezonanslı mızraplı çalgı)
 *  - Yaylı / Keman / Çello (Yumuşak yaylı / string ensemble)
 *  - Dem Drone (Sıcak, dolgun sürekli dem sesi)
 *  - Bas (808, Sub, Reese)
 */

export const INSTRUMENTS = {
    NEY: 'ney',
    MEY: 'mey',
    CLARINET: 'clarinet',
    KAVAL: 'kaval',
    TANBUR: 'tanbur',
    UD: 'ud',
    STRINGS: 'strings',
    DRONE: 'drone',
    BASS_PLAIN: 'bass_plain',
    BASS_808: 'bass_808',
    BASS_REESE: 'bass_reese'
};

export class SynthVoice {
    constructor(audioCtx, destination) {
        this.ctx = audioCtx;
        this.dest = destination;
    }

    /**
     * Converts a MIDI note and detune in cents to absolute Hertz.
     */
    static midiToFreq(midiNote, detuneCents = 0) {
        const baseFreq = 440.0 * Math.pow(2.0, (midiNote - 69) / 12.0);
        return baseFreq * Math.pow(2.0, detuneCents / 1200.0);
    }

    /**
     * Plays a microtonal note.
     *
     * @param {number} midiNote - MIDI note number (e.g. 62 for D4)
     * @param {number} detuneCents - Microtonal comma detune in cents (e.g. -22.6 for Segah)
     * @param {number} startTime - AudioContext start time in seconds
     * @param {number} duration - Duration in seconds
     * @param {number} [velocity=0.8] - 0 to 1
     * @param {string} [instrument='ney']
     */
    playNote(midiNote, detuneCents, startTime, duration, velocity = 0.8, instrument = INSTRUMENTS.NEY) {
        const freq = SynthVoice.midiToFreq(midiNote, detuneCents);
        const vel = Math.max(0.05, Math.min(1.0, velocity));
        const dur = Math.max(0.05, duration);

        switch (instrument) {
            case INSTRUMENTS.NEY:
                this.playNey(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.MEY:
                this.playMey(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.CLARINET:
                this.playClarinet(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.KAVAL:
                this.playKaval(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.TANBUR:
                this.playTanbur(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.UD:
                this.playUd(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.STRINGS:
                this.playStrings(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.DRONE:
                this.playDrone(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.BASS_808:
                this.play808Bass(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.BASS_REESE:
                this.playReeseBass(freq, startTime, dur, vel);
                break;
            case INSTRUMENTS.BASS_PLAIN:
            default:
                this.playPlainBass(freq, startTime, dur, vel);
                break;
        }
    }

    /** Ney: Soft sine + gentle breath harmonic with smooth swell */
    playNey(freq, time, dur, vel) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(4500, freq * 4), time);

        const attack = 0.045;
        const release = 0.10;
        const sustainEnd = Math.max(time + attack, time + dur - release);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.40, time + attack);
        gain.gain.setValueAtTime(vel * 0.36, sustainEnd);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + dur + release + 0.05);
        osc2.stop(time + dur + release + 0.05);
    }

    /** Mey / Balaban: Yanık, buğulu, boğaz rezonanslı otantik çift kamış sesi */
    playMey(freq, time, dur, vel) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const f1 = this.ctx.createBiquadFilter();
        const f2 = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 0.5, time);

        if (dur > 0.5) {
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.value = 4.8;
            lfoGain.gain.setValueAtTime(0, time);
            lfoGain.gain.setValueAtTime(0, time + 0.28);
            lfoGain.gain.linearRampToValueAtTime(freq * 0.016, time + 0.75);
            lfo.connect(lfoGain);
            lfoGain.connect(osc1.frequency);
            lfo.start(time + 0.28);
            lfo.stop(time + dur + 0.25);
        }

        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(Math.min(2200, freq * 1.8 + 450), time);
        f1.Q.value = 2.4;

        f2.type = 'lowpass';
        f2.frequency.setValueAtTime(Math.min(2800, freq * 2.8 + 700), time);
        f2.Q.value = 1.8;

        const g1 = this.ctx.createGain(); g1.gain.value = 0.24;
        const g2 = this.ctx.createGain(); g2.gain.value = 0.18;

        osc1.connect(f1); f1.connect(g1);
        osc2.connect(f2); f2.connect(g2);
        g1.connect(gain); g2.connect(gain);

        const attack = 0.045;
        const release = 0.12;
        const sustainEnd = Math.max(time + attack, time + dur - release);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.48, time + attack);
        gain.gain.setValueAtTime(vel * 0.44, sustainEnd);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        gain.connect(this.dest);

        osc1.start(time); osc2.start(time);
        osc1.stop(time + dur + release + 0.05); osc2.stop(time + dur + release + 0.05);
    }

    /** Sol Klarnet: Trakya & Ege tavrı tek kamışlı rezonans ve tam sustain */
    playClarinet(freq, time, dur, vel) {
        const osc = this.ctx.createOscillator();
        const osc3rd = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        osc3rd.type = 'sine';
        osc3rd.frequency.setValueAtTime(freq * 3, time);

        if (dur > 0.6) {
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.frequency.value = 5.2;
            lfoGain.gain.setValueAtTime(0, time);
            lfoGain.gain.setValueAtTime(0, time + 0.35);
            lfoGain.gain.linearRampToValueAtTime(freq * 0.012, time + 0.85);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(time + 0.35);
            lfo.stop(time + dur + 0.25);
        }

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(3600, freq * 3.6 + 750), time);
        filter.Q.value = 1.6;

        const mainGain = this.ctx.createGain(); mainGain.gain.value = 0.24;
        const hGain = this.ctx.createGain(); hGain.gain.value = 0.09;

        osc.connect(filter); filter.connect(mainGain);
        osc3rd.connect(hGain);
        mainGain.connect(gain); hGain.connect(gain);

        const attack = 0.035;
        const release = 0.09;
        const sustainEnd = Math.max(time + attack, time + dur - release);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.44, time + attack);
        gain.gain.setValueAtTime(vel * 0.40, sustainEnd);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        gain.connect(this.dest);

        osc.start(time); osc3rd.start(time);
        osc.stop(time + dur + release + 0.05); osc3rd.stop(time + dur + release + 0.05);
    }

    /** Kaval / Sipsi: Yanık çoban kavalı ve teke sipsisi */
    playKaval(freq, time, dur, vel) {
        const osc = this.ctx.createOscillator();
        const oscOct = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        oscOct.type = 'sine';
        oscOct.frequency.setValueAtTime(freq * 2, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(4200, freq * 4.2), time);
        filter.Q.value = 1.2;

        const gMain = this.ctx.createGain(); gMain.gain.value = 0.28;
        const gOct = this.ctx.createGain(); gOct.gain.value = 0.10;

        osc.connect(filter); filter.connect(gMain);
        oscOct.connect(gOct);
        gMain.connect(gain); gOct.connect(gain);

        const attack = 0.04;
        const release = 0.10;
        const sustainEnd = Math.max(time + attack, time + dur - release);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.42, time + attack);
        gain.gain.setValueAtTime(vel * 0.38, sustainEnd);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        gain.connect(this.dest);

        osc.start(time); oscOct.start(time);
        osc.stop(time + dur + release + 0.05); oscOct.stop(time + dur + release + 0.05);
    }

    /** Tanbur / Bağlama: Bright plucked attack, rich string resonance */
    playTanbur(freq, time, dur, vel) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 6, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.25);

        const attack = 0.008; // Pluck onset
        const release = 0.05;

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.32, time + attack);
        // Exponential pluck decay
        gain.gain.exponentialRampToValueAtTime(vel * 0.12, time + Math.min(dur, 0.4));
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + release + 0.05);
        osc2.stop(time + dur + release + 0.05);
    }

    /** Ud / Kanun: Warm wooden body strike with bright sparkle */
    playUd(freq, time, dur, vel) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.3);

        const attack = 0.006;
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.40, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.06);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        osc.start(time);
        osc.stop(time + dur + 0.1);
    }

    /** Yaylı / Strings: Warm bowed envelope with lush body */
    playStrings(freq, time, dur, vel) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);

        // Subtle chorus detune (+4 cents)
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * Math.pow(2, 4 / 1200), time);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(3200, freq * 3.5), time);

        const attack = 0.08;
        const release = 0.12;

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.22, time + attack);
        gain.gain.setValueAtTime(vel * 0.20, Math.max(time + attack, time + dur - release));
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + release + 0.05);
        osc2.stop(time + dur + release + 0.05);
    }

    /** Dem Drone: Rich, warm, steady modal drone */
    playDrone(freq, time, dur, vel) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, time);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, time);

        const attack = 0.1;
        const release = 0.2;

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.28, time + attack);
        gain.gain.setValueAtTime(vel * 0.26, Math.max(time + attack, time + dur - release));
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.dest);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + release + 0.05);
        osc2.stop(time + dur + release + 0.05);
    }

    /** Plain Acoustic Bass */
    playPlainBass(freq, time, dur, vel) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        // Upper harmonic to ensure definition on small laptop speakers
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);

        const attack = 0.012;
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.35, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.05);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + dur + 0.08);
        osc2.stop(time + dur + 0.08);
    }

    /** 808 Sub Bass: Sine with fast initial pitch fall and long tail */
    play808Bass(freq, time, dur, vel) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.5, time); // 5th sharp at strike
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.045);

        gain.gain.setValueAtTime(vel * 0.45, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.1);

        osc.connect(gain);
        gain.connect(this.dest);

        osc.start(time);
        osc.stop(time + dur + 0.15);
    }

    /** Reese Bass: Dual detuned saw stack with slow phasing movement */
    playReeseBass(freq, time, dur, vel) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // 9 cents up & down
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq * Math.pow(2, 9 / 1200), time);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * Math.pow(2, -9 / 1200), time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, time);

        const attack = 0.02;
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(vel * 0.28, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.08);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + 0.1);
        osc2.stop(time + dur + 0.1);
    }
}

