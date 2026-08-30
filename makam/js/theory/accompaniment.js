/**
 * Makam Accompaniment & Dem Engine
 *
 * In Turkish art and folk music, accompaniment is built from:
 * 1. DEM (Drone): The durak (tonic) or durak + güçlü held continuously beneath the melody.
 * 2. LADDER STACKS: Triads built by skipping degrees of the makam ladder (preserving microtonal intervals).
 * 3. QUARTAL CHORDS: Chords built on fourths (the fundamental unit of the çeşni system).
 *
 * Microtonal check: Marks chords that cannot be played on standard 12-TET pianos.
 */

import { KOMMA, place } from './tuning.js';
import { findMakam, getMakamDegrees } from './makam.js';

export function needsMicrotones(commas, durakMidiNote = 62) {
    const halfComma = KOMMA.CENTS_PER_COMMA / 2.0; // ~11.32 cents
    for (const c of commas) {
        const p = place(durakMidiNote, c);
        if (Math.abs(p.detuneCents) > halfComma) {
            return true;
        }
    }
    return false;
}

/**
 * Generates ranked Makam accompaniment options for a given makam and melody position.
 *
 * @param {object|string} makam - Makam object or ID
 * @param {number} [durakMidiNote=62]
 * @param {number} [overDegree=-1] - comma height of current melody note, or -1 for general
 * @returns {Array<{ name: string, commas: number[], why: string, fit: number, microtonal: boolean }>}
 */
export function getMakamChords(makamInput, durakMidiNote = 62, overDegree = -1) {
    const makam = typeof makamInput === 'string' ? findMakam(makamInput) : (makamInput || findMakam('hicaz'));
    const ladder = getMakamDegrees(makam);
    const out = [];

    const guclu = makam.guclu || KOMMA.FIFTH;

    // 1. DEM (Drones) - The heart of modal accompaniment
    out.push({
        name: 'DEM - Durak (Karar)',
        commas: [0],
        why: 'Durağın sabit olarak tutulması. Tanbur, bağlama veya ney ile melodi altında yatan en doğal ve kadim eşlik.',
        fit: 100,
        microtonal: needsMicrotones([0], durakMidiNote)
    });

    out.push({
        name: 'DEM - Durak ve Güçlü',
        commas: [0, guclu],
        why: 'Makamın iki ana direği: İki çeşninin birleşim noktası ve makamın iskeletini duyurur.',
        fit: 94,
        microtonal: needsMicrotones([0, guclu], durakMidiNote)
    });

    out.push({
        name: 'DEM - Durak ve Oktav',
        commas: [0, KOMMA.PER_OCTAVE],
        why: 'Açık oktav dem tınısı: Hiçbir ara dereceyi dayatmadan tabanı kurar.',
        fit: 88,
        microtonal: needsMicrotones([0, KOMMA.PER_OCTAVE], durakMidiNote)
    });

    // 2. Makam Merdiven Yığınları (Ladder Stacks - 3'lü atlamalı akorlar)
    if (ladder.length >= 5) {
        for (let i = 0; i + 4 < ladder.length; ++i) {
            const a = ladder[i];
            const b = ladder[i + 2];
            const c = ladder[i + 4];
            const commas = [a, b, c];

            const lower = b - a;
            const upper = c - b;

            let desc = '';
            if (lower === KOMMA.ARTIK_IKILI || upper === KOMMA.ARTIK_IKILI) {
                desc = 'Hicaz artık ikilisi içerir - makamın en karakteristik ve yakıcı akor rengi.';
            } else if (lower > upper) {
                desc = 'Altta geniş aralık - geleneksel majör duyumuna yakın.';
            } else if (lower < upper) {
                desc = 'Altta dar aralık - hüzünlü ve minör duyumuna yakın.';
            } else {
                desc = 'Aralıklar eşit - askıda, mistik bir etki.';
            }

            const holdsDurak = (a === 0 || b === 0 || c === 0 || a === KOMMA.PER_OCTAVE || b === KOMMA.PER_OCTAVE || c === KOMMA.PER_OCTAVE);
            const holdsGuclu = (a === guclu || b === guclu || c === guclu);

            let fit = holdsDurak ? 78 : (holdsGuclu ? 70 : 52);
            if (!holdsDurak && !holdsGuclu) {
                desc += ' Ne durak ne güçlü içerir: geçici renk akoru.';
            }

            if (overDegree >= 0) {
                fit += Math.max(0, 14 - Math.floor(Math.abs(a - overDegree) / 2));
            }

            out.push({
                name: `${i + 1}. Derece Yığını`,
                commas: commas,
                why: desc,
                fit: fit,
                microtonal: needsMicrotones(commas, durakMidiNote)
            });
        }
    }

    // 3. Kuartal Eşlik (Dörtlü Yığınları)
    out.push({
        name: 'KUARTAL - 4\'lüler Yığını',
        commas: [0, KOMMA.FOURTH, KOMMA.FOURTH * 2],
        why: 'Çeşnilerin temel ölçü birimi olan 4\'lülerin yığılması; makam doğasına 3\'lülerden daha yakındır.',
        fit: 66,
        microtonal: needsMicrotones([0, KOMMA.FOURTH, KOMMA.FOURTH * 2], durakMidiNote)
    });

    out.sort((a, b) => b.fit - a.fit);
    return out;
}

