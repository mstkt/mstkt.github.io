/**
 * Dem & Makam Accompaniment Strip UI Component
 *
 * Renders the accompaniment blocks across the timeline,
 * displaying Dem drones, ladder stacks, microtonal flags, and lock states.
 */

import { place } from '../theory/tuning.js';

export class ChordStrip {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.song = options.song || { chords: [] };
        this.usul = options.usul || null;
        this.durakMidi = options.durakMidiNote || 62;

        this.selectedIndex = 0;
        this.onSelect = null;
        this.onAudition = null;
        this.onToggleLock = null;

        this.render();
    }

    setSong(song) {
        this.song = song;
        this.render();
    }

    setUsul(usul) {
        this.usul = usul;
        this.render();
    }

    setDurak(durakMidi) {
        this.durakMidi = durakMidi;
        this.render();
    }

    select(index) {
        this.selectedIndex = index;
        this.render();
        if (this.onSelect) {
            this.onSelect(this.song.chords[index], index);
        }
    }

    render() {
        this.container.innerHTML = '';
        const chords = this.song.chords || [];

        chords.forEach((chord, idx) => {
            const block = document.createElement('div');
            block.className = `chord-block ${idx === this.selectedIndex ? 'selected' : ''} ${chord.locked ? 'locked' : ''}`;

            const header = document.createElement('div');
            header.className = 'chord-header';

            const barLabel = document.createElement('span');
            barLabel.className = 'chord-bar-num';
            barLabel.textContent = `Ölçü ${idx + 1}`;

            const lockBtn = document.createElement('button');
            lockBtn.className = `chord-lock-btn ${chord.locked ? 'active' : ''}`;
            lockBtn.innerHTML = chord.locked ? '🔒' : '🔓';
            lockBtn.title = chord.locked ? 'Kilidi Aç' : 'Bu Eşliği Kilitle';
            lockBtn.onclick = (e) => {
                e.stopPropagation();
                chord.locked = !chord.locked;
                this.render();
                if (this.onToggleLock) this.onToggleLock(chord, idx);
            };

            header.appendChild(barLabel);
            header.appendChild(lockBtn);

            const title = document.createElement('div');
            title.className = 'chord-title';
            title.textContent = chord.name || 'DEM - Durak';

            const detail = document.createElement('div');
            detail.className = 'chord-commas';
            if (chord.commas && chord.commas.length > 0) {
                const pitchLabels = chord.commas.map(c => {
                    const p = place(this.durakMidi, c);
                    return `${c}k (${p.detuneCents !== 0 ? (p.detuneCents > 0 ? '+' : '') + Math.round(p.detuneCents) + 'c' : '0c'})`;
                });
                detail.textContent = pitchLabels.join(' · ');
            } else {
                detail.textContent = 'Durak Sesi';
            }

            block.appendChild(header);
            block.appendChild(title);
            block.appendChild(detail);

            block.onclick = () => {
                this.select(idx);
                if (this.onAudition && chord.commas) {
                    this.onAudition(chord.commas, this.durakMidi);
                }
            };

            this.container.appendChild(block);
        });
    }
}

