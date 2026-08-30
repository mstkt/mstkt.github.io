/**
 * Master Web Audio Engine & Transport Scheduler
 *
 * Implements high-precision lookahead audio scheduling for smooth,
 * glitch-free playback of microtonal melodies, accompaniment drones,
 * heterophonic basslines, and usul percussion.
 */

import { SynthVoice, INSTRUMENTS } from './synthVoice.js';
import { DrumSynth } from './drumSynth.js';
import { place } from '../theory/tuning.js';

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;

        // Channel Gain Nodes
        this.melodyGainNode = null;
        this.chordGainNode = null;
        this.bassGainNode = null;
        this.drumGainNode = null;

        // Instrument Engines
        this.melodySynth = null;
        this.chordSynth = null;
        this.bassSynth = null;
        this.drumSynth = null;

        // Transport Settings
        this.bpm = 100.0;
        this.isPlaying = false;
        this.isLooping = true;
        this.currentBeat = 0.0;
        this.totalBeats = 16.0;
        this.loopStartBeat = 0.0;
        this.loopEndBeat = 16.0;

        // Instrument Choices
        this.melodyInstrument = INSTRUMENTS.NEY;
        this.chordInstrument = INSTRUMENTS.DRONE;
        this.bassInstrument = INSTRUMENTS.BASS_PLAIN;
        this.drumKit = 'turkish';

        // Scheduled Song Events
        this.song = {
            melody: [],
            chords: [],
            bass: [],
            drums: []
        };

        // Scheduling Internals
        this.lookaheadMs = 25.0;     // Frequency of scheduling check
        this.scheduleAheadSec = 0.1; // How far ahead to schedule Web Audio events
        this.timerId = null;
        this.lastScheduleBeat = 0.0;
        this.startTimeAudio = 0.0;
        this.startBeatOffset = 0.0;

        // UI callbacks
        this.onPlayheadUpdate = null;
        this.onStateChange = null;
    }

    /**
     * Initializes the AudioContext upon user gesture.
     */
    async init() {
        if (this.ctx && this.ctx.state !== 'closed') {
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }
            return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();

        // Master Dynamics Compressor (Transparent limiter to prevent clipping)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -3.0;
        this.compressor.knee.value = 4.0;
        this.compressor.ratio.value = 12.0;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.15;

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.85;

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Channel Gain Nodes
        this.melodyGainNode = this.ctx.createGain();
        this.chordGainNode = this.ctx.createGain();
        this.bassGainNode = this.ctx.createGain();
        this.drumGainNode = this.ctx.createGain();

        // Initial Channel Levels
        this.melodyGainNode.gain.value = 1.0;
        this.chordGainNode.gain.value = 0.75;
        this.bassGainNode.gain.value = 0.80;
        this.drumGainNode.gain.value = 0.85;

        this.melodyGainNode.connect(this.compressor);
        this.chordGainNode.connect(this.compressor);
        this.bassGainNode.connect(this.compressor);
        this.drumGainNode.connect(this.compressor);

        // Synthesizers
        this.melodySynth = new SynthVoice(this.ctx, this.melodyGainNode);
        this.chordSynth  = new SynthVoice(this.ctx, this.chordGainNode);
        this.bassSynth   = new SynthVoice(this.ctx, this.bassGainNode);
        this.drumSynth   = new DrumSynth(this.ctx, this.drumGainNode);
    }

    setBpm(newBpm) {
        this.bpm = Math.max(30, Math.min(300, newBpm));
    }

    setChannelVolume(channel, volume) {
        const v = Math.max(0, Math.min(2.0, volume));
        if (!this.ctx) return;
        switch (channel) {
            case 'melody': if (this.melodyGainNode) this.melodyGainNode.gain.value = v; break;
            case 'chords': if (this.chordGainNode) this.chordGainNode.gain.value = v; break;
            case 'bass':   if (this.bassGainNode) this.bassGainNode.gain.value = v; break;
            case 'drums':  if (this.drumGainNode) this.drumGainNode.gain.value = v; break;
            case 'master': if (this.masterGain) this.masterGain.gain.value = v; break;
        }
    }

    /**
     * Converts a song beat position to AudioContext time.
     */
    beatToTime(beat) {
        const secPerBeat = 60.0 / this.bpm;
        return this.startTimeAudio + ((beat - this.startBeatOffset) * secPerBeat);
    }

    /**
     * Converts an AudioContext time to song beat position.
     */
    timeToBeat(time) {
        const secPerBeat = 60.0 / this.bpm;
        return this.startBeatOffset + ((time - this.startTimeAudio) / secPerBeat);
    }

    async play() {
        await this.init();
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.startTimeAudio = this.ctx.currentTime;
        this.startBeatOffset = this.currentBeat;
        this.lastScheduleBeat = this.currentBeat;

        this.timerId = setInterval(() => this.scheduleLoop(), this.lookaheadMs);
        if (this.onStateChange) this.onStateChange(true);
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        if (this.onStateChange) this.onStateChange(false);
    }

    stop() {
        this.pause();
        this.currentBeat = this.loopStartBeat;
        if (this.onPlayheadUpdate) this.onPlayheadUpdate(this.currentBeat);
    }

    seek(beat) {
        const wasPlaying = this.isPlaying;
        if (wasPlaying) this.pause();
        this.currentBeat = Math.max(0, Math.min(this.totalBeats, beat));
        if (this.onPlayheadUpdate) this.onPlayheadUpdate(this.currentBeat);
        if (wasPlaying) this.play();
    }

    setSongData(songData) {
        this.song = {
            melody: songData.melody || [],
            chords: songData.chords || [],
            bass: songData.bass || [],
            drums: songData.drums || []
        };
        if (songData.totalBeats) {
            this.totalBeats = songData.totalBeats;
            this.loopEndBeat = songData.totalBeats;
        }
    }

    scheduleLoop() {
        if (!this.isPlaying || !this.ctx) return;

        const currentAudioTime = this.ctx.currentTime;
        const currentPlayingBeat = this.timeToBeat(currentAudioTime);

        // Handle looping
        if (this.isLooping && currentPlayingBeat >= this.loopEndBeat) {
            this.startBeatOffset = this.loopStartBeat;
            this.startTimeAudio = currentAudioTime;
            this.lastScheduleBeat = this.loopStartBeat;
        }

        this.currentBeat = Math.max(0, this.timeToBeat(currentAudioTime));
        if (this.onPlayheadUpdate) {
            this.onPlayheadUpdate(this.currentBeat);
        }

        const secPerBeat = 60.0 / this.bpm;
        const scheduleHorizonBeats = this.scheduleAheadSec / secPerBeat;
        const fromBeat = this.lastScheduleBeat;
        const toBeat = this.currentBeat + scheduleHorizonBeats;

        this.scheduleRange(fromBeat, toBeat);
        this.lastScheduleBeat = toBeat;
    }

    scheduleRange(fromBeat, toBeat) {
        const secPerBeat = 60.0 / this.bpm;

        // Schedule Melody Events
        for (const note of this.song.melody) {
            if (note.startBeat >= fromBeat - 1e-4 && note.startBeat < toBeat) {
                const startTime = this.beatToTime(note.startBeat);
                const duration = note.lengthBeats * secPerBeat;
                this.melodySynth.playNote(
                    note.pitch,
                    note.detuneCents || 0,
                    startTime,
                    duration,
                    note.velocity || 0.8,
                    this.melodyInstrument
                );
            }
        }

        // Schedule Chord / Dem Events
        for (const chord of this.song.chords) {
            if (chord.startBeat >= fromBeat - 1e-4 && chord.startBeat < toBeat) {
                const startTime = this.beatToTime(chord.startBeat);
                const duration = chord.lengthBeats * secPerBeat;
                const durakMidi = chord.durakMidiNote || 62;

                if (chord.commas && chord.commas.length > 0) {
                    for (const comma of chord.commas) {
                        const p = place(durakMidi, comma);
                        this.chordSynth.playNote(
                            p.note,
                            p.detuneCents,
                            startTime,
                            duration,
                            0.75,
                            this.chordInstrument
                        );
                    }
                }
            }
        }

        // Schedule Bass Events
        for (const note of this.song.bass) {
            if (note.startBeat >= fromBeat - 1e-4 && note.startBeat < toBeat) {
                const startTime = this.beatToTime(note.startBeat);
                const duration = note.lengthBeats * secPerBeat;
                this.bassSynth.playNote(
                    note.pitch,
                    note.detuneCents || 0,
                    startTime,
                    duration,
                    note.velocity || 0.7,
                    this.bassInstrument
                );
            }
        }

        // Schedule Drum Events
        for (const hit of this.song.drums) {
            if (hit.startBeat >= fromBeat - 1e-4 && hit.startBeat < toBeat) {
                const startTime = this.beatToTime(hit.startBeat);
                this.drumSynth.trigger(
                    hit.pitch,
                    startTime,
                    hit.velocity || 0.8,
                    this.drumKit
                );
            }
        }
    }

    /** Audition a single microtonal pitch (e.g. from degree tiles) */
    async auditionNote(midiNote, detuneCents = 0, instrument = null) {
        await this.init();
        const inst = instrument || this.melodyInstrument;
        this.melodySynth.playNote(midiNote, detuneCents, this.ctx.currentTime, 0.6, 0.85, inst);
    }

    /** Audition a makam chord / dem stack */
    async auditionChord(commas, durakMidiNote = 62, instrument = null) {
        await this.init();
        const inst = instrument || this.chordInstrument;
        for (const comma of commas) {
            const p = place(durakMidiNote, comma);
            this.chordSynth.playNote(p.note, p.detuneCents, this.ctx.currentTime, 1.2, 0.75, inst);
        }
    }

    /** Audition a drum hit */
    async auditionDrum(midiNote, kitType = null) {
        await this.init();
        const kit = kitType || this.drumKit;
        this.drumSynth.trigger(midiNote, this.ctx.currentTime, 0.9, kit);
    }
}

