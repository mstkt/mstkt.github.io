/**
 * 53-EDO Holderian Comma Tuning System (Arel-Ezgi-Uzdilek Model)
 *
 * Turkish art and folk music theory divides the octave into 53 Holdrian commas.
 * 1 comma = 1200 / 53 = 22.641509... cents.
 *
 * Intervals:
 *  - Tanini (Whole tone): 9 commas (203.8 cents)
 *  - Bakiye (Limma / Small Semitone): 4 commas (90.6 cents)
 *  - Kucuk Mucennep (Apotome / Large Semitone): 5 commas (113.2 cents)
 *  - Buyuk Mucennep: 8 commas (181.1 cents)
 *  - Artik Ikili (Augmented Second): 12 commas (271.7 cents)
 *  - Tam Dortlu (Fourth): 22 commas (498.1 cents)
 *  - Tam Besli (Fifth): 31 commas (701.9 cents)
 */

export const KOMMA = {
    PER_OCTAVE: 53,
    CENTS_PER_COMMA: 1200.0 / 53.0,

    // Accidentals in commas
    KOMA: 1,
    BAKIYE: 4,
    KUCUK_MUCENNEP: 5,
    BUYUK_MUCENNEP: 8,
    ARTIK_IKILI: 12,

    // Intervals
    WHOLE_TONE: 9,
    FOURTH: 22,
    FIFTH: 31
};

/** Convert commas to cents */
export function toCents(commas) {
    return commas * KOMMA.CENTS_PER_COMMA;
}

/** Convert cents to commas (rounded) */
export function fromCents(cents) {
    return Math.round(cents / KOMMA.CENTS_PER_COMMA);
}

/**
 * Places a pitch given in commas above a reference MIDI note.
 * Returns the nearest 12-TET MIDI note number and the leftover detune in cents.
 *
 * @param {number} referenceMidiNote - e.g. 62 for D4 (Dugah) or 55 for G3 (Rast)
 * @param {number} commasAbove - commas above the reference
 * @returns {{ note: number, detuneCents: number, commas: number }}
 */
export function place(referenceMidiNote, commasAbove) {
    const totalCents = toCents(commasAbove);
    const semitones = totalCents / 100.0;
    const nearest = Math.round(semitones);
    const detuneCents = totalCents - (nearest * 100.0);

    return {
        note: referenceMidiNote + nearest,
        detuneCents: Math.round(detuneCents * 100) / 100, // round to 2 decimal places
        commas: commasAbove
    };
}

/**
 * Returns the traditional Turkish accidental name for a comma alteration.
 * @param {number} commas - signed commas relative to natural note
 */
export function accidentalName(commas) {
    const n = Math.abs(commas);
    const dir = commas < 0 ? ' bemol (flat)' : ' diyez (sharp)';

    switch (n) {
        case 0: return 'Naturel';
        case KOMMA.KOMA: return 'Koma' + dir;
        case KOMMA.BAKIYE: return 'Bakiye' + dir;
        case KOMMA.KUCUK_MUCENNEP: return 'Küçük Mücenneb' + dir;
        case KOMMA.BUYUK_MUCENNEP: return 'Büyük Mücenneb' + dir;
        case KOMMA.ARTIK_IKILI: return 'Artık İkili' + dir;
        default: return `${commas} koma`;
    }
}

/**
 * Standard Ahenk Transpositions (Reference Durak Pitch in Turkish Music)
 * In Turkish music notation, pieces are commonly written with Dügah on D4 (MIDI 62)
 * or Rast on G3 (MIDI 55), but performed at various Ahenk pitch standards.
 */
