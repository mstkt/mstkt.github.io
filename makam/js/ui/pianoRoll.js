/**
 * Interactive HTML5 Canvas Microtonal Piano Roll
 *
 * Visualizes and edits 53-EDO microtonal notes with:
 *  - Perde names (Dügâh, Segâh, Çârgâh, Nevâ, Hüseynî, etc.)
 *  - Microtonal cent offset badges
 *  - Usul rhythmic cycle division lines (additive grouping)
 *  - Interactive note drawing, moving, resizing, and locking
 *  - Playhead visualization
 */

import { place, getPerdeName } from '../theory/tuning.js';
import { getMakamDegrees } from '../theory/makam.js';

export class PianoRoll {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.song = options.song || { melody: [], chords: [], bass: [], drums: [] };
        this.makam = options.makam || null;
        this.usul = options.usul || null;
        this.durakMidi = options.durakMidiNote || 62;

        this.currentLayer = 'melody'; // 'melody' | 'bass' | 'chords' | 'drums'
        this.totalBeats = 16.0;
        this.playheadBeat = 0.0;

        // Viewport & Zoom
        this.pixelsPerBeat = 65.0;
        this.rowHeight = 22.0;
        this.headerHeight = 28.0;
        this.keyboardWidth = 110.0;
        this.scrollX = 0;
        this.scrollY = 0;

        // Visible pitch range (lowest & highest MIDI notes)
        this.minMidi = 48; // C3
        this.maxMidi = 84; // C6

