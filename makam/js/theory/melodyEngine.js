/**
 * Seyir-Based Authentic Makam Melody Generator
 *
 * Implements rule-based phrase planning & stepwise melodic walking.
 * Preserves the true modal identity of each Makam:
 *  - Enters on the degree mandated by its Seyir (Durak, Güçlü, or Tiz Octave)
 *  - Rests on the Güçlü (Yarım Karar / Half Cadence) on intermediate phrases
 *  - Resolves to the Durak (Tam Karar) on the final phrase
 *  - Reaches the final from above or below as measured in the corpus (approachFrom)
 *  - Distributes note onsets and lengths matching the additive Usul cycle
 *  - Deterministic RNG (XorShift32) so any phrase can be recalled or varied
 */

import { KOMMA, place } from './tuning.js';
import { findMakam, getMakamDegrees, SEYIR } from './makam.js';
import { findUsul } from './usul.js';

/** Deterministic XorShift32 Random Number Generator */
export class XorShiftRng {
    constructor(seed = 1) {
        this.s = (seed && seed > 0) ? (seed >>> 0) : 0x9E3779B9;
    }

    next() {
        let x = this.s;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.s = x >>> 0;
        return this.s;
    }

    unit() {
        return (this.next() & 0xFFFFFF) / 0x1000000;
    }

    upTo(n) {
        return n <= 0 ? 0 : Math.floor(this.unit() * n);
    }
}

/**
 * Builds the pitch ladder (rungs in commas) across the allowed vocal/instrumental range.
 * @param {object} makam
 * @param {{ lowestComma: number, highestComma: number }} range
 */
export function buildLadder(makam, range = { lowestComma: -9, highestComma: 62 }) {
    const oct = getMakamDegrees(makam);
    const rungs = new Set();

    for (let shift = -KOMMA.PER_OCTAVE; shift <= KOMMA.PER_OCTAVE * 2; shift += KOMMA.PER_OCTAVE) {
        for (const d of oct) {
            const at = d + shift;
            if (at >= range.lowestComma && at <= range.highestComma) {
                rungs.add(at);
            }
        }
    }

    const sorted = Array.from(rungs).sort((a, b) => a - b);
    return sorted.length >= 3 ? sorted : [0, 9, 18, 22, 31, 40, 49, 53];
}

/** Finds the ladder index nearest to a given comma height */
export function nearestRung(rungs, comma) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < rungs.length; ++i) {
        const d = Math.abs(rungs[i] - comma);
        if (d < bestDist) {
            bestDist = d;
            best = i;
        }
    }
    return best;
}

/**
 * Generates the Seyir phrase plan.
 * Returns start and destination comma heights for each phrase.
 *
 * @param {object} makam
 * @param {number} phraseCount - number of cycles/bars
 * @returns {Array<{ fromComma: number, toComma: number, isFinal: boolean }>}
 */
export function phrasePlan(makam, phraseCount = 4) {
    const out = [];
    const count = Math.max(1, phraseCount);
    const durak = 0;
    const guclu = makam.guclu || KOMMA.FIFTH;
    const top = KOMMA.PER_OCTAVE;

    // Entry degree based on Seyir
    let at = durak;
    switch (makam.seyir) {
        case SEYIR.ASCENDING:  at = durak; break;
        case SEYIR.DESCENDING: at = top;   break;
        case SEYIR.FROM_ABOVE: at = guclu; break;
        case SEYIR.FROM_BELOW: at = durak; break;
        default:               at = durak; break;
    }

    for (let i = 0; i < count; ++i) {
        const isFinal = (i === count - 1);
        let target;

        if (isFinal) {
            target = durak; // Tam Karar (Final cadence on Durak)
        } else if (i === count - 2) {
            target = guclu; // Yarım Karar (Half cadence on Güçlü right before final)
        } else {
            // Intermediate exploration around Güçlü and Tiz
            const exploreHigh = (makam.seyir === SEYIR.ASCENDING || makam.seyir === SEYIR.FROM_BELOW)
                ? (i % 2 === 1)
                : (i % 2 === 0);

            if (i === 0 && makam.seyir === SEYIR.ASCENDING) {
                target = guclu;
            } else if (exploreHigh) {
                target = top;
            } else {
                target = guclu;
            }
        }

        out.push({ fromComma: at, toComma: target, isFinal });
        at = target;
    }

    return out;
}

/**
 * Generates a full Makam melody.
 *
 * @param {object} options
 * @param {string|object} options.makam - Makam object or ID
 * @param {string|object} options.usul - Usul object or ID
 * @param {number} [options.durakMidiNote=62] - e.g. 62 (D4 / Dugah)
 * @param {number} [options.startBeat=0]
 * @param {number} [options.cycles=4] - number of usul cycles
 * @param {number} [options.density=0.34] - note density (0.1 to 0.9)
 * @param {number} [options.seed=1]
 * @param {{ lowestComma: number, highestComma: number }} [options.range]
 * @param {Array<object>} [options.lockedNotes=[]] - existing notes to preserve
 * @returns {Array<{ pitch: number, detuneCents: number, startBeat: number, lengthBeats: number, velocity: number, locked: boolean }>}
 */
