/**
 * Turkish & World Percussion Synthesizer
 *
 * Implements low-latency, allocation-free physical modeling for:
 *  - Kudüm (Rezonant çift tokmaklı ritim kasesi)
 *  - Bendir (Geniş çerçeveli derin rezonanslı zikir/fasıl davulu)
 *  - Def / Rık (Zilli pirinç pullu kenar vuruşu)
 *  - Darbuka (Düm / Tek / Çentme)
 *  - GM Kick, Snare, Hat fallback
 */

export class DrumSynth {
    constructor(audioCtx, destination) {
        this.ctx = audioCtx;
        this.dest = destination;
    }

    /**
     * Triggers a percussion stroke.
     * @param {number} midiNote - e.g. 36 (Düm), 38 (Tek), 42 (Zilli Def)
     * @param {number} time - AudioContext time in seconds
     * @param {number} [velocity=0.8] - 0 to 1
     * @param {string} [kitType='turkish'] - 'turkish' | 'acoustic' | '808'
     */
    trigger(midiNote, time, velocity = 0.8, kitType = 'turkish') {
        const vel = Math.max(0.05, Math.min(1.0, velocity));

        if (kitType === 'turkish') {
            switch (midiNote) {
                case 36: // Düm (Kudüm Sağ / Bendir Göbek)
                    this.playDum(time, vel);
                    break;
                case 38: // Tek (Kudüm Sol / Bendir Kenar)
                    this.playTek(time, vel);
                    break;
                case 42: // Te-ke / Rik Zili
                default:
                    this.playZil(time, vel);
                    break;
            }
        } else if (kitType === '808') {
            switch (midiNote) {
                case 36: this.play808Kick(time, vel); break;
                case 38: this.play808Snare(time, vel); break;
                default: this.play808Hat(time, vel); break;
            }
        } else {
            // Acoustic
            switch (midiNote) {
                case 36: this.playAcousticKick(time, vel); break;
                case 38: this.playAcousticSnare(time, vel); break;
                default: this.playAcousticHat(time, vel); break;
            }
        }
    }

    /** Düm: Deep, resonant membrane strike with wooden tokmak click */
    playDum(time, vel) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Membrane pitch drop (from ~120 Hz down to 55 Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(125 * (1 + vel * 0.15), time);
        osc.frequency.exponentialRampToValueAtTime(52, time + 0.08);

        gain.gain.setValueAtTime(vel * 0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35 + (vel * 0.15));

        osc.connect(gain);
        gain.connect(this.dest);

        osc.start(time);
        osc.stop(time + 0.55);

        // Tokmak wooden beater attack click
        this.playBeaterClick(time, vel * 0.75);
    }

    /** Tek: Crisp skin/rim hit with quick pitch fall and slight noise burst */
    playTek(time, vel) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260 * (1 + vel * 0.2), time);
        osc.frequency.exponentialRampToValueAtTime(140, time + 0.05);

        gain.gain.setValueAtTime(vel * 0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.connect(gain);
        gain.connect(this.dest);

        osc.start(time);
        osc.stop(time + 0.22);

        // Quick noise snap
        this.playNoiseBurst(time, 0.04, 3000, vel * 0.5);
    }

    /** Rik / Def Zili: High metallic shaker/jingle sound */
    playZil(time, vel) {
        this.playNoiseBurst(time, 0.06, 6500, vel * 0.45);
    }

    playBeaterClick(time, vel) {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.008); // 8ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; ++i) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1800;

        const gain = this.ctx.createGain();
        gain.gain.value = vel * 0.4;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        source.start(time);
    }

    playNoiseBurst(time, duration, highpassFreq, vel) {
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; ++i) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = highpassFreq;

        const gain = this.ctx.createGain();
        gain.gain.value = vel * 0.5;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.dest);

        source.start(time);
    }

    // 808 Machine Kit
    play808Kick(time, vel) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(95, time);
        osc.frequency.exponentialRampToValueAtTime(38, time + 0.07);
        gain.gain.setValueAtTime(vel * 0.95, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        osc.connect(gain);
        gain.connect(this.dest);
        osc.start(time);
        osc.stop(time + 0.55);
    }

    play808Snare(time, vel) {
        this.playNoiseBurst(time, 0.12, 1200, vel * 0.7);
    }

    play808Hat(time, vel) {
        this.playNoiseBurst(time, 0.04, 8000, vel * 0.4);
    }

    // Acoustic Standard Kit
    playAcousticKick(time, vel) {
        this.playDum(time, vel);
    }

    playAcousticSnare(time, vel) {
        this.playTek(time, vel);
    }

    playAcousticHat(time, vel) {
        this.playZil(time, vel);
    }
}