        // Interaction State
        this.selectedNote = null;
        this.hoveredNote = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0, beat: 0, pitch: 0, length: 0 };

        // Callbacks
        this.onNoteChanged = null;
        this.onAuditionNote = null;
        this.onSeek = null;

        this.setupEvents();
        this.resize();
    }

    setMakam(makam, durakMidi) {
        this.makam = makam;
        this.durakMidi = durakMidi || this.durakMidi;
        this.render();
    }

    setUsul(usul) {
        this.usul = usul;
        this.render();
    }

    setLayer(layer) {
        this.currentLayer = layer;
        this.selectedNote = null;
        this.render();
    }

    setPlayhead(beat) {
        this.playheadBeat = beat;
        this.render();
    }

    setSong(song) {
        this.song = song;
        if (song.totalBeats) {
            this.totalBeats = song.totalBeats;
        }
        this.render();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.ctx.scale(dpr, dpr);
        this.render();
    }

    getActiveNotes() {
        switch (this.currentLayer) {
            case 'melody': return this.song.melody || [];
            case 'bass':   return this.song.bass || [];
            case 'drums':  return this.song.drums || [];
            case 'chords': return [];
            default:       return this.song.melody || [];
        }
    }

    beatToX(beat) {
        return this.keyboardWidth + (beat * this.pixelsPerBeat) - this.scrollX;
    }

    xToBeat(x) {
        return (x - this.keyboardWidth + this.scrollX) / this.pixelsPerBeat;
    }

    pitchToY(pitch) {
        return this.headerHeight + ((this.maxMidi - pitch) * this.rowHeight) - this.scrollY;
    }

    yToPitch(y) {
        return this.maxMidi - Math.floor((y - this.headerHeight + this.scrollY) / this.rowHeight);
    }

    setupEvents() {
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        // Wheel zoom / scroll
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.ctrlKey) {
                // Zoom
                const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
                this.pixelsPerBeat = Math.max(30, Math.min(180, this.pixelsPerBeat * zoomFactor));
            } else if (e.shiftKey) {
                this.scrollX = Math.max(0, this.scrollX + e.deltaY);
            } else {
                this.scrollY = Math.max(0, Math.min((this.maxMidi - this.minMidi) * this.rowHeight - 200, this.scrollY + e.deltaY));
            }
            this.render();
        }, { passive: false });
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Click on Left Keyboard (Audition)
        if (x < this.keyboardWidth && y >= this.headerHeight) {
            const pitch = this.yToPitch(y);
            if (pitch >= this.minMidi && pitch <= this.maxMidi) {
                if (this.onAuditionNote) {
                    this.onAuditionNote(pitch, 0);
                }
            }
            return;
        }

        // Click on Header timeline (Seek)
        if (y < this.headerHeight && x >= this.keyboardWidth) {
            const seekBeat = Math.max(0, this.xToBeat(x));
            if (this.onSeek) {
                this.onSeek(seekBeat);
            }
            return;
        }

        const notes = this.getActiveNotes();
        const clickedNote = this.findNoteAt(x, y);

        if (clickedNote) {
            this.selectedNote = clickedNote;
            const noteX = this.beatToX(clickedNote.startBeat);
            const noteW = clickedNote.lengthBeats * this.pixelsPerBeat;

            // Check if right edge resize
            if (x >= noteX + noteW - 10) {
                this.isResizing = true;
            } else {
                this.isDragging = true;
            }

            this.dragStart = {
                x, y,
                beat: clickedNote.startBeat,
                pitch: clickedNote.pitch,
                length: clickedNote.lengthBeats
            };
        } else {
            // Add new note on click
            const beat = Math.floor(this.xToBeat(x) * 4) / 4; // Snap to 16th
            const pitch = this.yToPitch(y);

            if (beat >= 0 && pitch >= this.minMidi && pitch <= this.maxMidi) {
                const newNote = {
                    pitch: pitch,
                    detuneCents: 0,
                    startBeat: beat,
                    lengthBeats: 0.5,
                    velocity: 0.8,
                    locked: false
                };
                notes.push(newNote);
                this.selectedNote = newNote;
                if (this.onNoteChanged) this.onNoteChanged();
                if (this.onAuditionNote) this.onAuditionNote(pitch, 0);
            }
        }

        this.render();
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.hoveredNote = this.findNoteAt(x, y);

        if (this.isResizing && this.selectedNote) {
            const currentBeat = this.xToBeat(x);
            const newLength = Math.max(0.25, Math.round((currentBeat - this.selectedNote.startBeat) * 4) / 4);
            this.selectedNote.lengthBeats = newLength;
            this.render();
            return;
        }

        if (this.isDragging && this.selectedNote && !this.selectedNote.locked) {
            const deltaBeat = (x - this.dragStart.x) / this.pixelsPerBeat;
            const deltaPitch = Math.round((this.dragStart.y - y) / this.rowHeight);

            this.selectedNote.startBeat = Math.max(0, Math.round((this.dragStart.beat + deltaBeat) * 4) / 4);
            this.selectedNote.pitch = Math.max(this.minMidi, Math.min(this.maxMidi, this.dragStart.pitch + deltaPitch));
            this.render();
            return;
        }

        // Update cursor style
        if (this.hoveredNote) {
            const noteX = this.beatToX(this.hoveredNote.startBeat);
            const noteW = this.hoveredNote.lengthBeats * this.pixelsPerBeat;
            this.canvas.style.cursor = (x >= noteX + noteW - 10) ? 'ew-resize' : 'pointer';
        } else {
            this.canvas.style.cursor = x < this.keyboardWidth ? 'pointer' : 'crosshair';
        }
    }

    onMouseUp() {
        if (this.isDragging || this.isResizing) {
            this.isDragging = false;
            this.isResizing = false;
            if (this.onNoteChanged) this.onNoteChanged();
        }
    }

    onDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const note = this.findNoteAt(x, y);
        if (note) {
            if (e.altKey) {
                // Alt + DblClick toggles Lock
                note.locked = !note.locked;
            } else {
                // Delete note
                const notes = this.getActiveNotes();
                const idx = notes.indexOf(note);
                if (idx !== -1) {
                    notes.splice(idx, 1);
                    this.selectedNote = null;
                }
            }
            if (this.onNoteChanged) this.onNoteChanged();
            this.render();
        }
    }

    findNoteAt(x, y) {
        const notes = this.getActiveNotes();
        for (let i = notes.length - 1; i >= 0; --i) {
            const n = notes[i];
            const nx = this.beatToX(n.startBeat);
            const ny = this.pitchToY(n.pitch);
            const nw = n.lengthBeats * this.pixelsPerBeat;
            const nh = this.rowHeight;

            if (x >= nx && x <= nx + nw && y >= ny && y <= ny + nh) {
                return n;
            }
        }
        return null;
    }

    render() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.clearRect(0, 0, width, height);

        // 1. Draw Background Grid
        this.drawGrid(width, height);

        // 2. Draw Notes
        this.drawNotes();

        // 3. Draw Playhead
        this.drawPlayhead(height);

        // 4. Draw Header Timeline
        this.drawHeader(width);

        // 5. Draw Left Keyboard
        this.drawKeyboard(height);
    }

    drawGrid(width, height) {
        const makamDegrees = this.makam ? getMakamDegrees(this.makam) : [];

        // Row backgrounds
        for (let p = this.minMidi; p <= this.maxMidi; ++p) {
            const y = this.pitchToY(p);
            if (y < this.headerHeight - this.rowHeight || y > height) continue;

            const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
            const isScaleDegree = makamDegrees.some(d => (place(this.durakMidi, d).note % 12) === (p % 12));

            this.ctx.fillStyle = isScaleDegree
                ? '#1e2430' // Highlighted Makam Perdesi
                : (isBlack ? '#13161c' : '#171b22');

            this.ctx.fillRect(this.keyboardWidth, y, width - this.keyboardWidth, this.rowHeight);

            // Row separator
            this.ctx.strokeStyle = '#222834';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.keyboardWidth, y + this.rowHeight);
            this.ctx.lineTo(width, y + this.rowHeight);
            this.ctx.stroke();
        }

        // Beat Vertical Lines (Usul aware)
        const cycle16 = this.usul ? this.usul.cycleSixteenths : 16;
        const cycleBeats = cycle16 / 4.0;

        for (let b = 0; b <= this.totalBeats + 4; b += 0.25) {
            const x = this.beatToX(b);
            if (x < this.keyboardWidth || x > width) continue;

            const isCycleBar = Math.abs(b % cycleBeats) < 1e-4;
            const isQuarter = Math.abs(b % 1.0) < 1e-4;

            this.ctx.beginPath();
            this.ctx.moveTo(x, this.headerHeight);
            this.ctx.lineTo(x, height);

            if (isCycleBar) {
                this.ctx.strokeStyle = '#00d2ff';
                this.ctx.lineWidth = 1.5;
            } else if (isQuarter) {
                this.ctx.strokeStyle = '#2f3b4d';
                this.ctx.lineWidth = 1;
            } else {
                this.ctx.strokeStyle = '#1d232e';
                this.ctx.lineWidth = 0.5;
            }
            this.ctx.stroke();
        }
    }

    drawNotes() {
        const notes = this.getActiveNotes();

        for (const n of notes) {
            const x = this.beatToX(n.startBeat);
            const y = this.pitchToY(n.pitch);
            const w = Math.max(6, n.lengthBeats * this.pixelsPerBeat);
            const h = this.rowHeight - 2;

            if (x + w < this.keyboardWidth || y < this.headerHeight - h) continue;

            const isSelected = (n === this.selectedNote);
            const isHovered = (n === this.hoveredNote);

            // Note background gradient
            const grad = this.ctx.createLinearGradient(x, y, x, y + h);
            if (this.currentLayer === 'melody') {
                grad.addColorStop(0, isSelected ? '#38ef7d' : (isHovered ? '#20c997' : '#11998e'));
                grad.addColorStop(1, isSelected ? '#11998e' : '#0a635c');
            } else if (this.currentLayer === 'bass') {
                grad.addColorStop(0, isSelected ? '#ff9a9e' : '#f093fb');
                grad.addColorStop(1, isSelected ? '#f5576c' : '#4facfe');
            } else {
                grad.addColorStop(0, '#f6d365');
                grad.addColorStop(1, '#fda085');
            }

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.roundRect(x + 1, y + 1, w - 2, h, 4);
            this.ctx.fill();

            // Note Border & Lock Icon
            this.ctx.strokeStyle = isSelected ? '#ffffff' : (n.locked ? '#ffc107' : '#00000044');
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.stroke();

            // Microtone & Perde label on note
            if (w > 28) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '10px Inter, system-ui, sans-serif';
                let label = '';
                if (n.detuneCents && Math.abs(n.detuneCents) > 1) {
                    label = `${n.detuneCents > 0 ? '+' : ''}${Math.round(n.detuneCents)}c`;
                }
                if (n.locked) label = `🔒 ${label}`;
                if (label) {
                    this.ctx.fillText(label, x + 6, y + h - 5);
                }
            }
        }
    }

    drawPlayhead(height) {
        const x = this.beatToX(this.playheadBeat);
        if (x < this.keyboardWidth) return;

        this.ctx.strokeStyle = '#ff3366';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();

        // Playhead head marker
        this.ctx.fillStyle = '#ff3366';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 6, 0);
        this.ctx.lineTo(x + 6, 0);
        this.ctx.lineTo(x, 10);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawHeader(width) {
        this.ctx.fillStyle = '#0f1218';
        this.ctx.fillRect(0, 0, width, this.headerHeight);

        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.headerHeight);
        this.ctx.lineTo(width, this.headerHeight);
        this.ctx.stroke();

        const cycle16 = this.usul ? this.usul.cycleSixteenths : 16;
        const cycleBeats = cycle16 / 4.0;

        // Measure / Bar labels
        for (let b = 0; b <= this.totalBeats + 4; b += cycleBeats) {
            const x = this.beatToX(b);
            if (x < this.keyboardWidth) continue;

            const barIndex = Math.floor(b / cycleBeats) + 1;
            this.ctx.fillStyle = '#8892b0';
            this.ctx.font = 'bold 11px Inter, system-ui, sans-serif';
            this.ctx.fillText(`Ölçü ${barIndex} (${this.usul ? this.usul.name : ''})`, x + 6, 18);
        }
    }

    drawKeyboard(height) {
        this.ctx.fillStyle = '#11141c';
        this.ctx.fillRect(0, this.headerHeight, this.keyboardWidth, height - this.headerHeight);

        for (let p = this.minMidi; p <= this.maxMidi; ++p) {
            const y = this.pitchToY(p);
            if (y < this.headerHeight - this.rowHeight || y > height) continue;

            const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
            const octave = Math.floor(p / 12) - 1;
            const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
            const westernName = `${noteNames[p % 12]}${octave}`;

            // Check if Durak or Güçlü
            const isDurak = (p === this.durakMidi);

            this.ctx.fillStyle = isDurak ? '#ff9800' : (isBlack ? '#1a1f2c' : '#283042');
            this.ctx.fillRect(0, y + 1, this.keyboardWidth - 2, this.rowHeight - 2);

            // Perde & Note Text
            this.ctx.fillStyle = isDurak ? '#000000' : (isBlack ? '#8c9bb4' : '#e2e8f0');
            this.ctx.font = isDurak ? 'bold 11px Inter' : '10px Inter';

            let label = westernName;
            if (isDurak) label += ' ★ Durak';
            this.ctx.fillText(label, 8, y + this.rowHeight - 6);
        }

        // Vertical divider
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.keyboardWidth, 0);
        this.ctx.lineTo(this.keyboardWidth, height);
        this.ctx.stroke();
    }
}