export function generateMakamMelody(options = {}) {
    const makam = typeof options.makam === 'string' ? findMakam(options.makam) : (options.makam || findMakam('hicaz'));
    const usul = typeof options.usul === 'string' ? findUsul(options.usul) : (options.usul || findUsul('sofyan'));
    const durakMidi = options.durakMidiNote ?? 62;
    const startBeat = options.startBeat ?? 0.0;
    const cycles = Math.max(1, options.cycles ?? 4);
    const density = Math.max(0.1, Math.min(0.9, options.density ?? 0.34));
    const freedom = Math.max(0.0, Math.min(1.0, options.freedom ?? 0.35));
    const seed = options.seed ?? 1;
    const range = options.range ?? { lowestComma: -9, highestComma: 62 };

    const rungs = buildLadder(makam, range);
    const cycle16 = usul.cycleSixteenths || 16;
    const cycleBeats = cycle16 / 4.0;

    const rng = new XorShiftRng(seed);
    const plan = phrasePlan(makam, cycles);
    const out = [];

    let here = nearestRung(rungs, plan[0].fromComma);

    for (let p = 0; p < plan.length; ++p) {
        const phrase = plan[p];
        const barStart = startBeat + (p * cycleBeats);
        const target = nearestRung(rungs, phrase.toComma);

        // Select rhythmic slot onsets based on measured Usul statistics
        const slots = [];
        for (let i = 0; i < cycle16; ++i) {
            let share = (usul.onsetShare && i < usul.onsetShare.length)
                ? usul.onsetShare[i]
                : (i % 4 === 0 ? 0.2 : 0.05);

            if (freedom > 0.45 && (i % 2 !== 0)) {
                share += (freedom * 0.04);
            }

            if (share * cycle16 * density > rng.unit()) {
                slots.push(i);
            }
        }

        if (slots.length === 0) {
            slots.push(usul.startsOn || 0);
        }

        // Ensure enough steps to walk the distance without jumping
        const dist = Math.abs(target - here);
        const needed = dist + (phrase.isFinal ? 2 : 1);

        if (slots.length < needed) {
            const byWeight = [];
            for (let i = 0; i < cycle16; ++i) {
                if (!slots.includes(i)) {
                    byWeight.push(i);
                }
            }

            byWeight.sort((a, b) => {
                const sa = (usul.onsetShare && a < usul.onsetShare.length) ? usul.onsetShare[a] : 0;
                const sb = (usul.onsetShare && b < usul.onsetShare.length) ? usul.onsetShare[b] : 0;
                return sb - sa;
            });

            for (const i of byWeight) {
                if (slots.length >= needed) break;
                slots.push(i);
            }

            slots.sort((a, b) => a - b);
        }

        // Approach note calculation for final phrase
        const approachRung = phrase.isFinal
            ? nearestRung(rungs, phrase.toComma + (makam.approachFrom || 0))
            : -1;

        const n = slots.length;

        for (let s = 0; s < n; ++s) {
            if (s === n - 1) {
                if (phrase.isFinal || freedom < 0.75 || rng.unit() > (freedom * 0.25)) {
                    here = target;
                }
            } else if (phrase.isFinal && s === n - 2 && approachRung >= 0 && Math.abs(approachRung - here) <= 3) {
                here = approachRung;
            } else if (s > 0) {
                const toward = target > here ? 1 : (target < here ? -1 : 0);
                const stepsLeft = (n - 1 - s) - (phrase.isFinal ? 1 : 0);
                const remaining = Math.abs(target - here);
                const mustMarch = (toward !== 0) && (remaining >= stepsLeft) && (freedom < 0.6 || phrase.isFinal);

                let step = 0;
                if (mustMarch) {
                    step = toward;
                } else {
                    const lean = phrase.isFinal ? 0.96 : Math.max(0.42, 0.92 - (freedom * 0.50));
                    step = (rng.unit() < lean && toward !== 0) ? toward : (rng.unit() < 0.5 ? 1 : -1);
                    const leapChance = 0.05 + (freedom * 0.32);
                    if (rng.unit() < leapChance) {
                        step *= (rng.unit() < (freedom * 0.45) ? 3 : 2);
                    }
                }

                here = Math.max(0, Math.min(rungs.length - 1, here + step));
            }

            const pos = slots[s];
            const atBeat = barStart + (pos / 4.0);
            const until = (s + 1 < n) ? (slots[s + 1] / 4.0) : cycleBeats;
            const lengthBeats = until - (pos / 4.0);

            if (lengthBeats <= 0.0) continue;

            const restsHere = usul.strong && usul.strong.includes(pos);
            let noteCommas = rungs[here];

            if (freedom > 0.65 && !phrase.isFinal && rng.unit() < (freedom * 0.12)) {
                noteCommas += (rng.unit() < 0.5 ? 1 : -1);
            }

            const sounding = place(durakMidi, noteCommas);

            let ornament = null;
            if (!phrase.isFinal && lengthBeats >= 0.5) {
                const ornRoll = rng.unit();
                const ornThreshold = 0.08 + (freedom * 0.38);
                if (ornRoll < ornThreshold) {
                    const types = ['grace', 'mordent', 'slide', 'turn'];
                    ornament = types[Math.floor(rng.unit() * types.length)];
                }
            }

            out.push({
                pitch: sounding.note,
                detuneCents: sounding.detuneCents,
                commas: noteCommas,
                startBeat: atBeat,
                lengthBeats: lengthBeats,
                velocity: restsHere ? 0.86 : 0.66,
                locked: false,
                ornament: ornament
            });
        }
    }
    return out;
}

