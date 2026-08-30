/**
 * Usul Rhythm & Percussion Generator Engine
 *
 * Implements traditional Turkish percussion groove generation:
 *  - Düm (Heavy low resonant stroke - Kudüm Sağ / Bendir göbek)
 *  - Tek (Crisp rim/skin stroke - Kudüm Sol / Bendir kenar)
 *  - Te-ke / Tâ-hek (Subdivisions & accents - Rik / Zilli def)
 */

import { findUsul } from './usul.js';
import { XorShiftRng } from './melodyEngine.js';

export const USUL_KIT = {
    HEAVY: 36, // Düm (Kick / Kudüm Sağ / Bendir Göbek)
    LIGHT: 38, // Tek (Snare / Kudüm Sol / Bendir Kenar)
    FILL:  42  // Te-ke (Closed Hat / Rik Zili)
};

export const GROOVE_KIND = {
    BARE: 'bare',
    ANSWERED: 'answered',
    FILLED: 'filled',
    SPARSE: 'sparse'
};

export const GROOVE_OPTIONS = [
    {
        id: GROOVE_KIND.BARE,
        name: 'Yalın (Bare)',
        why: 'Usulün ana iskeleti: Yalnızca güçlü vuruşlar (Düm ve ana Tekler). Usulün bölünüşünü çıplak duyurur.'
    },
    {
        id: GROOVE_KIND.ANSWERED,
        name: 'Karşılıklı (Answered)',
        why: 'Güçlü konumlarda Düm, ara konumlarda Tek cevabı. Geleneksel icraya en yakın standart yürüyüş.'
    },
    {
        id: GROOVE_KIND.FILLED,
        name: 'Dolu / Çiftleme (Filled)',
        why: 'Ara 8\'lik bölüntülerin süslemeler ve zillerle doldurulduğu zengin ritim orkestrasyonu.'
    },
    {
        id: GROOVE_KIND.SPARSE,
        name: 'Seyrek (Sparse)',
        why: 'Sadece en ağırlıklı vuruşlar; melodi ve dem için geniş alan bırakır.'
    }
];

/**
 * Generates drum percussion events matching the chosen Usul cycle.
 *
 * @param {object} options
 * @param {object|string} options.usul
 * @param {string} [options.groove='answered']
 * @param {number} [options.startBeat=0]
 * @param {number} [options.cycles=4]
 * @param {number} [options.density=0.5]
 * @param {number} [options.seed=1]
 * @returns {Array<{ pitch: number, startBeat: number, lengthBeats: number, velocity: number, stroke: string }>}
 */
export function generateUsulDrums(options = {}) {
    const usul = typeof options.usul === 'string' ? findUsul(options.usul) : (options.usul || findUsul('sofyan'));
    const groove = options.groove || GROOVE_KIND.ANSWERED;
    const startBeat = options.startBeat ?? 0.0;
    const cycles = Math.max(1, options.cycles ?? 4);
    const density = options.density ?? 0.5;
    const seed = options.seed ?? 1;

    const rng = new XorShiftRng(seed);
    const out = [];

    const cycle16 = usul.cycleSixteenths || 16;
    const cycleBeats = cycle16 / 4.0;

    const isStrong = (pos) => (usul.strong && usul.strong.includes(pos));
    const share = (pos) => {
        if (usul.onsetShare && pos < usul.onsetShare.length) {
            return usul.onsetShare[pos] * cycle16;
        }
        return 1.0;
    };

    function hit(note, at, vel, strokeName) {
        out.push({
            pitch: note,
            detuneCents: 0,
            startBeat: at,
            lengthBeats: 0.125,
            velocity: vel,
            stroke: strokeName
        });
    }

    for (let c = 0; c < cycles; ++c) {
        const barStart = startBeat + (c * cycleBeats);

        for (let pos = 0; pos < cycle16; ++pos) {
            const at = barStart + (pos / 4.0);
            const strong = isStrong(pos);
            const w = share(pos);

            // Cycle downbeat (pos 0) is always sounded
            if (pos === 0) {
                hit(USUL_KIT.HEAVY, at, 1.0, 'Düm');
                continue;
            }

            switch (groove) {
                case GROOVE_KIND.SPARSE:
                    if (strong && w >= 2.0) {
                        hit(USUL_KIT.HEAVY, at, 0.85, 'Düm');
                    }
                    break;

                case GROOVE_KIND.BARE:
                    if (strong) {
                        hit(USUL_KIT.HEAVY, at, 0.85, 'Düm');
                    }
                    break;

                case GROOVE_KIND.ANSWERED:
                    if (strong) {
                        hit(USUL_KIT.HEAVY, at, 0.85, 'Düm');
                    } else if (w >= 1.0 && rng.unit() < density) {
                        hit(USUL_KIT.LIGHT, at, 0.70, 'Tek');
                    }
                    break;

                case GROOVE_KIND.FILLED:
                    if (strong) {
                        hit(USUL_KIT.HEAVY, at, 0.85, 'Düm');
                    } else if (w >= 1.0) {
                        hit(USUL_KIT.LIGHT, at, 0.70, 'Tek');
                    }

                    // Subdivisions on 8ths
                    if (pos % 2 === 0 && rng.unit() < density) {
                        hit(USUL_KIT.FILL, at, strong ? 0.50 : 0.38, 'Te-ke');
                    }
                    break;
            }
        }
    }

    return out;
}