export const AHENK_LIST = [
    { name: 'Bolahenk (Nısfıye)', durakNote: 62, durakName: 'D4 (Re)', offsetSemis: 0, description: 'Yazıldığı gibi (Ney / Standart Yazım)' },
    { name: 'Süpürde', durakNote: 60, durakName: 'C4 (Do)', offsetSemis: -2, description: '1 ses (2 yarım ton) pes' },
    { name: 'Müstahsen', durakNote: 59, durakName: 'B3 (Si)', offsetSemis: -3, description: '1.5 ses pes' },
    { name: 'Kız Ney (Şah)', durakNote: 57, durakName: 'A3 (La)', offsetSemis: -5, description: '4 ses (5 yarım ton) pes' },
    { name: 'Mansur', durakNote: 55, durakName: 'G3 (Sol)', offsetSemis: -7, description: 'Rast ahengi - 5 ses pes' },
    { name: 'Davut', durakNote: 53, durakName: 'F3 (Fa)', offsetSemis: -9, description: '6 ses pes' }
];

/**
 * Traditional pitch names according to the Arel-Ezgi-Uzdilek system
 * mapped relative to Dugah (D4 = 62, commas = 0).
 */
export const PERDE_NAMES = [
    { comma: -31, name: 'Yegâh', western: 'D3' },
    { comma: -27, name: 'Hüseyni Aşiran', western: 'E3' },
    { comma: -23, name: 'Acem Aşiran', western: 'F3' },
    { comma: -14, name: 'Geveşt', western: 'F#3 (koma)' },
    { comma: -9,  name: 'Rast', western: 'G3' },
    { comma: -5,  name: 'Zengüle', western: 'G#3' },
    { comma: -4,  name: 'Nihavend', western: 'Ab3' },
    { comma: 0,   name: 'Dügâh', western: 'A3 / D4' },
    { comma: 4,   name: 'Kürdi', western: 'Bb4 (bakiye)' },
    { comma: 5,   name: 'Uşşak (Koma Si)', western: 'B4 (1 koma flat)' },
    { comma: 8,   name: 'Segâh', western: 'B4 (Segah perdesi)' },
    { comma: 9,   name: 'Buselik', western: 'B4 (naturel)' },
    { comma: 13,  name: 'Çârgâh', western: 'C4 (Do)' },
    { comma: 17,  name: 'Nim Hicaz', western: 'C#4 (bakiye)' },
    { comma: 18,  name: 'Hicaz', western: 'C#4 (küçük mücenneb)' },
    { comma: 22,  name: 'Nevâ', western: 'D4 (Re - Güçlü)' },
    { comma: 26,  name: 'Nim Bayati', western: 'Eb4' },
    { comma: 30,  name: 'Hüseyni (Segah tiz)', western: 'E4 (1 koma flat)' },
    { comma: 31,  name: 'Hüseyni', western: 'E4 (Mi)' },
    { comma: 35,  name: 'Acem', western: 'F4 (Fa)' },
    { comma: 40,  name: 'Eviç', western: 'F#4 (1 koma flat)' },
    { comma: 44,  name: 'Mahur', western: 'F#4 (naturel)' },
    { comma: 49,  name: 'Gerdâniye', western: 'G4 (Sol)' },
    { comma: 53,  name: 'Muhayyer', western: 'A4 (Tiz Dügah)' },
    { comma: 57,  name: 'Sünbüle', western: 'Bb5' },
    { comma: 61,  name: 'Tiz Segâh', western: 'B5' },
    { comma: 62,  name: 'Tiz Buselik', western: 'B5' },
    { comma: 66,  name: 'Tiz Çârgâh', western: 'C5' },
    { comma: 75,  name: 'Tiz Nevâ', western: 'D5' },
    { comma: 84,  name: 'Tiz Hüseyni', western: 'E5' }
];

/**
 * Finds the closest traditional Perde name for a comma position.
 */
export function getPerdeName(commas) {
    let best = PERDE_NAMES[0];
    let minDiff = 999;
    for (const p of PERDE_NAMES) {
        const diff = Math.abs(p.comma - commas);
        if (diff < minDiff) {
            minDiff = diff;
            best = p;
        }
    }
    if (minDiff <= 1) {
        return best.name;
    }
    return `${commas > 0 ? '+' : ''}${commas} koma`;
}

