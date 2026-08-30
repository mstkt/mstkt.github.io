/**
 * Heterophonic Bass & Low Register Engine
 *
 * In Turkish ensemble music, low instruments perform:
 * 1. DEM: Low durak held continuously.
 * 2. DEM & GÜÇLÜ: Drone alternating between Durak and Güçlü poles.
 * 3. HETEROPHONY: Melody doubled an octave below (-12 st) with short passing notes omitted.
 * 4. ON THE USUL: Struck durak landing on the strong positions of the Usul cycle.
 */

import { place } from './tuning.js';
import { findMakam } from './makam.js';
import { findUsul } from './usul.js';
import { XorShiftRng } from './melodyEngine.js';

export const BASS_KIND = {
    DEM: 'dem',
    DEM_AND_GUCLU: 'dem_and_guclu',
    DOUBLING: 'doubling',
    ON_THE_USUL: 'on_the_usul'
};

export const BASS_OPTIONS = [
    {
        id: BASS_KIND.DEM,
        name: 'DEM - Tek Ses Sabit',
        why: 'Durağın bir oktav altta kesintisiz tutulması. En kadim ve oturaklı eşlik.'
    },
    {
        id: BASS_KIND.DEM_AND_GUCLU,
        name: 'DEM - Durak ve Güçlü Geçişli',
        why: 'Dem perdesinin durak ile güçlü arasında ezginin dinlenme noktalarına göre hareket etmesi.'
    },
    {
        id: BASS_KIND.DOUBLING,
        name: 'HETEROFONİ - Melodiyi Alttan Takip',
        why: 'Melodiyi bir oktav alttan ve süslemelerden arındırılmış sade haliyle çalma; tipik Türk saz topluluğu dokusu.'
    },
    {
        id: BASS_KIND.ON_THE_USUL,
        name: 'USUL VURUŞLU BAS',
        why: 'Durağın usulün güçlü vuruşlarında vurulup bırakılması; ritme zemin kazandırır.'
    }
];

/**
 * Generates bass line notes.
 *
 * @param {object} options
 * @param {string} [options.kind='dem']
 * @param {object|string} options.makam
 * @param {object|string} options.usul
 * @param {number} [options.durakMidiNote=62]
 * @param {number} [options.startBeat=0]
 * @param {number} [options.cycles=4]
 * @param {Array<object>} [options.melody=[]] - used for doubling
 * @param {number} [options.seed=1]
 * @returns {Array<{ pitch: number, detuneCents: number, commas: number, startBeat: number, lengthBeats: number, velocity: number }>}
 */
export function generateMakamBass(options = {}) {
    const kind = options.kind || BASS_KIND.DEM;
    const makam = typeof options.makam === 'string' ? findMakam(options.makam) : (options.makam || findMakam('hicaz'));
    const usul = typeof options.usul === 'string' ? findUsul(options.usul) : (options.usul || findUsul('sofyan'));
    const durakMidi = options.durakMidiNote ?? 62;
    const startBeat = options.startBeat ?? 0.0;
    const cycles = Math.max(1, options.cycles ?? 4);
    const melody = options.melody || [];
    const seed = options.seed ?? 1;

    const rng = new XorShiftRng(seed);
    const out = [];

    const cycle16 = usul.cycleSixteenths || 16;
    const cycleBeats = cycle16 / 4.0;
    const lowBase = durakMidi - 12; // Kaba register (one octave down)

    function addNote(commas, at, length, vel = 0.7) {
        if (length <= 0) return;
        const p = place(lowBase, commas);
        out.push({
            pitch: p.note,
            detuneCents: p.detuneCents,
            commas: commas,
            startBeat: at,
            lengthBeats: length,
            velocity: vel,
            locked: false
        });
    }

    switch (kind) {
        case BASS_KIND.DEM:
            for (let c = 0; c < cycles; ++c) {
                addNote(0, startBeat + (c * cycleBeats), cycleBeats, 0.75);
            }
            break;

        case BASS_KIND.DEM_AND_GUCLU: {
            let onDurak = true;
            for (let c = 0; c < cycles; ++c) {
                if (c > 0 && rng.unit() < 0.45) {
                    onDurak = !onDurak;
                }
                const comma = onDurak ? 0 : (makam.guclu || 22);
                addNote(comma, startBeat + (c * cycleBeats), cycleBeats, 0.72);
            }
            break;
        }

        case BASS_KIND.DOUBLING: {
            if (melody.length === 0) {
                // Fallback to Dem if no melody exists yet
                for (let c = 0; c < cycles; ++c) {
                    addNote(0, startBeat + (c * cycleBeats), cycleBeats, 0.7);
                }
                break;
            }

            const endBeat = startBeat + (cycles * cycleBeats);
            const lengths = melody
                .filter(n => n.startBeat >= startBeat - 1e-4 && n.startBeat < endBeat)
                .map(n => n.lengthBeats);

            if (lengths.length === 0) break;
            lengths.sort((a, b) => a - b);
            const medianLen = lengths[Math.floor(lengths.length / 2)];

            for (const note of melody) {
                if (note.startBeat < startBeat - 1e-4 || note.startBeat >= endBeat - 1e-4) continue;

                let onCycle = false;
                if (usul.strong && usul.strong.length > 0) {
                    const into = note.startBeat - startBeat;
                    const inCycle = into - (Math.floor(into / cycleBeats) * cycleBeats);
                    for (const pos of usul.strong) {
                        if (Math.abs(inCycle - (pos / 4.0)) < 1e-4) {
                            onCycle = true;
                            break;
                        }
                    }
                }

                // Filter out short passing notes for heterophonic clarity
                if (note.lengthBeats < medianLen - 1e-4 && !onCycle) {
                    continue;
                }

                out.push({
                    pitch: note.pitch - 12,
                    detuneCents: note.detuneCents,
                    commas: note.commas,
                    startBeat: note.startBeat,
                    lengthBeats: note.lengthBeats,
                    velocity: 0.65,
                    locked: false
                });
            }
            break;
        }

        case BASS_KIND.ON_THE_USUL:
            for (let c = 0; c < cycles; ++c) {
                const barStart = startBeat + (c * cycleBeats);
                const strong = (usul.strong && usul.strong.length > 0) ? usul.strong : [0];

                for (let k = 0; k < strong.length; ++k) {
                    if (k > 0 && rng.unit() < 0.3) continue; // Player dynamics

                    const pos = strong[k];
                    const at = barStart + (pos / 4.0);
                    const until = (k + 1 < strong.length)
                        ? barStart + (strong[k + 1] / 4.0)
                        : barStart + cycleBeats;

                    addNote(0, at, Math.max(0.25, until - at), 0.7);
                }
            }
            break;
    }

    return out;
}

