/**
 * Makam Theory Engine (Arel-Ezgi-Uzdilek System)
 *
 * A makam is NOT just a scale. It is composed of:
 * 1. CESNI: Tetrachords (Dörtlü) & Pentachords (Beşli) joined at a shared degree (Durak / Güçlü).
 * 2. DURAK (Tonic/Karar) and GUCLU (Dominant): resting/punctuation degrees.
 * 3. SEYIR (The Path): The melodic progression pattern (Çıkıcı, İnici, İnici-Çıkıcı, Çıkıcı-İnici).
 * 4. APPROACH (Karar Yaklaşımı): How the final cadence is reached (from above or below).
 */

import { KOMMA, place } from './tuning.js';

export const SEYIR = {
    ASCENDING: 'Ascending',       // Çıkıcı - duraktan başlar, tizlere doğru genişler
    DESCENDING: 'Descending',     // İnici - tiz duraktan/oktavdan girer, durağa iner
    FROM_ABOVE: 'FromAbove',      // İnici-Çıkıcı - güçlü perdesinden girer, her iki yöne açılır
    FROM_BELOW: 'FromBelow'       // Çıkıcı-İnici - önce tırmanır, sonra süzülerek karar verir
};

export const SEYIR_INFO = {
    [SEYIR.ASCENDING]: {
        trName: 'Çıkıcı',
        description: 'Durak perdesi civarından başlar, güçlüye ve tizlere doğru yükselir.'
    },
    [SEYIR.DESCENDING]: {
        trName: 'İnici',
        description: 'Tiz durak veya oktav civarından başlar, güçlüye uğrayıp durağa iner.'
    },
    [SEYIR.FROM_ABOVE]: {
        trName: 'İnici-Çıkıcı',
        description: 'Güçlü perdesi civarından başlar; hem tizlere hem pestlere genişler, güçlüde yarım karar, durakta tam karar yapar.'
    },
    [SEYIR.FROM_BELOW]: {
        trName: 'Çıkıcı-İnici',
        description: 'Duraktan tırmanışla başlar, tizlerde dolaştıktan sonra süzülerek durağa iner.'
    }
};

/** Standard Tetrachords (Dörtlüler) */
export const TETRACHORDS = [
    { name: 'Çargâh', steps: [9, 9, 4], character: 'Parlak ve açık - Batı majör dörtlüsü' },
    { name: 'Bûselik', steps: [9, 4, 9], character: 'Doğal minör dörtlüsü - koma sapmasız' },
    { name: 'Kürdî', steps: [4, 9, 9], character: 'Peslerde bakiye bemollü, koyu ve dramatik' },
    { name: 'Rast', steps: [9, 8, 5], character: 'Segahlı 8 komalık 3. derece - Doğu renginin kalbi' },
    { name: 'Uşşak', steps: [8, 5, 9], character: '1 koma pes ikinci derece - hüzünlü ve çok yaygın' },
    { name: 'Hicaz', steps: [5, 12, 5], character: '12 komalık artık ikili - derin hasret ve mistik etki' },
    { name: 'Sabâ', steps: [8, 5, 5], character: 'Eksik dörtlü (18 koma) - kendine has içe dokunan tavır' }
];

/** Standard Pentachords (Beşliler) */
export const PENTACHORDS = [
    { name: 'Çargâh', steps: [9, 9, 4, 9], character: 'Majör beşli - tam tona kadar' },
    { name: 'Bûselik', steps: [9, 4, 9, 9], character: 'Minör beşli - tam tona kadar' },
    { name: 'Kürdî', steps: [4, 9, 9, 9], character: 'Pes bakiye ikinci derece ve düzenli adımlar' },
    { name: 'Rast', steps: [9, 8, 5, 9], character: 'Rast renginin 5. dereceye (Neva) kadar taşınışı' },
    { name: 'Hüseynî', steps: [8, 9, 5, 9], character: 'Uşşak gibi başlar, 3. derecesi açık ve tiz' },
    { name: 'Hicaz', steps: [5, 12, 5, 9], character: 'Hicaz artık ikilisi ile 5. dereceye uzanan yapı' },
    { name: 'Nikriz', steps: [9, 5, 12, 5], character: 'Tam ton ardından gelen Hicaz artık ikilisi' }
];

