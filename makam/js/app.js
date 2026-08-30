/**
 * Makam Studio - Main Application Controller
 *
 * Coordinates Makam & Usul theory models, Web Audio playback,
 * Canvas Piano Roll, Chord Strip, Candidate Panel, and MIDI export.
 */

import { MAKAMS, findMakam } from './theory/makam.js';
import { USULS, findUsul, getUsulBeats } from './theory/usul.js';
import { AHENK_LIST } from './theory/tuning.js';
import { generateMakamMelody } from './theory/melodyEngine.js';
import { getMakamChords } from './theory/accompaniment.js';
import { generateMakamBass, BASS_KIND } from './theory/bassEngine.js';
import { generateUsulDrums, GROOVE_KIND } from './theory/rhythmEngine.js';
import { AudioEngine } from './audio/audioEngine.js';
import { PianoRoll } from './ui/pianoRoll.js';
import { ChordStrip } from './ui/chordStrip.js';
import { CandidatePanel } from './ui/candidatePanel.js';
import { Mixer } from './ui/mixer.js';
import { downloadMidiFile } from './io/midiExport.js';

class MakamStudioApp {
    constructor() {
        this.currentMakam = findMakam('hicaz');
        this.currentUsul  = findUsul('sofyan');
        this.currentAhenk = AHENK_LIST[0]; // Bolahenk (D4 = 62)
        this.durakMidi    = this.currentAhenk.durakNote;
        this.cycles       = 4;
        this.bpm          = 100;

        this.song = {
            melody: [],
            chords: [],
            bass: [],
            drums: [],
            totalBeats: 16.0
        };

        this.audio = new AudioEngine();
        this.pianoRoll = null;
        this.chordStrip = null;
        this.candidatePanel = null;
        this.mixer = null;

        this.init();
    }

    async init() {
        this.setupHeaderPickers();
        this.setupComponents();
        this.setupTransportControls();
        this.generateAll(); // Initial generation with defaults
    }

    setupHeaderPickers() {
        // Makam Dropdown
        const makamSelect = document.getElementById('makamSelect');
        if (makamSelect) {
            makamSelect.innerHTML = MAKAMS.map(m => `<option value="${m.id}" ${m.id === this.currentMakam.id ? 'selected' : ''}>${m.name} Makamı</option>`).join('');
            makamSelect.onchange = (e) => {
                this.currentMakam = findMakam(e.target.value);
                this.onMakamChanged();
            };
        }

        // Usul Dropdown
        const usulSelect = document.getElementById('usulSelect');
        if (usulSelect) {
            usulSelect.innerHTML = USULS.map(u => `<option value="${u.id}" ${u.id === this.currentUsul.id ? 'selected' : ''}>${u.name} (${u.beats}/${u.beatType})</option>`).join('');
            usulSelect.onchange = (e) => {
                this.currentUsul = findUsul(e.target.value);
                this.onUsulChanged();
            };
        }

        // Cycle Count
        const cycleSelect = document.getElementById('cycleSelect');
        if (cycleSelect) {
            cycleSelect.onchange = (e) => {
                this.cycles = parseInt(e.target.value, 10);
                this.updateTotalBeats();
                this.generateAll();
            };
        }

        // BPM Input
        const bpmInput = document.getElementById('bpmInput');
        if (bpmInput) {
            bpmInput.value = this.bpm;
            bpmInput.oninput = (e) => {
                this.bpm = parseInt(e.target.value, 10) || 100;
                this.audio.setBpm(this.bpm);
            };
        }

        // MIDI Export Button
        const btnExport = document.getElementById('btnExportMidi');
        if (btnExport) {
            btnExport.onclick = () => {
                const fileName = `${this.currentMakam.name}_${this.currentUsul.name}_${this.bpm}bpm.mid`.toLowerCase();
                downloadMidiFile(this.song, this.bpm, this.currentUsul, fileName);
            };
        }

        // Generate All Button
        const btnGenAll = document.getElementById('btnGenAll');
        if (btnGenAll) {
            btnGenAll.onclick = () => {
                this.generateAll();
            };
        }
    }

