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
export function phrasePlan(makam, phraseCount = 4, formType = 'standard', contourType = 'auto', rng = null) {
    const out = [];
    const count = Math.max(1, phraseCount);
    const durak = 0;
    const guclu = makam.guclu || 22;
    const top = 53;
    const rawDegs = getMakamDegrees(makam);
    const step2 = rawDegs[1] || 5;
    const step3 = rawDegs[2] || 13;
    const stepUpper = rawDegs[rawDegs.length - 2] || 44;

    if (!rng) rng = new XorShiftRng(Math.floor(Math.random() * 1000000) + 1);

    let effectiveContour = contourType || 'auto';
    if (effectiveContour === 'auto') {
        if (formType === 'uzun_hava') {
            const uTypes = ['bozlak', 'barak', 'hoyrat', 'maya', 'gurbet', 'yol_havasi', 'mustezad'];
            if (makam.id === 'hicaz' || makam.id === 'kurdi') effectiveContour = (rng.unit() < 0.6) ? 'bozlak' : 'hoyrat';
            else if (makam.id === 'huseyni' || makam.id === 'ussak') effectiveContour = (rng.unit() < 0.4) ? 'bozlak' : ((rng.unit() < 0.5) ? 'maya' : 'barak');
            else if (makam.id === 'rast' || makam.id === 'segah') effectiveContour = (rng.unit() < 0.5) ? 'gurbet' : 'mustezad';
            else effectiveContour = uTypes[Math.floor(rng.unit() * uTypes.length)];
        } else {
            const roll = rng.unit();
            if (makam.seyir === SEYIR.ASCENDING) {
                if (roll < 0.35) effectiveContour = 'climb';
                else if (roll < 0.65) effectiveContour = 'call_response';
                else if (roll < 0.85) effectiveContour = 'wave';
                else effectiveContour = 'folk';
            } else if (makam.seyir === SEYIR.DESCENDING) {
                if (roll < 0.45) effectiveContour = 'cascade';
                else if (roll < 0.75) effectiveContour = 'wave';
                else effectiveContour = 'call_response';
            } else {
                if (roll < 0.30) effectiveContour = 'wave';
                else if (roll < 0.55) effectiveContour = 'call_response';
                else if (roll < 0.80) effectiveContour = 'climb';
                else effectiveContour = 'cascade';
            }
        }
    }

    let at = durak;
    if (effectiveContour === 'bozlak' || effectiveContour === 'hoyrat' || effectiveContour === 'gurbet' || effectiveContour === 'cascade' || makam.seyir === SEYIR.DESCENDING) {
        at = (rng.unit() < 0.65) ? top : stepUpper;
    } else if (effectiveContour === 'barak' || effectiveContour === 'wave' || makam.seyir === SEYIR.FROM_ABOVE) {
        at = (rng.unit() < 0.6) ? guclu : (rng.unit() < 0.5 ? stepUpper : durak);
    } else if (effectiveContour === 'maya' || effectiveContour === 'mustezad') {
        at = (rng.unit() < 0.7) ? durak : step2;
    } else {
        at = (rng.unit() < 0.7) ? durak : (rng.unit() < 0.5 ? step2 : -5);
    }

    for (let i = 0; i < count; ++i) {
        const isFinal = (i === count - 1);
        let target;
        let section = isFinal ? 'Karar' : 'Seyir';

        if (isFinal) {
            target = durak;
        } else if (formType === 'sarki') {
            if (i === 0) {
                target = (makam.seyir === SEYIR.DESCENDING) ? guclu : (rng.unit() < 0.5 ? guclu : step3);
                section = 'Zemin';
            } else if (i === Math.floor(count * 0.5) || i === Math.floor(count * 0.6)) {
                target = (rng.unit() < 0.7) ? top : stepUpper;
                section = 'Meyan';
            } else if (i === count - 2) {
                target = (rng.unit() < 0.6) ? guclu : step2;
                section = 'Teslim';
            } else {
                target = (rng.unit() < 0.5) ? guclu : step3;
                section = 'Zemin';
            }
        } else {
            switch (effectiveContour) {
                // --- UZUN HAVA TÜRLERİ ---
                case 'bozlak':
                    if (i === 0) { target = top; section = 'Nida (Açılış Feryadı)'; }
                    else if (i === 1) { target = (rng.unit() < 0.65) ? stepUpper : top; section = 'Meyan (Acemli Feryat)'; }
                    else if (i === count - 2) { target = (rng.unit() < 0.6) ? guclu : step2; section = 'Asma Karar (İnleme)'; }
                    else { target = (rng.unit() < 0.5) ? step3 : step2; section = 'Ağıt İnişi'; }
                    break;
                case 'barak':
                    if (i === 0) { target = guclu; section = 'Açış (Sekileme)'; }
                    else if (i === 1) { target = stepUpper; section = 'Barak Meyanı'; }
                    else if (i === count - 2) { target = step2; section = 'Ara İniş'; }
                    else { target = guclu; section = 'Gövde'; }
                    break;
                case 'hoyrat':
                    if (i === 0) { target = top; section = 'Mani Nidası'; }
                    else if (i === 1) { target = guclu; section = 'Zemin Hecelemesi'; }
                    else if (i === count - 2) { target = (rng.unit() < 0.6) ? stepUpper : step2; section = 'Meyan Haykırışı'; }
                    else { target = (rng.unit() < 0.5) ? top : guclu; section = 'Cinaslı Seyir'; }
                    break;
                case 'maya':
                    if (i === 0) { target = step2; section = 'Karanlık Zemin'; }
                    else if (i === 1) { target = guclu; section = 'Ağıt Düğümü'; }
                    else if (i === count - 2) { target = (rng.unit() < 0.6) ? stepUpper : guclu; section = 'Hüzünlü Meyan'; }
                    else { target = step2; section = 'İniltili İniş'; }
                    break;
                case 'gurbet':
                    if (i === 0) { target = stepUpper; section = 'Sipsi Nidası'; }
                    else if (i === 1) { target = guclu; section = 'Dalgalı Süzülüş'; }
                    else if (i === count - 2) { target = step2; section = 'Sıla Hasreti'; }
                    else { target = guclu; section = 'Gurbet Gövdesi'; }
                    break;
                case 'yol_havasi':
                    if (i === 0) { target = stepUpper; section = 'Yayla Çağrısı'; }
                    else if (i === 1) { target = guclu; section = 'Yol Gövdesi'; }
                    else if (i === count - 2) { target = top; section = 'Dağ Meyanı'; }
                    else { target = step3; section = 'Gezinti'; }
                    break;
                case 'mustezad':
                    if (i === 0) { target = guclu; section = 'Divan Açılışı'; }
                    else if (i === 1) { target = stepUpper; section = 'Aruz Meyanı'; }
                    else if (i === count - 2) { target = guclu; section = 'Asma Karar'; }
                    else { target = step3; section = 'Zemin'; }
                    break;

                // --- KLASİK SEYİR EĞRİLERİ ---
                case 'wave':
                    if (i % 2 === 0) target = guclu;
                    else target = (rng.unit() < 0.5) ? Math.min(top, guclu + 9) : Math.max(0, guclu - 9);
                    break;
                case 'climb':
                    if (i === 0) target = step3;
                    else if (i === count - 2) target = top;
                    else target = guclu;
                    break;
                case 'cascade':
                    if (i === 0) target = stepUpper;
                    else if (i === 1) target = guclu;
                    else if (i === count - 2) target = step2;
                    else target = durak;
                    break;
                case 'call_response':
                    if (i === 0) target = guclu;
                    else if (i === 1) target = (rng.unit() < 0.5) ? durak : step3;
                    else if (i === count - 2) target = top;
                    else target = guclu;
                    break;
                case 'folk':
                    if (i === count - 2) target = guclu;
                    else target = (rng.unit() < 0.6) ? step2 : durak;
                    break;
                default:
                    target = (i === count - 2) ? guclu : (rng.unit() < 0.5 ? guclu : step3);
                    break;
            }
        }
        out.push({ fromComma: at, toComma: target, isFinal, section, contour: effectiveContour });
        at = target;
    }
    return out;
}