export function findCesni(name, isPentachord = false) {
    const list = isPentachord ? PENTACHORDS : TETRACHORDS;
    return list.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Makam Definitions
 */
export const MAKAMS = [
    {
        id: 'rast',
        name: 'Rast',
        lower: 'Rast',
        lowerIsPentachord: true,
        upper: 'Rast',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH, // 31 commas (Nevâ)
        seyir: SEYIR.ASCENDING,
        approachFrom: 9, // Rast karar inişi (+9 koma üstten)
        character: 'Türk musikisinin temel makamı - ne majör ne minör, asil ve kararlı.',
        history: 'Geleneksel olarak gün doğumu vakti ve neşe duygusuyla özdeşleştirilir.'
    },
    {
        id: 'ussak',
        name: 'Uşşak',
        lower: 'Uşşak',
        lowerIsPentachord: false,
        upper: 'Bûselik',
        upperIsPentachord: true,
        guclu: KOMMA.FOURTH, // 22 commas (Nevâ)
        seyir: SEYIR.ASCENDING,
        approachFrom: 7, // 1 koma bemollü Segah perdesinden iniş
        character: 'En yaygın halk ve klasik makamlardan biri; hüzünlü ve içten.',
        history: 'Aşk ve samimiyet duygusunu yansıtır; ikindi vaktine atfedilir.'
    },
    {
        id: 'hicaz',
        name: 'Hicaz',
        lower: 'Hicaz',
        lowerIsPentachord: false,
        upper: 'Rast',
        upperIsPentachord: true,
        guclu: KOMMA.FOURTH, // 22 commas (Nevâ)
        seyir: SEYIR.FROM_ABOVE, // Neva güçlüsünden başlar
        approachFrom: 5, // Nim Hicaz'dan veya Neva'dan iniş
        character: 'Geniş artık ikili adımı - yakıcı, hasret dolu ve mistik.',
        history: 'Çölün enginliğini, özlemi ve tevazuyu simgeler.'
    },
    {
        id: 'kurdi',
        name: 'Kürdî',
        lower: 'Kürdî',
        lowerIsPentachord: false,
        upper: 'Bûselik',
        upperIsPentachord: true,
        guclu: KOMMA.FOURTH, // 22 commas (Nevâ)
        seyir: SEYIR.FROM_BELOW,
        approachFrom: 4,
        character: 'Karanlık, derin ve Batı Frigyen dizisine en yakın duyum.',
        history: 'Gece vakti ve derin düşüncelerle bağdaştırılır.'
    },
    {
        id: 'buselik',
        name: 'Bûselik',
        lower: 'Bûselik',
        lowerIsPentachord: true,
        upper: 'Kürdî',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH, // 31 commas (Hüseyni)
        seyir: SEYIR.ASCENDING,
        approachFrom: -5, // Yeden alttan (Aşağıdan gelen lider nota)
        character: 'Koma sapması olmayan duru minör tını - güçlü ve kararlı.',
        history: 'Kuvvet ve cesaret hissi uyandırır.'
    },
    {
        id: 'nihavend',
        name: 'Nihavend',
        lower: 'Bûselik',
        lowerIsPentachord: true,
        upper: 'Kürdî',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH, // 31 commas (Hüseyni)
        seyir: SEYIR.DESCENDING, // Tizden girer!
        approachFrom: -5,
        character: 'Bûselik ile aynı sesleri içerir ancak İNİCİ seyriyle tamamen farklı bir his verir.',
        history: 'Romantizm, dinginlik ve zarafet makamı.'
    },
    {
        id: 'huseyni',
        name: 'Hüseynî',
        lower: 'Hüseynî',
        lowerIsPentachord: true,
        upper: 'Uşşak',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH, // 31 commas (Hüseyni)
        seyir: SEYIR.FROM_ABOVE,
        approachFrom: 7,
        character: 'Yükseklerde yaşayan, parlak ve yiğit halk türküsü tınısı.',
        history: 'Geniş Anadolu ezgilerinin ve kahramanlık türkülerinin vazgeçilmez makamı.'
    },
    {
        id: 'karcigar',
        name: 'Karcığar',
        lower: 'Uşşak',
        lowerIsPentachord: false,
        upper: 'Hicaz',
        upperIsPentachord: true,
        guclu: KOMMA.FOURTH, // 22 commas (Nevâ)
        seyir: SEYIR.FROM_ABOVE,
        approachFrom: 7,
        character: 'Pestte Uşşak hüznü, tizlerde Hicaz ateşi - büyüleyici kontrast.',
        history: 'Duygu zenginliği ve dramatik geçişler barındırır.'
    },
    {
        id: 'nikriz',
        name: 'Nikriz',
        lower: 'Nikriz',
        lowerIsPentachord: true,
        upper: 'Rast',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH, // 31 commas
        seyir: SEYIR.FROM_ABOVE,
        approachFrom: 9,
        character: 'Önce tam ton, sonra Hicaz adımı - canlı, kıvrak ve hareketli.',
        history: 'Oyun havaları ve hareketli saz eserlerinde sıkça kullanılır.'
    },
    {
        id: 'suzinak',
        name: 'Sûzinâk',
        lower: 'Rast',
        lowerIsPentachord: true,
        upper: 'Hicaz',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH, // 31 commas (Nevâ üzerinde Hicaz)
        seyir: SEYIR.FROM_ABOVE,
        approachFrom: 9,
        character: 'Pestte Rast zarafeti, tizlerde Hicaz sıcaklığı.',
        history: 'Yakıcı güzellik ve zengin süslemeler içerir.'
    },
    {
        id: 'cargah',
        name: 'Çargâh',
        lower: 'Çargâh',
        lowerIsPentachord: true,
        upper: 'Çargâh',
        upperIsPentachord: false,
        guclu: KOMMA.FIFTH,
        seyir: SEYIR.ASCENDING,
        approachFrom: -4,
        character: 'Teorik ana makam (Do Majör dizisi) - aydınlık ve sert.',
        history: 'Kahramanlık ve uyanış temalarını taşır.'
    },
    {
        id: 'saba',
        name: 'Sabâ',
        lower: 'Sabâ',
        lowerIsPentachord: false,
        upper: 'Hicaz',
        upperIsPentachord: true,
        guclu: 18, // Çârgâh perdesi (18 koma)
        seyir: SEYIR.ASCENDING,
        approachFrom: 8,
        character: 'Eksik dörtlüsüyle tanımsız bir derinlik; içe işleyen eşsiz tasavvufi lezzet.',
        history: 'Sabah ezanı ve mistik derinlikle özdeşleşmiştir.'
    }
];

export function findMakam(idOrName) {
    if (!idOrName) return MAKAMS[0];
    const key = idOrName.toLowerCase();
    return MAKAMS.find(m => m.id.toLowerCase() === key || m.name.toLowerCase() === key) || MAKAMS[0];
}

/**
 * Computes all scale degrees of the makam in commas above the Durak (0 to 53).
 * Derived automatically from its lower and upper çeşni.
 *
 * @param {object} makam
 * @returns {number[]} array of comma offsets e.g. [0, 8, 13, 22, 31, 39, 44, 53]
 */
export function getMakamDegrees(makam) {
    const out = [0];
    const lo = findCesni(makam.lower, makam.lowerIsPentachord);
    const hi = findCesni(makam.upper, makam.upperIsPentachord);

    if (!lo || !hi) return [0, 9, 18, 22, 31, 40, 49, 53];

    let at = 0;
    for (const s of lo.steps) {
        at += s;
        out.push(at);
    }
    for (const s of hi.steps) {
        at += s;
        out.push(at);
    }

    return out;
}

/**
 * Returns sounding degrees for a given makam and durak MIDI note.
 * @param {object} makam
 * @param {number} durakMidiNote
 * @returns {Array<{ note: number, detuneCents: number, commas: number }>}
 */
export function getSoundingDegrees(makam, durakMidiNote = 62) {
    const degrees = getMakamDegrees(makam);
    return degrees.map(c => place(durakMidiNote, c));
}

