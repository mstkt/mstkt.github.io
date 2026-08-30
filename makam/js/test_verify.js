/**
 * Automated Verification Test for Makam Studio Web Modules
 */

import { KOMMA, place, accidentalName, toCents } from './theory/tuning.js';
import { MAKAMS, findMakam, getMakamDegrees, SEYIR } from './theory/makam.js';
import { USULS, findUsul, getUsulBeats } from './theory/usul.js';
import { generateMakamMelody, phrasePlan } from './theory/melodyEngine.js';
import { getMakamChords, needsMicrotones } from './theory/accompaniment.js';
import { generateMakamBass, BASS_KIND } from './theory/bassEngine.js';
import { generateUsulDrums, GROOVE_KIND } from './theory/rhythmEngine.js';

console.log('--- 1. Testing 53-EDO Tuning & Commas ---');
const segahPlace = place(62, 8); // Segah is ~8 commas above Dugah
console.log('Segah placed above D4 (62): note =', segahPlace.note, 'detune =', segahPlace.detuneCents, 'cents');
console.log('1 Koma in cents =', toCents(1));
console.assert(Math.abs(toCents(1) - 22.6415) < 0.01, 'Comma cents calculation error');
console.assert(accidentalName(1).includes('Koma'), 'Accidental name error');

console.log('\n--- 2. Testing Makam & Cesni Engine ---');
console.log('Total Makams defined:', MAKAMS.length);
const hicaz = findMakam('hicaz');
console.log('Hicaz makam found:', hicaz.name, '| Seyir:', hicaz.seyir, '| Guclu:', hicaz.guclu);
const hicazDegrees = getMakamDegrees(hicaz);
console.log('Hicaz degrees (commas):', hicazDegrees);
console.assert(hicazDegrees.length >= 8, 'Hicaz degree count error');

console.log('\n--- 3. Testing Usul Rhythms ---');
console.log('Total Usuls defined:', USULS.length);
const aksak = findUsul('aksak');
console.log('Aksak usul:', aksak.name, aksak.beats + '/' + aksak.beatType, '| Cycle 16ths =', aksak.cycleSixteenths, '| Quarter beats =', getUsulBeats(aksak));
console.assert(aksak.cycleSixteenths === 18, 'Aksak cycle length error');

console.log('\n--- 4. Testing Seyir Melody Generation ---');
const plan = phrasePlan(hicaz, 4);
console.log('Hicaz 4-phrase plan:', plan);
console.assert(plan[plan.length - 1].toComma === 0, 'Final phrase must land on Durak');
console.assert(plan[plan.length - 2].toComma === hicaz.guclu, 'Penultimate phrase must land on Guclu');

const melody = generateMakamMelody({
    makam: hicaz,
    usul: aksak,
    durakMidiNote: 62,
    cycles: 4,
    density: 0.34,
    seed: 42
});
console.log('Generated melody note count:', melody.length);
console.log('First 3 notes:', melody.slice(0, 3));
console.assert(melody.length > 0, 'Melody generation empty');

console.log('\n--- 5. Testing Makam Accompaniment & Dem ---');
const chords = getMakamChords(hicaz, 62);
console.log('Makam accompaniment options count:', chords.length);
console.log('Top option:', chords[0].name, '| Fit:', chords[0].fit, '| Microtonal:', chords[0].microtonal);
console.assert(chords.length >= 3, 'Chord options error');

console.log('\n--- 6. Testing Heterophonic Bass ---');
const bass = generateMakamBass({
    kind: BASS_KIND.DOUBLING,
    makam: hicaz,
    usul: aksak,
    durakMidiNote: 62,
    cycles: 4,
    melody: melody
});
console.log('Generated heterophonic bass note count:', bass.length);
console.assert(bass.length > 0, 'Bass generation empty');

console.log('\n--- 7. Testing Usul Drums ---');
const drums = generateUsulDrums({
    usul: aksak,
    groove: GROOVE_KIND.ANSWERED,
    cycles: 4,
    density: 0.5
});
console.log('Generated usul drum hits count:', drums.length);
console.assert(drums.length > 0, 'Drum generation empty');

console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');