    setupComponents() {
        const canvas = document.getElementById('pianoRollCanvas');
        const chordStripElem = document.getElementById('chordStripContainer');
        const panelElem = document.getElementById('candidatePanelContainer');
        const mixerElem = document.getElementById('mixerContainer');

        this.updateTotalBeats();

        // 1. Piano Roll
        this.pianoRoll = new PianoRoll(canvas, {
            song: this.song,
            makam: this.currentMakam,
            usul: this.currentUsul,
            durakMidiNote: this.durakMidi
        });

        this.pianoRoll.onAuditionNote = (note, detune) => {
            this.audio.auditionNote(note, detune);
        };

        this.pianoRoll.onSeek = (beat) => {
            this.audio.seek(beat);
        };

        this.pianoRoll.onNoteChanged = () => {
            this.audio.setSongData(this.song);
        };

        // 2. Chord Strip
        this.chordStrip = new ChordStrip(chordStripElem, {
            song: this.song,
            usul: this.currentUsul,
            durakMidiNote: this.durakMidi
        });

        this.chordStrip.onAudition = (commas, durak) => {
            this.audio.auditionChord(commas, durak);
        };

        // 3. Candidate Panel
        this.candidatePanel = new CandidatePanel(panelElem, {
            makam: this.currentMakam,
            usul: this.currentUsul,
            durakMidiNote: this.durakMidi
        });

        this.candidatePanel.onAuditionNote = (note, detune) => {
            this.audio.auditionNote(note, detune);
        };

        this.candidatePanel.onAuditionChord = (commas, durak) => {
            this.audio.auditionChord(commas, durak);
        };

        this.candidatePanel.onApplyChord = (chordItem) => {
            const idx = this.chordStrip.selectedIndex;
            if (idx >= 0 && idx < this.song.chords.length) {
                this.song.chords[idx].name = chordItem.name;
                this.song.chords[idx].commas = chordItem.commas;
                this.chordStrip.render();
                this.audio.setSongData(this.song);
            }
        };

        this.candidatePanel.onGenerateMelody = (density, seed) => {
            this.generateMelody(density, seed);
        };

        this.candidatePanel.onGenerateBass = (kind) => {
            this.generateBass(kind);
        };

        this.candidatePanel.onGenerateDrums = (groove) => {
            this.generateDrums(groove);
        };

        // 4. Mixer
        this.mixer = new Mixer(mixerElem, this.audio, {
            onAhenkChange: (ahenk) => {
                this.currentAhenk = ahenk;
                this.durakMidi = ahenk.durakNote;
                this.pianoRoll.setMakam(this.currentMakam, this.durakMidi);
                this.chordStrip.setDurak(this.durakMidi);
                this.candidatePanel.setMakam(this.currentMakam, this.durakMidi);
                this.generateAll();
            }
        });

        // Layer Switcher Buttons (Melodi, Bas, Vurmalı)
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const layer = e.target.dataset.layer;
                this.pianoRoll.setLayer(layer);
            };
        });

        // Audio Engine Playhead Sync
        this.audio.onPlayheadUpdate = (beat) => {
            this.pianoRoll.setPlayhead(beat);
            const timeDisplay = document.getElementById('timeDisplay');
            if (timeDisplay) {
                timeDisplay.textContent = `Vuruş: ${beat.toFixed(2)}`;
            }
        };

        this.audio.onStateChange = (isPlaying) => {
            const playBtn = document.getElementById('btnPlay');
            if (playBtn) {
                playBtn.innerHTML = isPlaying ? '⏸️ Duraklat' : '▶️ Oynat';
                playBtn.classList.toggle('btn-playing', isPlaying);
            }
        };
    }

    setupTransportControls() {
        const btnPlay = document.getElementById('btnPlay');
        const btnStop = document.getElementById('btnStop');
        const btnLoop = document.getElementById('btnLoop');

        if (btnPlay) {
            btnPlay.onclick = async () => {
                if (this.audio.isPlaying) {
                    this.audio.pause();
                } else {
                    await this.audio.play();
                }
            };
        }

        if (btnStop) {
            btnStop.onclick = () => {
                this.audio.stop();
            };
        }

        if (btnLoop) {
            btnLoop.onclick = (e) => {
                this.audio.isLooping = !this.audio.isLooping;
                e.target.classList.toggle('active', this.audio.isLooping);
            };
        }
    }

    updateTotalBeats() {
        const cycleBeats = getUsulBeats(this.currentUsul);
        this.song.totalBeats = cycleBeats * this.cycles;
        this.audio.totalBeats = this.song.totalBeats;
        this.audio.loopEndBeat = this.song.totalBeats;
    }

    onMakamChanged() {
        this.pianoRoll.setMakam(this.currentMakam, this.durakMidi);
        this.candidatePanel.setMakam(this.currentMakam, this.durakMidi);
        this.generateAll();
    }

    onUsulChanged() {
        this.updateTotalBeats();
        this.pianoRoll.setUsul(this.currentUsul);
        this.chordStrip.setUsul(this.currentUsul);
        this.candidatePanel.setUsul(this.currentUsul);
        this.generateAll();
    }

    generateMelody(density = 0.34, seed = 1) {
        this.song.melody = generateMakamMelody({
            makam: this.currentMakam,
            usul: this.currentUsul,
            durakMidiNote: this.durakMidi,
            startBeat: 0.0,
            cycles: this.cycles,
            density: density,
            seed: seed
        });
        this.updateUI();
    }

    generateChords() {
        const cycleBeats = getUsulBeats(this.currentUsul);
        const options = getMakamChords(this.currentMakam, this.durakMidi);
        const defaultDem = options[0]; // DEM - Durak

        this.song.chords = [];
        for (let i = 0; i < this.cycles; ++i) {
            this.song.chords.push({
                name: defaultDem.name,
                commas: defaultDem.commas,
                startBeat: i * cycleBeats,
                lengthBeats: cycleBeats,
                durakMidiNote: this.durakMidi,
                locked: false
            });
        }
        this.chordStrip.setSong(this.song);
    }

    generateBass(kind = BASS_KIND.DEM) {
        this.song.bass = generateMakamBass({
            kind: kind,
            makam: this.currentMakam,
            usul: this.currentUsul,
            durakMidiNote: this.durakMidi,
            startBeat: 0.0,
            cycles: this.cycles,
            melody: this.song.melody,
            seed: 1
        });
        this.updateUI();
    }

    generateDrums(groove = GROOVE_KIND.ANSWERED) {
        this.song.drums = generateUsulDrums({
            usul: this.currentUsul,
            groove: groove,
            startBeat: 0.0,
            cycles: this.cycles,
            density: 0.5,
            seed: 1
        });
        this.updateUI();
    }

    generateAll() {
        this.updateTotalBeats();
        this.generateChords();
        this.generateMelody();
        this.generateBass(BASS_KIND.DEM);
        this.generateDrums(GROOVE_KIND.ANSWERED);
        this.updateUI();
    }

    updateUI() {
        this.pianoRoll.setSong(this.song);
        this.chordStrip.setSong(this.song);
        this.audio.setSongData(this.song);
    }
}

// Launch application on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new MakamStudioApp();
});