export function generateMakamMelody(options = {}) {
    const makam = typeof options.makam === 'string' ? findMakam(options.makam) : (options.makam || findMakam('hicaz'));
    const usul = typeof options.usul === 'string' ? findUsul(options.usul) : (options.usul || findUsul('sofyan'));
    const durakMidi = options.durakMidiNote ?? 62;
    const startBeat = options.startBeat ?? 0.0;
    const cycles = Math.max(1, options.cycles ?? 4);
    const density = Math.max(0.1, Math.min(0.9, options.density ?? 0.34));
    const freedom = Math.max(0.0, Math.min(1.0, options.freedom ?? 0.35));
    const contourType = options.contourType || 'auto';
    const seed = options.seed ?? (Math.floor(Math.random() * 1000000) + 1);
    const formType = options.formType || 'standard';
    const range = options.range ?? { lowestComma: -9, highestComma: 62 };

    const rungs = buildLadder(makam, range);
    const cycle16 = usul.cycleSixteenths || 16;
    const cycleBeats = cycle16 / 4.0;
    const rng = new XorShiftRng(seed);
    const plan = phrasePlan(makam, cycles, formType, contourType, rng);
    const out = [];
    const isUzunHava = (formType === 'uzun_hava') || ['bozlak', 'barak', 'hoyrat', 'maya', 'gurbet', 'yol_havasi', 'mustezad'].includes(contourType);

    let here = nearestRung(rungs, plan[0].fromComma);
    let previousMotifSteps = null;

    for (let p = 0; p < plan.length; ++p) {
        const phrase = plan[p];
        const barStart = startBeat + (p * cycleBeats);
        const target = nearestRung(rungs, phrase.toComma);

        const slots = [];
        if (isUzunHava) {
            const rubatoPatterns = [
                [0, 8, 11, 13],
                [0, 9, 12],
                [0, 6, 10, 13],
                [0, 8, 12],
                [0, 7, 11, 14]
            ];
            const pattern = rubatoPatterns[Math.floor(rng.unit() * rubatoPatterns.length)];
            for (const pt of pattern) {
                slots.push(pt);
            }
            slots.sort((a, b) => a - b);
        } else {
            for (let i = 0; i < cycle16; ++i) {
                let share = (usul.onsetShare && i < usul.onsetShare.length) ? usul.onsetShare[i] : (i % 4 === 0 ? 0.22 : 0.05);
                if (freedom > 0.40 && (i % 2 !== 0)) {
                    share += (freedom * 0.05);
                }
                if (i % 4 === 2 && rng.unit() < 0.35) {
                    share += 0.08;
                }
                if (share * cycle16 * density > rng.unit()) {
                    slots.push(i);
                }
            }
        }

        if (slots.length === 0) {
            slots.push(usul.startsOn || 0);
        }

        const dist = Math.abs(target - here);
        const needed = Math.min(cycle16, dist + (phrase.isFinal ? 2 : 1));

        if (slots.length < needed) {
            const byWeight = [];
            for (let i = 0; i < cycle16; ++i) {
                if (!slots.includes(i)) byWeight.push(i);
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

        const approachRung = phrase.isFinal ? nearestRung(rungs, phrase.toComma + (makam.approachFrom || 0)) : -1;
        const n = slots.length;
        const currentMotifSteps = [];

        const doMotifSequence = (p === 1 && previousMotifSteps && previousMotifSteps.length > 2 && rng.unit() < 0.60 && !isUzunHava);

        for (let s = 0; s < n; ++s) {
            if (s === n - 1) {
                if (phrase.isFinal || freedom < 0.70 || rng.unit() > (freedom * 0.30)) {
                    here = target;
                }
            } else if (phrase.isFinal && s === n - 2 && approachRung >= 0 && Math.abs(approachRung - here) <= 3) {
                here = approachRung;
            } else if (doMotifSequence && s < previousMotifSteps.length) {
                const relativeStep = previousMotifSteps[s];
                here = Math.max(0, Math.min(rungs.length - 1, here + relativeStep));
            } else if (s > 0) {
                const toward = target > here ? 1 : (target < here ? -1 : 0);
                const stepsLeft = (n - 1 - s) - (phrase.isFinal ? 1 : 0);
                const remaining = Math.abs(target - here);
                const mustMarch = (toward !== 0) && (remaining >= stepsLeft) && (freedom < 0.55 || phrase.isFinal);

                let step = 0;
                if (mustMarch) {
                    step = toward;
                } else {
                    const roll = rng.unit();
                    if (isUzunHava && phrase.contour === 'barak' && roll < 0.35) {
                        step = 0;
                    } else if (roll < 0.22 && !phrase.isFinal) {
                        step = 0;
                    } else if (roll < 0.40 && !phrase.isFinal) {
                        step = (toward !== 0) ? -toward : (rng.unit() < 0.5 ? 1 : -1);
                    } else {
                        const lean = phrase.isFinal ? 0.95 : Math.max(0.40, 0.88 - (freedom * 0.45));
                        step = (rng.unit() < lean && toward !== 0) ? toward : (rng.unit() < 0.5 ? 1 : -1);

                        const leapChance = (isUzunHava ? 0.15 : 0.08) + (freedom * 0.30);
                        if (rng.unit() < leapChance) {
                            step *= (rng.unit() < (freedom * 0.40) ? 3 : 2);
                        }
                    }
                }
                currentMotifSteps.push(step);
                here = Math.max(0, Math.min(rungs.length - 1, here + step));
            } else {
                currentMotifSteps.push(0);
            }

            const pos = slots[s];
            const atBeat = barStart + (pos / 4.0);
            const until = (s + 1 < n) ? (slots[s + 1] / 4.0) : cycleBeats;
            let lengthBeats = until - (pos / 4.0);
            if (lengthBeats <= 0.0) continue;

            if (!phrase.isFinal && s === n - 1 && lengthBeats > 0.75 && rng.unit() < 0.50) {
                lengthBeats = Math.max(0.5, lengthBeats - 0.25);
            } else if (isUzunHava && lengthBeats > 1.0 && rng.unit() < 0.30) {
                lengthBeats = Math.max(0.75, lengthBeats - 0.25);
            }

            const restsHere = usul.strong && usul.strong.includes(pos);
            let noteCommas = rungs[here];

            if (freedom > 0.65 && !phrase.isFinal && rng.unit() < (freedom * 0.12)) {
                noteCommas += (rng.unit() < 0.5 ? 1 : -1);
            }

            const sounding = place(durakMidi, noteCommas);

            let ornament = null;
            if (!phrase.isFinal && lengthBeats >= 0.35) {
                const ornRoll = rng.unit();
                const ornThreshold = (isUzunHava ? 0.48 : 0.08) + (freedom * 0.38);
                if (ornRoll < ornThreshold) {
                    let types = ['grace', 'mordent', 'slide', 'turn'];
                    if (isUzunHava) {
                        if (phrase.contour === 'bozlak' || phrase.contour === 'gurbet' || phrase.contour === 'maya') {
                            types = ['slide', 'slide', 'slide', 'mordent', 'turn'];
                        } else if (phrase.contour === 'barak') {
                            types = ['mordent', 'mordent', 'slide', 'turn'];
                        }
                    }
                    ornament = types[Math.floor(rng.unit() * types.length)];
                }
            }

            out.push({
                pitch: sounding.note,
                detuneCents: sounding.detuneCents,
                commas: noteCommas,
                startBeat: atBeat,
                lengthBeats: lengthBeats,
                velocity: restsHere ? 0.90 : (isUzunHava ? (0.72 + (rng.unit() * 0.18)) : (0.64 + (rng.unit() * 0.08))),
                locked: false,
                ornament: ornament,
                section: phrase.section
            });
        }

        if (p === 0) previousMotifSteps = currentMotifSteps;
    }

    out.sort((a, b) => a.startBeat - b.startBeat);
    for (let i = 0; i < out.length; ++i) {
        if (i < out.length - 1) {
            const nextStart = out[i + 1].startBeat;
            const maxAllowed = nextStart - out[i].startBeat;
            if (out[i].lengthBeats > maxAllowed) {
                out[i].lengthBeats = Math.max(0.25, maxAllowed);
            }
        }
    }

    return out;
}
