/**
 * Usul Theory & Rhythmic Cycle Engine
 *
 * An Usul is ADDITIVE, not divisive.
 * Western meter divides: 4/4 is one unit cut into 4 equal quarters.
 * An Usul ADDS: Aksak (9/8) is (2 + 2 + 2 + 3) in eighth notes (or 4 + 4 + 4 + 6 in 16ths).
 *
 * Measured statistics (onset shares & rest shares) derived from classical repertoire analysis.
 */

export const USULS = [
    {
        id: 'aksak',
        name: 'Aksak',
        beats: 9,
        beatType: 8,
        cycleSixteenths: 18,
        strong: [0, 4, 8, 12],
        strokes: ['Düm', '', 'Tek', '', 'Düm', '', 'Tek', 'Tek', ''],
        onsetShare: [0.1085, 0.0158, 0.0529, 0.0386, 0.0874, 0.0162, 0.0893, 0.0344, 0.1075, 0.0259, 0.0766, 0.0385, 0.1044, 0.0203, 0.0583, 0.0210, 0.0771, 0.0273],
        restShare:  [0.2226, 0.0078, 0.0523, 0.0004, 0.1206, 0.0061, 0.0587, 0.0006, 0.1634, 0.0030, 0.0339, 0.0006, 0.2199, 0.0007, 0.0507, 0.0007, 0.0576, 0.0004],
        startsOn: 0,
        character: 'Aksak adımın kendisi: 9 zamanlı (2+2+2+3). Sondaki 3 zamanlı uzama makamın yürüyüşünü belirler.'
    },
    {
        id: 'sofyan',
        name: 'Sofyan',
        beats: 4,
        beatType: 4,
        cycleSixteenths: 16,
        strong: [0, 4, 8, 12],
        strokes: ['Düm', 'Tek', 'Tek', 'Düm'],
        onsetShare: [0.1119, 0.0203, 0.0786, 0.0449, 0.1035, 0.0243, 0.1028, 0.0352, 0.1234, 0.0287, 0.0715, 0.0424, 0.1011, 0.0221, 0.0656, 0.0238],
        restShare:  [0.1873, 0.0123, 0.0786, 0.0021, 0.1132, 0.0099, 0.0656, 0.0007, 0.2093, 0.0159, 0.0482, 0.0014, 0.1881, 0.0036, 0.0633, 0.0005],
        startsOn: 0,
        character: 'Dört dörtlük düz ve kararlı ana usul; ilahilerde ve şarkılarda çok sık kullanılır.'
    },
    {
        id: 'duyek',
        name: 'Düyek',
        beats: 8,
        beatType: 8,
        cycleSixteenths: 16,
        strong: [0, 2, 8, 12],
        strokes: ['Düm', 'Tek', 'Tek', 'Düm', 'Tek'],
        onsetShare: [0.1081, 0.0169, 0.1026, 0.0295, 0.0795, 0.0153, 0.1096, 0.0325, 0.1296, 0.0296, 0.0782, 0.0492, 0.1075, 0.0210, 0.0685, 0.0224],
        restShare:  [0.1724, 0.0060, 0.1826, 0.0002, 0.0853, 0.0022, 0.0648, 0.0001, 0.2047, 0.0066, 0.0425, 0.0002, 0.1865, 0.0018, 0.0438, 0.0003],
        startsOn: 0,
        character: 'Sekiz sekizlik, ikinci vuruşu erken gelen Türk musikisinin en temel ve yaygın usulü.'
    },
    {
        id: 'curcuna',
        name: 'Curcuna',
        beats: 10,
        beatType: 8,
        cycleSixteenths: 20,
        strong: [0, 6, 10, 14],
        strokes: ['Düm', '', 'Tek', 'Düm', 'Tek'],
        onsetShare: [0.1276, 0.0038, 0.0351, 0.0086, 0.1046, 0.0035, 0.1157, 0.0037, 0.0711, 0.0036, 0.1361, 0.0085, 0.0909, 0.0154, 0.1259, 0.0068, 0.0446, 0.0088, 0.0779, 0.0080],
        restShare:  [0.3184, 0.0001, 0.0029, 0.0019, 0.0359, 0.0012, 0.1719, 0.0040, 0.0028, 0.0000, 0.1499, 0.0000, 0.0027, 0.0019, 0.2896, 0.0008, 0.0098, 0.0042, 0.0022, 0.0000],
        startsOn: 0,
        character: 'On sekizlik (3+2+2+3) dalgalı ve oynak yürüyüşe sahip zengin usul.'
    },
    {
        id: 'aksaksemai',
        name: 'Aksak Semâi',
        beats: 10,
        beatType: 8,
        cycleSixteenths: 20,
        strong: [0, 4, 6, 14],
        strokes: ['Düm', 'Tek', '', 'Düm', 'Tek'],
        onsetShare: [0.0901, 0.0180, 0.0452, 0.0227, 0.0845, 0.0286, 0.0819, 0.0263, 0.0610, 0.0447, 0.0820, 0.0386, 0.0862, 0.0463, 0.0827, 0.0209, 0.0481, 0.0181, 0.0529, 0.0213],
        restShare:  [0.2009, 0.0021, 0.0562, 0.0012, 0.1092, 0.0019, 0.1218, 0.0086, 0.0559, 0.0014, 0.0705, 0.0038, 0.0590, 0.0014, 0.1758, 0.0019, 0.0682, 0.0021, 0.0576, 0.0009],
        startsOn: 0,
        character: 'Klasik saz semailerinin 4. hanesinde ve ağır şarkılarda kullanılan asil 10 zamanlı usul.'
    },
    {
        id: 'yuruksemai',
        name: 'Yürük Semâi',
        beats: 6,
        beatType: 8,
        cycleSixteenths: 12,
        strong: [0, 4, 8],
        strokes: ['Düm', 'Tek', 'Tek'],
        onsetShare: [0.2348, 0.0115, 0.1027, 0.0206, 0.1887, 0.0146, 0.1207, 0.0222, 0.1593, 0.0101, 0.0967, 0.0182],
        restShare:  [0.3804, 0.0005, 0.0445, 0.0000, 0.2582, 0.0002, 0.0973, 0.0000, 0.2048, 0.0002, 0.0139, 0.0000],
        startsOn: 0,
        character: 'Altı sekizlik hızlı, akıcı ve neşeli yürüyüş.'
    },
    {
        id: 'semai',
        name: 'Semâi',
        beats: 3,
        beatType: 4,
        cycleSixteenths: 12,
        strong: [0, 4],
        strokes: ['Düm', 'Tek', 'Tek'],
        onsetShare: [0.3602, 0.0056, 0.0563, 0.0113, 0.1973, 0.0057, 0.0606, 0.0067, 0.2236, 0.0054, 0.0630, 0.0041],
        restShare:  [0.7163, 0.0006, 0.0102, 0.0000, 0.1521, 0.0078, 0.0216, 0.0000, 0.0797, 0.0042, 0.0075, 0.0000],
        startsOn: 0,
        character: 'Üç zamanlı döngüsel ve zarif usul.'
    },
    {
        id: 'nimsofyan',
        name: 'Nîm Sofyan',
        beats: 2,
        beatType: 4,
        cycleSixteenths: 8,
        strong: [0, 4],
        strokes: ['Düm', 'Tek'],
        onsetShare: [0.1949, 0.0725, 0.1342, 0.1142, 0.1823, 0.0817, 0.1450, 0.0752],
        restShare:  [0.3373, 0.0715, 0.1112, 0.0063, 0.2593, 0.0349, 0.1748, 0.0048],
        startsOn: 0,
        character: 'İki zamanlı en kısa ve sade usul; marşlar ve hareketli türkülerde temel.'
    },
    {
        id: 'turkaksagi',
        name: 'Türk Aksağı',
        beats: 5,
        beatType: 8,
        cycleSixteenths: 10,
        strong: [0, 4],
        strokes: ['Düm', 'Tek'],
        onsetShare: [0.1850, 0.0529, 0.1358, 0.0784, 0.1746, 0.0453, 0.1071, 0.0473, 0.1289, 0.0446],
        restShare:  [0.2910, 0.0059, 0.0782, 0.0024, 0.3604, 0.0026, 0.1099, 0.0050, 0.1440, 0.0006],
        startsOn: 0,
        character: 'Beş sekizlik (2+3 veya 3+2) kısa aksak usul; halk müziğinde çok yaygın.'
    },
    {
        id: 'devrihindi',
        name: 'Devr-i Hindî',
        beats: 7,
        beatType: 8,
        cycleSixteenths: 14,
        strong: [0, 4, 8, 10],
        strokes: ['Düm', 'Tek', 'Düm', 'Tek'],
        onsetShare: [0.14, 0.02, 0.08, 0.03, 0.12, 0.02, 0.07, 0.11, 0.02, 0.09, 0.15, 0.03, 0.08, 0.04],
        restShare:  [0.25, 0.01, 0.05, 0.01, 0.15, 0.01, 0.04, 0.18, 0.01, 0.05, 0.20, 0.01, 0.03, 0.00],
        startsOn: 0,
        character: 'Yedi sekizlik (3+2+2 veya 2+2+3) asil ve kendine has salınımı olan usul.'
    },
    {
        id: 'agiraksak',
        name: 'Ağır Aksak',
        beats: 9,
        beatType: 4,
        cycleSixteenths: 36,
        strong: [0, 4, 8, 12, 16, 20, 24, 28, 32],
        strokes: ['Düm', 'Tek', 'Düm', 'Tek', 'Tek'],
        onsetShare: new Array(36).fill(1/36),
        restShare:  new Array(36).fill(1/36),
        startsOn: 0,
        character: 'Dokuz dörtlük ağır tempolu, klasik kâr ve bestelerde kullanılan anıtsal usul.'
    },
    {
        id: 'senginsemai',
        name: 'Sengin Semâi',
        beats: 6,
        beatType: 4,
        cycleSixteenths: 24,
        strong: [0, 4, 8, 12, 16],
        strokes: ['Düm', 'Tek', 'Tek'],
        onsetShare: new Array(24).fill(1/24),
        restShare:  new Array(24).fill(1/24),
        startsOn: 0,
        character: 'Altı dörtlük ağır tempolu zengin semai usulü.'
    }
];

export function findUsul(idOrName) {
    if (!idOrName) return USULS[0];
    const key = idOrName.toLowerCase();
    return USULS.find(u => u.id.toLowerCase() === key || u.name.toLowerCase() === key) || USULS[0];
}

/**
 * Returns duration of one Usul cycle in quarter-note beats.
 * e.g. 9/8 Aksak has 18 sixteenths = 4.5 quarter beats.
 *      4/4 Sofyan has 16 sixteenths = 4.0 quarter beats.
 */
export function getUsulBeats(usul) {
    return usul.cycleSixteenths / 4.0;
}

