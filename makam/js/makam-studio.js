/**
 * Makam Studio - Comprehensive DAW & Music Cognition Bundle (v2.5)
 * 
 * Major Fixes & Enhancements:
 *  1. Global Spacebar Transport (Play / Pause):
 *      - Pressing Space anywhere on the page instantly toggles Play / Pause without scrolling or conflicting.
 *  2. Kanun Acoustic Re-engineering:
 *      - Brighter, louder, and crisp treble acoustic profile (silver ring plectrum "fisko" attack).
 *      - Higher frequency response with sparkling mandal harmonics and +4.5dB gain boost.
 *  3. Physical Modeling Plucked String Synthesis (Karplus-Strong Algorithm) for Ud, Tanbur, Kanun.
 *  4. Dedicated Percussion (Usul) Lanes in Piano Roll (Bendir, Kudüm, Zil, Kâ, Tek, Düm).
 *  5. Real-time 53-EDO Makam Engine, Ahenk Transposition, Convolution Reverb, and DAW Ergonomics.
 */

(function() {
    'use strict';

    // ============================================================================
    // 1. 53-EDO HOLDERIAN COMMA TUNING & PITCH MATH
    // ============================================================================
    const KOMMA = {
        PER_OCTAVE: 53,
        CENTS_PER_COMMA: 1200.0 / 53.0,
        KOMA: 1,
        BAKIYE: 4,
        KUCUK_MUCENNEP: 5,
        BUYUK_MUCENNEP: 8,
        ARTIK_IKILI: 12,
        WHOLE_TONE: 9,
        FOURTH: 22,
        FIFTH: 31
    };

    function toCents(commas) {
        return commas * KOMMA.CENTS_PER_COMMA;
    }

    function place(referenceMidiNote, commasAbove) {
        const totalCents = toCents(commasAbove);
        const semitones = totalCents / 100.0;
        const nearest = Math.round(semitones);
        const detuneCents = totalCents - (nearest * 100.0);

        return {
            note: referenceMidiNote + nearest,
            detuneCents: Math.round(detuneCents * 100) / 100,
            commas: commasAbove
        };
    }

    const AHENK_LIST = [
        { name: 'Bolahenk (Nısfıye)', durakNote: 62, durakName: 'D4 (Re)', description: 'Ney / Standart Yazım' },
        { name: 'Süpürde', durakNote: 60, durakName: 'C4 (Do)', description: '1 ses (2 yarım ton) pes' },
        { name: 'Müstahsen', durakNote: 59, durakName: 'B3 (Si)', description: '1.5 ses pes' },
        { name: 'Kız Ney (Şah)', durakNote: 57, durakName: 'A3 (La)', description: '4 ses (5 yarım ton) pes' },
        { name: 'Mansur', durakNote: 55, durakName: 'G3 (Sol)', description: 'Rast ahengi - 5 ses pes' },
        { name: 'Davut', durakNote: 53, durakName: 'F3 (Fa)', description: '6 ses pes' }
    ];

    const PERDE_NAMES = [
        { comma: -31, name: 'Yegâh' },
        { comma: -27, name: 'Hüseyni Aşiran' },
        { comma: -23, name: 'Acem Aşiran' },
        { comma: -14, name: 'Geveşt' },
        { comma: -9,  name: 'Rast' },
        { comma: -5,  name: 'Zengüle' },
        { comma: -4,  name: 'Nihavend' },
        { comma: 0,   name: 'Dügâh' },
        { comma: 4,   name: 'Kürdî' },
        { comma: 5,   name: 'Uşşak' },
        { comma: 8,   name: 'Segâh' },
        { comma: 9,   name: 'Bûselik' },
        { comma: 13,  name: 'Çârgâh' },
        { comma: 17,  name: 'Nim Hicaz' },
        { comma: 18,  name: 'Hicaz' },
        { comma: 22,  name: 'Nevâ' },
        { comma: 26,  name: 'Nim Bayati' },
        { comma: 30,  name: 'Hüseyni (Koma)' },
        { comma: 31,  name: 'Hüseynî' },
        { comma: 35,  name: 'Acem' },
        { comma: 40,  name: 'Eviç' },
        { comma: 44,  name: 'Mahur' },
        { comma: 49,  name: 'Gerdâniye' },
        { comma: 53,  name: 'Muhayyer' },
        { comma: 57,  name: 'Sünbüle' },
        { comma: 61,  name: 'Tiz Segâh' },
        { comma: 62,  name: 'Tiz Bûselik' },
        { comma: 66,  name: 'Tiz Çârgâh' },
        { comma: 75,  name: 'Tiz Nevâ' },
        { comma: 84,  name: 'Tiz Hüseynî' }
    ];

    function getPerdeName(commas) {
        let best = PERDE_NAMES[0];
        let minDiff = 999;
        for (const p of PERDE_NAMES) {
            const diff = Math.abs(p.comma - commas);
            if (diff < minDiff) {
                minDiff = diff;
                best = p;
            }
        }
        if (minDiff <= 1) return best.name;
        return `${commas > 0 ? '+' : ''}${commas}k`;
    }

    const DRUM_LANES = [
        { pitch: 46, name: 'Bendir (Rezonans)', stroke: 'Bendir' },
        { pitch: 44, name: 'Kudüm Tiz', stroke: 'Kudüm' },
        { pitch: 42, name: 'Zil / Te-ke', stroke: 'Zil' },
        { pitch: 40, name: 'Kâ (Kapalı Tok)', stroke: 'Kâ' },
        { pitch: 38, name: 'Tek (Açık Tiz)', stroke: 'Tek' },
        { pitch: 36, name: 'Düm (Bas / Göğüs)', stroke: 'Düm' }
    ];

    function getClosestDrumPitch(pitch) {
        let best = DRUM_LANES[0].pitch;
        let minDiff = 999;
        for (const lane of DRUM_LANES) {
            const diff = Math.abs(lane.pitch - pitch);
            if (diff < minDiff) {
                minDiff = diff;
                best = lane.pitch;
            }
        }
        return best;
    }

    // ============================================================================
    // 2. MAKAMS & ÇEŞNİ
    // ============================================================================
    const SEYIR = {
        ASCENDING: 'Ascending',
        DESCENDING: 'Descending',
        FROM_ABOVE: 'FromAbove',
        FROM_BELOW: 'FromBelow'
    };

    const SEYIR_INFO = {
        [SEYIR.ASCENDING]: { trName: 'Çıkıcı', description: 'Durak perdesi civarından başlar, güçlüye ve tizlere doğru yükselir.' },
        [SEYIR.DESCENDING]: { trName: 'İnici', description: 'Tiz durak veya oktav civarından başlar, güçlüye uğrayıp durağa iner.' },
        [SEYIR.FROM_ABOVE]: { trName: 'İnici-Çıkıcı', description: 'Güçlü perdesi civarından başlar; her iki yöne açılır, güçlüde yarım karar, durakta tam karar yapar.' },
        [SEYIR.FROM_BELOW]: { trName: 'Çıkıcı-İnici', description: 'Duraktan tırmanışla başlar, tizlerde dolaştıktan sonra süzülerek durağa iner.' }
    };

    const TETRACHORDS = [
        { name: 'Çargâh', steps: [9, 9, 4], character: 'Parlak ve açık - Batı majör dörtlüsü' },
        { name: 'Bûselik', steps: [9, 4, 9], character: 'Doğal minör dörtlüsü - koma sapmasız' },
        { name: 'Kürdî', steps: [4, 9, 9], character: 'Peslerde bakiye bemollü, koyu ve dramatik' },
        { name: 'Rast', steps: [9, 8, 5], character: 'Segahlı 8 komalık 3. derece - Doğu renginin kalbi' },
        { name: 'Uşşak', steps: [8, 5, 9], character: '1 koma pes ikinci derece - hüzünlü ve çok yaygın' },
        { name: 'Hicaz', steps: [5, 12, 5], character: '12 komalık artık ikili - derin hasret ve mistik etki' },
        { name: 'Sabâ', steps: [8, 5, 5], character: 'Eksik dörtlü (18 koma) - kendine has içe dokunan tavır' },
        { name: 'Segâh', steps: [5, 9, 9], character: '1 koma bemollü Segâh perdesi ve tam ton adımları' }
    ];

    const PENTACHORDS = [
        { name: 'Çargâh', steps: [9, 9, 4, 9], character: 'Majör beşli - tam tona kadar' },
        { name: 'Bûselik', steps: [9, 4, 9, 9], character: 'Minör beşli - tam tona kadar' },
        { name: 'Kürdî', steps: [4, 9, 9, 9], character: 'Pes bakiye ikinci derece ve düzenli adımlar' },
        { name: 'Rast', steps: [9, 8, 5, 9], character: 'Rast renginin 5. dereceye (Neva) kadar taşınışı' },
        { name: 'Hüseynî', steps: [8, 9, 5, 9], character: 'Uşşak gibi başlar, 3. derecesi açık ve tiz' },
        { name: 'Hicaz', steps: [5, 12, 5, 9], character: 'Hicaz artık ikilisi ile 5. dereceye uzanan yapı' },
        { name: 'Nikriz', steps: [9, 5, 12, 5], character: 'Tam ton ardından gelen Hicaz artık ikilisi' },
        { name: 'Segâh', steps: [5, 9, 9, 8], character: 'Segâh perdesinden 5. dereceye uzanan geleneksel beşli' }
    ];

    function findCesni(name, isPentachord = false) {
        const list = isPentachord ? PENTACHORDS : TETRACHORDS;
        return list.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
    }

    const MAKAMS = [
        { id: 'rast', name: 'Rast', lower: 'Rast', lowerIsPentachord: true, upper: 'Rast', upperIsPentachord: false, guclu: 31, seyir: SEYIR.ASCENDING, approachFrom: 9, character: 'Türk musikisinin temel makamı - ne majör ne minör, asil, neşeli ve kararlı.' },
        { id: 'ussak', name: 'Uşşak', lower: 'Uşşak', lowerIsPentachord: false, upper: 'Bûselik', upperIsPentachord: true, guclu: 22, seyir: SEYIR.ASCENDING, approachFrom: 7, character: 'En yaygın halk ve klasik makamlardan biri; hüzünlü ve içten.' },
        { id: 'bayati', name: 'Bayatî', lower: 'Uşşak', lowerIsPentachord: false, upper: 'Bûselik', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 7, character: 'Uşşak seslerinde İnici-Çıkıcı asil seyir; Nevâ perdesinde asılı kalan derin hüzün.' },
        { id: 'hicaz', name: 'Hicaz', lower: 'Hicaz', lowerIsPentachord: false, upper: 'Rast', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 5, character: 'Geniş artık ikili adımı - yakıcı, hasret dolu ve mistik.' },
        { id: 'humayun', name: 'Hümâyûn', lower: 'Hicaz', lowerIsPentachord: false, upper: 'Bûselik', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 5, character: 'Acem perdesiyle duru minör hissi veren, Hicaz ailesinin en lirik ve dramatik makamı.' },
        { id: 'uzzal', name: 'Uzzâl', lower: 'Hicaz', lowerIsPentachord: true, upper: 'Uşşak', upperIsPentachord: false, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 5, character: 'Eviç perdesinin kattığı sıcaklık ile halk ve sanat müziğinin en sevilen içten Hicaz türü.' },
        { id: 'zirgulelihicaz', name: 'Zirgüleli Hicaz', lower: 'Hicaz', lowerIsPentachord: true, upper: 'Hicaz', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 5, character: 'Hem pestte hem tizlerde artık ikili taşıyan, gösterişli ve mistik saray makamı.' },
        { id: 'kurdi', name: 'Kürdî', lower: 'Kürdî', lowerIsPentachord: false, upper: 'Bûselik', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_BELOW, approachFrom: 4, character: 'Karanlık, derin ve Batı Frigyen dizisine en yakın duyum.' },
        { id: 'kurdilihicazkar', name: 'Kürdîli Hicazkâr', lower: 'Kürdî', lowerIsPentachord: false, upper: 'Bûselik', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 4, character: 'Rast perdesinde Kürdî dizisi; Türk Sanat Müziğinin en akıcı, coşkulu ve popüler şarkı makamı.' },
        { id: 'hicazkar', name: 'Hicazkâr', lower: 'Hicaz', lowerIsPentachord: true, upper: 'Hicaz', upperIsPentachord: false, guclu: 31, seyir: SEYIR.DESCENDING, approachFrom: 5, character: 'Rast perdesinde Zirgüleli Hicaz şeddi; oryantal, parlak ve büyüleyici tını.' },
        { id: 'buselik', name: 'Bûselik', lower: 'Bûselik', lowerIsPentachord: true, upper: 'Kürdî', upperIsPentachord: false, guclu: 31, seyir: SEYIR.ASCENDING, approachFrom: -5, character: 'Koma sapması olmayan duru minör tını - güçlü ve kararlı.' },
        { id: 'nihavend', name: 'Nihavend', lower: 'Bûselik', lowerIsPentachord: true, upper: 'Kürdî', upperIsPentachord: false, guclu: 31, seyir: SEYIR.DESCENDING, approachFrom: -5, character: 'Bûselik seslerinin İNİCİ seyriyle oluşan, zengin ve hüzünlü tını.' },
        { id: 'huseyni', name: 'Hüseynî', lower: 'Hüseynî', lowerIsPentachord: true, upper: 'Uşşak', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 7, character: 'Yükseklerde yaşayan, parlak ve yiğit halk türküsü tınısı.' },
        { id: 'muhayyer', name: 'Muhayyer', lower: 'Hüseynî', lowerIsPentachord: true, upper: 'Uşşak', upperIsPentachord: false, guclu: 53, seyir: SEYIR.DESCENDING, approachFrom: 7, character: 'Tiz duraktan süzülen, yiğit ve hasret dolu muazzam bir İnici klasik makam.' },
        { id: 'tahir', name: 'Tâhir', lower: 'Uşşak', lowerIsPentachord: false, upper: 'Rast', upperIsPentachord: true, guclu: 31, seyir: SEYIR.DESCENDING, approachFrom: 7, character: 'Muhayyer perdesinden başlayıp Gerdâniye ve Nevâ üzerinden Uşşak durağına inen duru makam.' },
        { id: 'karcigar', name: 'Karcığar', lower: 'Uşşak', lowerIsPentachord: false, upper: 'Hicaz', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 7, character: 'Pestte Uşşak hüznü, tizlerde Hicaz ateşi - büyüleyici kontrast.' },
        { id: 'nikriz', name: 'Nikriz', lower: 'Nikriz', lowerIsPentachord: true, upper: 'Rast', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 9, character: 'Önce tam ton, sonra Hicaz adımı - canlı, kıvrak ve hareketli.' },
        { id: 'suzinak', name: 'Sûzinâk', lower: 'Rast', lowerIsPentachord: true, upper: 'Hicaz', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 9, character: 'Pestte Rast zarafeti, tizlerde Hicaz sıcaklığı.' },
        { id: 'cargah', name: 'Çargâh', lower: 'Çargâh', lowerIsPentachord: true, upper: 'Çargâh', upperIsPentachord: false, guclu: 31, seyir: SEYIR.ASCENDING, approachFrom: -4, character: 'Teorik ana makam (Do Majör dizisi) - aydınlık ve sert.' },
        { id: 'mahur', name: 'Mâhur', lower: 'Çargâh', lowerIsPentachord: true, upper: 'Çargâh', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 9, character: 'Rast perdesinde Çargâh dizisi; berrak, asil, neşeli ve saray meclislerine layık bir şed makam.' },
        { id: 'acemasiran', name: 'Acem Aşiran', lower: 'Çargâh', lowerIsPentachord: true, upper: 'Çargâh', upperIsPentachord: false, guclu: 31, seyir: SEYIR.ASCENDING, approachFrom: 9, character: 'Pest Acem Aşiran perdesinde karar kılan, son derece dingin, huzurlu ve oturaklı makam.' },
        { id: 'gerdaniye', name: 'Gerdâniye', lower: 'Rast', lowerIsPentachord: true, upper: 'Rast', upperIsPentachord: false, guclu: 53, seyir: SEYIR.DESCENDING, approachFrom: 9, character: 'Rast dizisinin tiz Sol (Gerdâniye) perdesinden başlayan coşkulu ve ferahlatıcı İnici hali.' },
        { id: 'saba', name: 'Sabâ', lower: 'Sabâ', lowerIsPentachord: false, upper: 'Hicaz', upperIsPentachord: true, guclu: 18, seyir: SEYIR.ASCENDING, approachFrom: 8, character: 'Eksik dörtlüsüyle tanımsız bir derinlik; içe işleyen eşsiz tasavvufi lezzet.' },
        { id: 'segah', name: 'Segâh', lower: 'Segâh', lowerIsPentachord: true, upper: 'Rast', upperIsPentachord: false, guclu: 23, seyir: SEYIR.ASCENDING, approachFrom: 5, character: 'Türk musikisinin en karakteristik ve mistik makamı - koma bemollü Segâh perdesinde derin huzur.' },
        { id: 'huzzam', name: 'Hüzzâm', lower: 'Segâh', lowerIsPentachord: true, upper: 'Hicaz', upperIsPentachord: false, guclu: 23, seyir: SEYIR.FROM_ABOVE, approachFrom: 5, character: 'Yerinde Segâh ve Eviç üzerinde Hicaz lezzeti; Türk musikisinin en çok dinlenen ve en içli şaheser makamı.' },
        { id: 'gulizar', name: 'Gülizâr', lower: 'Hüseynî', lowerIsPentachord: true, upper: 'Rast', upperIsPentachord: false, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 8, character: 'Uşşak, Hüseynî ve Rast çeşnilerinin harmanlandığı, gül bahçesi zarafetinde klasik mürekkep makam.' },
        { id: 'zavil', name: 'Zavil', lower: 'Rast', lowerIsPentachord: true, upper: 'Çargâh', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 9, character: 'Rast makamının asil neşesi ile Çargâhın berrak aydınlığını birleştiren, coşkulu ve ferah makam.' },
        { id: 'evic', name: 'Eviç', lower: 'Segâh', lowerIsPentachord: true, upper: 'Hicaz', upperIsPentachord: false, guclu: 31, seyir: SEYIR.DESCENDING, approachFrom: 5, character: 'Tizlerde Eviç perdesinden süzülen, Segâh ve Hicaz çeşnileriyle bezeli asil, vakur ve derin klasik makam.' },
        { id: 'ferahfeza', name: 'Ferahfezâ', lower: 'Bûselik', lowerIsPentachord: true, upper: 'Kürdî', upperIsPentachord: false, guclu: 31, seyir: SEYIR.FROM_ABOVE, approachFrom: 9, character: 'Gönlü ferahlatan anlamına gelen; Yegâh perdesinde derin, lirik ve asil klasik makam.' },
        { id: 'acemkurdi', name: 'Acem Kürdî', lower: 'Kürdî', lowerIsPentachord: false, upper: 'Çargâh', upperIsPentachord: true, guclu: 22, seyir: SEYIR.FROM_ABOVE, approachFrom: 4, character: 'Kürdî hüznü ile Acem perdesinin asil parlaklığını birleştiren çok sevilen klasik makam.' }
    ];

    function findMakam(idOrName) {
        if (!idOrName) return MAKAMS[0];
        const key = idOrName.toLowerCase();
        return MAKAMS.find(m => m.id.toLowerCase() === key || m.name.toLowerCase() === key) || MAKAMS[0];
    }

    function getMakamDegrees(makam) {
        const out = [0];
        const lo = findCesni(makam.lower, makam.lowerIsPentachord);
        const hi = findCesni(makam.upper, makam.upperIsPentachord);

        if (!lo || !hi) return [0, 9, 18, 22, 31, 40, 49, 53];

        let at = 0;
        for (const s of lo.steps) { at += s; out.push(at); }
        for (const s of hi.steps) { at += s; out.push(at); }
        return out;
    }

    // ============================================================================
    // 3. USUL RHYTHMS
    // ============================================================================
    const USULS = [
        { id: 'aksak', name: 'Aksak', beats: 9, beatType: 8, cycleSixteenths: 18, strong: [0, 4, 8, 12], strokes: ['Düm', '', 'Tek', '', 'Düm', '', 'Tek', 'Tek', ''], onsetShare: [0.1085, 0.0158, 0.0529, 0.0386, 0.0874, 0.0162, 0.0893, 0.0344, 0.1075, 0.0259, 0.0766, 0.0385, 0.1044, 0.0203, 0.0583, 0.0210, 0.0771, 0.0273], startsOn: 0, character: 'Aksak adım: 9 zamanlı (2+2+2+3).' },
        { id: 'sofyan', name: 'Sofyan', beats: 4, beatType: 4, cycleSixteenths: 16, strong: [0, 4, 8, 12], strokes: ['Düm', 'Tek', 'Tek', 'Düm'], onsetShare: [0.1119, 0.0203, 0.0786, 0.0449, 0.1035, 0.0243, 0.1028, 0.0352, 0.1234, 0.0287, 0.0715, 0.0424, 0.1011, 0.0221, 0.0656, 0.0238], startsOn: 0, character: 'Dört dörtlük düz ve kararlı ana usul.' },
        { id: 'duyek', name: 'Düyek', beats: 8, beatType: 8, cycleSixteenths: 16, strong: [0, 2, 8, 12], strokes: ['Düm', 'Tek', 'Tek', 'Düm', 'Tek'], onsetShare: [0.1081, 0.0169, 0.1026, 0.0295, 0.0795, 0.0153, 0.1096, 0.0325, 0.1296, 0.0296, 0.0782, 0.0492, 0.1075, 0.0210, 0.0685, 0.0224], startsOn: 0, character: 'Sekiz sekizlik Türk musikisinin en temel usulü.' },
        { id: 'curcuna', name: 'Curcuna', beats: 10, beatType: 8, cycleSixteenths: 20, strong: [0, 6, 10, 14], strokes: ['Düm', '', 'Tek', 'Düm', 'Tek'], onsetShare: [0.1276, 0.0038, 0.0351, 0.0086, 0.1046, 0.0035, 0.1157, 0.0037, 0.0711, 0.0036, 0.1361, 0.0085, 0.0909, 0.0154, 0.1259, 0.0068, 0.0446, 0.0088, 0.0779, 0.0080], startsOn: 0, character: 'On sekizlik (3+2+2+3) dalgalı ve oynak yürüyüş.' },
        { id: 'aksaksemai', name: 'Aksak Semâi', beats: 10, beatType: 8, cycleSixteenths: 20, strong: [0, 4, 6, 14], strokes: ['Düm', 'Tek', '', 'Düm', 'Tek'], onsetShare: [0.0901, 0.0180, 0.0452, 0.0227, 0.0845, 0.0286, 0.0819, 0.0263, 0.0610, 0.0447, 0.0820, 0.0386, 0.0862, 0.0463, 0.0827, 0.0209, 0.0481, 0.0181, 0.0529, 0.0213], startsOn: 0, character: 'Klasik saz semailerinde kullanılan 10 zamanlı asil usul.' },
        { id: 'yuruksemai', name: 'Yürük Semâi', beats: 6, beatType: 8, cycleSixteenths: 12, strong: [0, 4, 8], strokes: ['Düm', 'Tek', 'Tek'], onsetShare: [0.2348, 0.0115, 0.1027, 0.0206, 0.1887, 0.0146, 0.1207, 0.0222, 0.1593, 0.0101, 0.0967, 0.0182], startsOn: 0, character: 'Altı sekizlik hızlı ve neşeli yürüyüş.' },
        { id: 'semai', name: 'Semâi', beats: 3, beatType: 4, cycleSixteenths: 12, strong: [0, 4], strokes: ['Düm', 'Tek', 'Tek'], onsetShare: [0.3602, 0.0056, 0.0563, 0.0113, 0.1973, 0.0057, 0.0606, 0.0067, 0.2236, 0.0054, 0.0630, 0.0041], startsOn: 0, character: 'Üç zamanlı döngüsel ve zarif usul.' },
        { id: 'nimsofyan', name: 'Nîm Sofyan', beats: 2, beatType: 4, cycleSixteenths: 8, strong: [0, 4], strokes: ['Düm', 'Tek'], onsetShare: [0.1949, 0.0725, 0.1342, 0.1142, 0.1823, 0.0817, 0.1450, 0.0752], startsOn: 0, character: 'İki zamanlı sade usul.' },
        { id: 'turkaksagi', name: 'Türk Aksağı', beats: 5, beatType: 8, cycleSixteenths: 10, strong: [0, 4], strokes: ['Düm', 'Tek'], onsetShare: [0.1850, 0.0529, 0.1358, 0.0784, 0.1746, 0.0453, 0.1071, 0.0473, 0.1289, 0.0446], startsOn: 0, character: 'Beş sekizlik (2+3) kısa aksak usul.' },
        { id: 'devrihindi', name: 'Devr-i Hindî', beats: 7, beatType: 8, cycleSixteenths: 14, strong: [0, 4, 8, 10], strokes: ['Düm', 'Tek', 'Düm', 'Tek'], onsetShare: [0.14, 0.02, 0.08, 0.03, 0.12, 0.02, 0.07, 0.11, 0.02, 0.09, 0.15, 0.03, 0.08, 0.04], startsOn: 0, character: 'Yedi sekizlik asil usul.' },
        { id: 'agiraksak', name: 'Ağır Aksak', beats: 9, beatType: 4, cycleSixteenths: 36, strong: [0, 4, 8, 12, 16, 20, 24, 28, 32], strokes: ['Düm', 'Tek', 'Düm', 'Tek', 'Tek'], onsetShare: new Array(36).fill(1/36), startsOn: 0, character: 'Dokuz dörtlük ağır klasik kâr ve beste usulü.' },
        { id: 'senginsemai', name: 'Sengin Semâi', beats: 6, beatType: 4, cycleSixteenths: 24, strong: [0, 4, 8, 12, 16], strokes: ['Düm', 'Tek', 'Tek'], onsetShare: new Array(24).fill(1/24), startsOn: 0, character: 'Altı dörtlük zengin semai usulü.' }
    ];

    function findUsul(idOrName) {
        if (!idOrName) return USULS[0];
        const key = idOrName.toLowerCase();
        return USULS.find(u => u.id.toLowerCase() === key || u.name.toLowerCase() === key) || USULS[0];
    }

    function getUsulBeats(usul) {
        return usul.cycleSixteenths / 4.0;
    }

    // ============================================================================
    // 4. SEYİR & FORM ENGINE
    // ============================================================================
    class XorShiftRng {
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
        unit() { return (this.next() & 0xFFFFFF) / 0x1000000; }
    }

    function buildLadder(makam, range = { lowestComma: -9, highestComma: 62 }) {
        const oct = getMakamDegrees(makam);
        const rungs = new Set();
        for (let shift = -53; shift <= 106; shift += 53) {
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

    function nearestRung(rungs, comma) {
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < rungs.length; ++i) {
            const d = Math.abs(rungs[i] - comma);
            if (d < bestDist) { bestDist = d; best = i; }
        }
        return best;
    }

    function phrasePlan(makam, phraseCount = 4, formType = 'standard', contourType = 'auto', rng = null) {
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

        let at = durak;
        if (effectiveContour === 'cascade' || makam.seyir === SEYIR.DESCENDING) {
            at = (rng.unit() < 0.5) ? top : stepUpper;
        } else if (effectiveContour === 'wave' || makam.seyir === SEYIR.FROM_ABOVE) {
            at = (rng.unit() < 0.6) ? guclu : (rng.unit() < 0.5 ? step3 : durak);
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

    function generateMakamMelody(options = {}) {
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

        let here = nearestRung(rungs, plan[0].fromComma);
        let previousMotifSteps = null;

        for (let p = 0; p < plan.length; ++p) {
            const phrase = plan[p];
            const barStart = startBeat + (p * cycleBeats);
            const target = nearestRung(rungs, phrase.toComma);

            // Generate or sequence rhythmic slots
            const slots = [];
            for (let i = 0; i < cycle16; ++i) {
                let share = (usul.onsetShare && i < usul.onsetShare.length) ? usul.onsetShare[i] : (i % 4 === 0 ? 0.22 : 0.05);
                if (freedom > 0.40 && (i % 2 !== 0)) {
                    share += (freedom * 0.05);
                }
                // Add natural syncopations and swing
                if (i % 4 === 2 && rng.unit() < 0.35) {
                    share += 0.08;
                }
                if (share * cycle16 * density > rng.unit()) {
                    slots.push(i);
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

            // Check if measure 1 sequences measure 0's motif
            const doMotifSequence = (p === 1 && previousMotifSteps && previousMotifSteps.length > 2 && rng.unit() < 0.65);

            for (let s = 0; s < n; ++s) {
                if (s === n - 1) {
                    if (phrase.isFinal || freedom < 0.70 || rng.unit() > (freedom * 0.30)) {
                        here = target;
                    }
                } else if (phrase.isFinal && s === n - 2 && approachRung >= 0 && Math.abs(approachRung - here) <= 3) {
                    here = approachRung;
                } else if (doMotifSequence && s < previousMotifSteps.length) {
                    // Sequence: repeat the motif transposition with variation
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
                        if (roll < 0.22 && !phrase.isFinal) {
                            // Note repetition / meşk reiteration
                            step = 0;
                        } else if (roll < 0.40 && !phrase.isFinal) {
                            // Auxiliary wave / turn (opposite of toward, then returns)
                            step = (toward !== 0) ? -toward : (rng.unit() < 0.5 ? 1 : -1);
                        } else {
                            // Stepwise in primary direction
                            const lean = phrase.isFinal ? 0.95 : Math.max(0.40, 0.88 - (freedom * 0.45));
                            step = (rng.unit() < lean && toward !== 0) ? toward : (rng.unit() < 0.5 ? 1 : -1);

                            const leapChance = 0.08 + (freedom * 0.30);
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

                // Natural phrase breathing: slight musical pause on weak beat phrase ends
                if (!phrase.isFinal && s === n - 1 && lengthBeats > 0.5 && rng.unit() < 0.45) {
                    lengthBeats = Math.max(0.25, lengthBeats - 0.25);
                }

                const restsHere = usul.strong && usul.strong.includes(pos);
                let noteCommas = rungs[here];

                // Chromatic passing nuance at high freedom
                if (freedom > 0.65 && !phrase.isFinal && rng.unit() < (freedom * 0.12)) {
                    const inflection = rng.unit() < 0.5 ? 1 : -1;
                    noteCommas += inflection;
                }

                const sounding = place(durakMidi, noteCommas);

                // Tasteful ornament assignment based on freedom
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
                    velocity: restsHere ? 0.88 : (0.64 + (rng.unit() * 0.08)),
                    locked: false,
                    ornament: ornament,
                    section: phrase.section
                });
            }

            if (p === 0) previousMotifSteps = currentMotifSteps;
        }
        return out;
    }

    // ============================================================================
    // 5. MAKAM REVIEWER
    // ============================================================================
    function reviewMakamMelody(melody, makamInput, durakMidi = 62, usulInput = 'sofyan') {
        const makam = typeof makamInput === 'string' ? findMakam(makamInput) : (makamInput || findMakam('hicaz'));
        const usul = typeof usulInput === 'string' ? findUsul(usulInput) : (usulInput || findUsul('sofyan'));
        const cycleBeats = getUsulBeats(usul) || 4;
        const issues = [];
        let score = 100;

        if (!melody || melody.length === 0) {
            return { score: 100, status: 'Boş', issues: [{ type: 'info', text: 'İncelemek için melodi ekleyin veya üretin.' }] };
        }

        const notes = [...melody].sort((a, b) => a.startBeat - b.startBeat);
        const guclu = makam.guclu || 22;
        const rawDegrees = getMakamDegrees(makam);
        const makamDegrees = rawDegrees.map(d => ((d % 53) + 53) % 53);

        // 1. MAKAMDAN SAPMA / YABANCI PERDE DENETİMİ (Out-of-Scale Pitch Detection)
        const outOfScaleNotes = [];
        for (const n of notes) {
            let noteComma = n.commas;
            if (noteComma === undefined) {
                noteComma = Math.round((n.pitch - durakMidi) * (53 / 12));
            }
            const normDegree = ((noteComma % 53) + 53) % 53;

            const isScaleDegree = makamDegrees.some(d => {
                const diff = Math.abs(d - normDegree);
                return diff <= 2 || diff >= 51;
            });

            if (!isScaleDegree) {
                const measureNum = Math.floor(n.startBeat / cycleBeats) + 1;
                const pName = getPerdeName(noteComma);
                outOfScaleNotes.push({ measure: measureNum, perde: pName, pitch: n.pitch, comma: noteComma });
            }
        }

        if (outOfScaleNotes.length > 0) {
            const sample = outOfScaleNotes.slice(0, 3).map(o => `Ölçü ${o.measure}: ${o.perde} (${o.comma}k)`).join(', ');
            issues.push({
                type: 'danger',
                text: `🚨 <strong>Makam Dışı Perde:</strong> ${outOfScaleNotes.length} adet yabancı/uyumsuz nota tespit edildi: [${sample}${outOfScaleNotes.length > 3 ? '...' : ''}]. ${makam.name} dizisinde bu basamak yer almaz.`
            });
            score -= Math.min(50, outOfScaleNotes.length * 20);
        }

        // 2. AŞIRI VE UYUMSUZ MELODİK SIÇRAMALAR (Large & Disjunct Leaps)
        const leaps = [];
        for (let i = 1; i < notes.length; ++i) {
            const prev = notes[i - 1];
            const curr = notes[i];
            const semitoneDiff = Math.abs(curr.pitch - prev.pitch);
            if (semitoneDiff >= 7) {
                const measureNum = Math.floor(curr.startBeat / cycleBeats) + 1;
                leaps.push({ measure: measureNum, diff: semitoneDiff, from: prev.pitch, to: curr.pitch });
            }
        }

        if (leaps.length > 0) {
            const leapDesc = leaps.slice(0, 2).map(l => `Ölçü ${l.measure}'de ${l.diff} yarım tonluk atlama`).join(', ');
            issues.push({
                type: 'warning',
                text: `⚠️ <strong>Sert Melodik Sıçrama:</strong> ${leaps.length} adet geniş aralık sıçraması var (${leapDesc}). Türk musikisi nağmeleri basamak basamak (adım adım) yürür.`
            });
            score -= Math.min(30, leaps.length * 12);
        }

        // 3. SEYİR GİRİŞ TAVRI (Seyir Başlangıç Uyumu)
        const firstNote = notes[0];
        const firstComma = firstNote.commas !== undefined ? firstNote.commas : Math.round((firstNote.pitch - durakMidi) * (53 / 12));

        if (makam.seyir === SEYIR.ASCENDING && firstComma > 18) {
            issues.push({
                type: 'warning',
                text: `📌 <strong>Çıkıcı Seyir Kuralı:</strong> ${makam.name} makamına Durak perdesi (Dügâh / Rast) civarından başlanmalıdır (Şu an ${getPerdeName(firstComma)} / ${firstComma}k).`
            });
            score -= 15;
        } else if (makam.seyir === SEYIR.DESCENDING && firstComma < 22) {
            issues.push({
                type: 'warning',
                text: `📌 <strong>İnici Seyir Kuralı:</strong> ${makam.name} makamına Tiz Durak veya Gerdâniye/Muhayyer civarından girilmelidir (Şu an ${getPerdeName(firstComma)} / ${firstComma}k).`
            });
            score -= 15;
        } else if (makam.seyir === SEYIR.FROM_ABOVE && Math.abs(firstComma - guclu) > 12) {
            issues.push({
                type: 'info',
                text: `💡 <strong>İnici-Çıkıcı Seyir:</strong> ${makam.name} genellikle Güçlü perdesi (${getPerdeName(guclu)} / ${guclu}k) civarından sergilenmeye başlar.`
            });
            score -= 8;
        }

        // 4. TAM KARAR BİTİŞİ (Final Tonic Cadence on Durak)
        const lastNote = notes[notes.length - 1];
        const lastComma = lastNote.commas !== undefined ? lastNote.commas : Math.round((lastNote.pitch - durakMidi) * (53 / 12));
        const normalizedLast = ((lastComma % 53) + 53) % 53;

        if (normalizedLast !== 0 && normalizedLast !== 53) {
            issues.push({
                type: 'danger',
                text: `🛑 <strong>Karar Eksikliği:</strong> Eser makamın Durağında (Karar = 0k) sonlanmalıdır. Melodiniz ${getPerdeName(lastComma)} (${lastComma}k) üzerinde asılı kaldı.`
            });
            score -= 30;
        }

        // 5. MEYAN (TİZ BÖLGE) ZİYARETİ
        const maxComma = Math.max(...notes.map(n => n.commas ?? Math.round((n.pitch - durakMidi) * (53 / 12))));
        if (notes.length >= 8 && maxComma < guclu) {
            issues.push({
                type: 'info',
                text: `ℹ️ <strong>Meyan Eksik:</strong> Melodi Güçlü perdesinin (${getPerdeName(guclu)}) üzerine çıkmadı; esere meyan zenginliği katmak için tiz perdeleri kullanabilirsiniz.`
            });
            score -= 5;
        }

        score = Math.max(10, Math.min(100, score));
        let status = 'Mükemmel Seyir';
        if (score < 50) status = 'Kritik Seyir Hataları Mevcut';
        else if (score < 75) status = 'Geliştirilmeli / Kural Dışı';
        else if (score < 90) status = 'İyi Seyir Uyumu';

        return {
            score,
            status,
            issues: issues.length > 0 ? issues : [{ type: 'success', text: 'Melodi makamın seyir kurallarına, perdelerine ve tam kararına tam uyumludur!' }]
        };
    }

    // ============================================================================
    // 6. CHORDS, BASS & DRUMS
    // ============================================================================
    function needsMicrotones(commas, durakMidiNote = 62) {
        const halfComma = KOMMA.CENTS_PER_COMMA / 2.0;
        for (const c of commas) {
            const p = place(durakMidiNote, c);
            if (Math.abs(p.detuneCents) > halfComma) return true;
        }
        return false;
    }

    function getMakamChords(makamInput, durakMidiNote = 62) {
        const makam = typeof makamInput === 'string' ? findMakam(makamInput) : (makamInput || findMakam('hicaz'));
        const guclu = makam.guclu || 22;
        const out = [];

        out.push({
            name: 'Sabit Karar Demi (Durak)',
            commas: [0],
            why: `Makamın durak perdesi (${makam.durakName || 'Karar'}) alttan kesintisiz zemin olarak çalar. En saf, geleneksel ve asil eşliktir.`,
            fit: 100,
            microtonal: false
        });

        out.push({
            name: 'Durak ve Güçlü Demi',
            commas: [0, guclu],
            why: `Makamın iki ana direği olan Durak ve Güçlü (${makam.gucluName || 'Güçlü'}) birlikte tutulur. Eserin omurgasını hissettirir.`,
            fit: 95,
            microtonal: false
        });

        out.push({
            name: 'Açık Oktav Demi',
            commas: [0, 53],
            why: 'Durak perdesi ve bir üst oktavı ile geniş, ferah ve derin bir akustik zemin oluşturulur.',
            fit: 90,
            microtonal: false
        });

        out.push({
            name: 'Seyir Uyumlu Dinamik Dem',
            commas: [0],
            isDynamic: true,
            why: 'Zemin (Giriş) ölçülerinde Durak, Meyan (Yükselme) ölçülerinde Güçlü, Karar (Bitiş) ölçülerinde tekrar Durak perdesine otomatik geçen akıllı seyir demi.',
            fit: 94,
            microtonal: false
        });

        return out;
    }

    const BASS_KIND = { DEM: 'dem', DEM_AND_GUCLU: 'dem_and_guclu', DOUBLING: 'doubling', ON_THE_USUL: 'on_the_usul' };

    const BASS_OPTIONS = [
        { id: BASS_KIND.ON_THE_USUL, name: 'USUL VURUŞLU BAS', why: 'Durağın usulün güçlü vuruşlarında kısa ve nefesli vurulup bırakılması. En otantik Türk müziği bas yaklaşımı.' },
        { id: BASS_KIND.DOUBLING, name: 'HETEROFONİ - Melodiyi Alttan Takip', why: 'Melodiyi bir oktav alttan ve süslemesiz takip eden geleneksel doku.' },
        { id: BASS_KIND.DEM, name: 'DEM - Tek Ses Sabit', why: 'Durağın bir oktav altta hafifçe tutulması.' },
        { id: BASS_KIND.DEM_AND_GUCLU, name: 'DEM - Durak ve Güçlü Geçişli', why: 'Dem perdesinin durak ile güçlü arasında hareket etmesi.' }
    ];

    function generateMakamBass(options = {}) {
        const kind = options.kind || BASS_KIND.ON_THE_USUL;
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
        const lowBase = durakMidi - 12;

        function addNote(commas, at, length, vel = 0.7) {
            if (length <= 0) return;
            const p = place(lowBase, commas);
            out.push({ pitch: p.note, detuneCents: p.detuneCents, commas: commas, startBeat: at, lengthBeats: length, velocity: vel, locked: false });
        }

        switch (kind) {
            case BASS_KIND.DEM:
                for (let c = 0; c < cycles; ++c) addNote(0, startBeat + (c * cycleBeats), Math.min(1.25, cycleBeats * 0.35), 0.75);
                break;
            case BASS_KIND.DEM_AND_GUCLU: {
                let onDurak = true;
                for (let c = 0; c < cycles; ++c) {
                    if (c > 0 && rng.unit() < 0.45) onDurak = !onDurak;
                    addNote(onDurak ? 0 : (makam.guclu || 22), startBeat + (c * cycleBeats), Math.min(1.25, cycleBeats * 0.35), 0.72);
                }
                break;
            }
            case BASS_KIND.DOUBLING: {
                if (melody.length === 0) {
                    for (let c = 0; c < cycles; ++c) addNote(0, startBeat + (c * cycleBeats), Math.min(1.0, cycleBeats * 0.3), 0.7);
                    break;
                }
                const endBeat = startBeat + (cycles * cycleBeats);
                for (const note of melody) {
                    if (note.startBeat < startBeat - 1e-4 || note.startBeat >= endBeat - 1e-4) continue;
                    const bassLen = Math.max(0.25, Math.min(0.75, note.lengthBeats * 0.7));
                    out.push({ pitch: note.pitch - 12, detuneCents: note.detuneCents, commas: note.commas, startBeat: note.startBeat, lengthBeats: bassLen, velocity: 0.65, locked: false });
                }
                break;
            }
            case BASS_KIND.ON_THE_USUL:
                for (let c = 0; c < cycles; ++c) {
                    const barStart = startBeat + (c * cycleBeats);
                    const strong = (usul.strong && usul.strong.length > 0) ? usul.strong : [0];
                    for (let k = 0; k < strong.length; ++k) {
                        if (k > 0 && rng.unit() < 0.35) continue;
                        const pos = strong[k];
                        const at = barStart + (pos / 4.0);
                        const noteDur = Math.min(1.0, 0.75);
                        addNote(0, at, noteDur, 0.75);
                    }
                }
                break;
        }
        return out;
    }

    const GROOVE_KIND = { ORCHESTRA: 'orchestra', KUDUM_BENDIR: 'kudum_bendir', FASIL: 'fasil', BARE: 'bare' };

    const GROOVE_OPTIONS = [
        { id: GROOVE_KIND.ORCHESTRA, name: 'Zengin Vurmalı Orkestrası', why: 'Kudüm, Bendir, Kâ, Tek ve Zillerin poliritmik ve dengeli harmanı.' },
        { id: GROOVE_KIND.KUDUM_BENDIR, name: 'Klasik Kudüm & Bendir Grubu', why: 'Ağırbaşlı Mevlevi ve Sanat Musikisi usul icrası. Derin bendirler ve tiz kudümler.' },
        { id: GROOVE_KIND.FASIL, name: 'Fasıl & Def Topluluğu', why: 'Canlı, neşeli zil ve açık tek vuruşlarıyla akıcı ritim dokusu.' },
        { id: GROOVE_KIND.BARE, name: 'Sade Geleneksel Usul', why: 'Sadece ana Düm ve Tek vuruşlarını içeren yalın usul iskeleti.' }
    ];

    function generateUsulDrums(options = {}) {
        const usul = typeof options.usul === 'string' ? findUsul(options.usul) : (options.usul || findUsul('sofyan'));
        const groove = options.groove || GROOVE_KIND.ORCHESTRA;
        const startBeat = options.startBeat ?? 0.0;
        const cycles = Math.max(1, options.cycles ?? 4);
        const density = Math.max(0.1, Math.min(1.0, options.density ?? 0.65));
        const useBendir = options.useBendir !== undefined ? options.useBendir : true;
        const useKudum  = options.useKudum !== undefined ? options.useKudum : true;
        const useKa     = options.useKa !== undefined ? options.useKa : true;
        const useZil    = options.useZil !== undefined ? options.useZil : true;
        const seed      = options.seed ?? 1;

        const rng = new XorShiftRng(seed);
        const out = [];
        const cycle16 = usul.cycleSixteenths || 16;
        const cycleBeats = cycle16 / 4.0;

        function hit(note, at, vel, strokeName) {
            out.push({ pitch: note, detuneCents: 0, startBeat: at, lengthBeats: 0.25, velocity: vel, stroke: strokeName });
        }

        for (let c = 0; c < cycles; ++c) {
            const barStart = startBeat + (c * cycleBeats);
            for (let pos = 0; pos < cycle16; ++pos) {
                const at = barStart + (pos / 4.0);
                const isStrong = (usul.strong && usul.strong.includes(pos));
                const isBarOnset = (pos === 0);

                if (isBarOnset) {
                    // Ana Düm (36)
                    hit(36, at, 1.0, 'Düm');
                    // Derin Bendir desteği (46)
                    if (useBendir && (groove === GROOVE_KIND.ORCHESTRA || groove === GROOVE_KIND.KUDUM_BENDIR)) {
                        hit(46, at, 0.85, 'Bendir');
                    }
                    continue;
                }

                if (isStrong) {
                    // Diğer kuvvetli vuruşlar
                    hit(36, at, 0.88, 'Düm');
                    if (useBendir && rng.unit() < density * 0.7) {
                        hit(46, at, 0.75, 'Bendir');
                    }
                } else {
                    // Ara vuruşlar: Tek (38), Kudüm (44), Kâ (40), Zil (42)
                    const isDivision4 = (pos % 4 === 0);
                    const isDivision2 = (pos % 2 === 0);

                    if (isDivision4) {
                        // Ana ara vuruş
                        if (useKudum && (groove === GROOVE_KIND.ORCHESTRA || groove === GROOVE_KIND.KUDUM_BENDIR) && rng.unit() < 0.6) {
                            hit(44, at, 0.78, 'Kudüm');
                        } else {
                            hit(38, at, 0.75, 'Tek');
                        }
                    } else if (isDivision2 && rng.unit() < density) {
                        // 8'lik ara bölüntüler
                        if (useKa && rng.unit() < 0.45) {
                            hit(40, at, 0.65, 'Kâ');
                        } else if (useKudum && rng.unit() < 0.5) {
                            hit(44, at, 0.70, 'Kudüm');
                        } else {
                            hit(38, at, 0.68, 'Tek');
                        }
                    }

                    // Ziller (42)
                    if (useZil && groove !== GROOVE_KIND.BARE && isDivision2 && rng.unit() < (density * 0.85)) {
                        hit(42, at, 0.45 * (0.8 + rng.unit() * 0.4), 'Te-ke');
                    }
                }
            }
        }
        return out;
    }

    // ============================================================================
    // 7. KARPLUS-STRONG PLUCKED STRING SYNTHESIS (UD, TANBUR, KANUN) & AUDIO
    // ============================================================================
    function synthesizeKarplusPluck(ctx, freq, duration, type = 'ud') {
        const sr = ctx.sampleRate || 44100;
        const len = Math.max(1024, Math.floor(sr * Math.min(2.5, duration + 0.3)));
        const buffer = ctx.createBuffer(1, len, sr);
        const data = buffer.getChannelData(0);

        let brightness = 0.38;
        let feedback = 0.985;
        let detuneRatio = 1.0008; // Çift tel unison mikro-chorus (+1.4 sent)

        if (type === 'tanbur') {
            brightness = 0.80;
            feedback = 0.993; // Long steel wire sustain
            detuneRatio = 1.0012;
        } else if (type === 'kanun') {
            // KANUN: Bright silver ring plectrum ("fisko"), crisp high treble, triple unison courses
            brightness = 0.88;
            feedback = 0.988; // Sparkling sustain
            detuneRatio = 1.0010;
        } else if (type === 'bass_plain' || type === 'bass') {
            // AKUSTİK BAS / ÇELLO: Deep warm wooden finger pluck (gut/nylon core)
            brightness = 0.22;
            feedback = 0.988;
            detuneRatio = 1.0004;
        } else {
            // UD (Oud): Soft eagle-quill (risha) attack, warm nylon courses
            brightness = 0.38;
            feedback = 0.985;
            detuneRatio = 1.0008;
        }

        const p1 = Math.max(2, Math.round(sr / freq));
        const p2 = Math.max(2, Math.round(sr / (freq * detuneRatio)));
        const d1 = new Float32Array(p1);
        const d2 = new Float32Array(p2);

        // Noise burst excitation through lowpass filter
        let n1 = 0, n2 = 0;
        for (let i = 0; i < p1; i++) {
            const white = (Math.random() * 2 - 1);
            n1 = (1 - brightness) * n1 + brightness * white;
            d1[i] = n1;
        }
        for (let i = 0; i < p2; i++) {
            const white = (Math.random() * 2 - 1);
            n2 = (1 - brightness) * n2 + brightness * white;
            d2[i] = n2;
        }

        let prev1 = 0, prev2 = 0;
        let idx1 = 0, idx2 = 0;

        for (let i = 0; i < len; i++) {
            const cur1 = d1[idx1];
            const cur2 = d2[idx2];

            // Averaging lowpass filter in the string feedback loop
            d1[idx1] = (cur1 + prev1) * 0.5 * feedback;
            d2[idx2] = (cur2 + prev2) * 0.5 * feedback;
            prev1 = cur1;
            prev2 = cur2;

            data[i] = (cur1 + cur2) * 0.5;
            idx1 = (idx1 + 1) % p1;
            idx2 = (idx2 + 1) % p2;
        }

        return buffer;
    }

    class DrumSynth {
        constructor(audioCtx, dest) {
            this.ctx = audioCtx;
            this.dest = dest;
        }

        trigger(midiNote, time, vel = 0.8) {
            switch (midiNote) {
                case 36: this.playDum(time, vel); break;
                case 38: this.playTek(time, vel); break;
                case 40: this.playKa(time, vel); break;
                case 42: this.playZil(time, vel); break;
                case 44: this.playKudum(time, vel); break;
                case 46: this.playBendir(time, vel); break;
                default:
                    if (midiNote <= 37) this.playDum(time, vel);
                    else if (midiNote <= 39) this.playTek(time, vel);
                    else if (midiNote <= 41) this.playKa(time, vel);
                    else this.playZil(time, vel);
                    break;
            }
        }

        playDum(time, vel) {
            // BENDİR / KUDÜM DÜM: Derin ahşap tekne + keçi derisi el darbesi
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(85 * (1 + vel * 0.1), time);
            osc.frequency.exponentialRampToValueAtTime(52, time + 0.12);

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(115, time);
            osc2.frequency.exponentialRampToValueAtTime(70, time + 0.08);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, time);
            filter.frequency.exponentialRampToValueAtTime(140, time + 0.2);

            gain.gain.setValueAtTime(vel * 0.95, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

            // Palm skin transient click
            this.playSkinNoise(time, 0.02, 380, vel * 0.4);

            osc.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(this.dest);

            osc.start(time);
            osc2.start(time);
            osc.stop(time + 0.5);
            osc2.stop(time + 0.5);
        }

        playTek(time, vel) {
            // AÇIK PARMAK TEK: Keskin deri kenarı tınlaması
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(280 * (1 + vel * 0.15), time);
            osc.frequency.exponentialRampToValueAtTime(175, time + 0.06);

            filter.type = 'bandpass';
            filter.frequency.value = 450;
            filter.Q.value = 2.0;

            gain.gain.setValueAtTime(vel * 0.85, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

            this.playSkinNoise(time, 0.03, 1400, vel * 0.55);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.dest);

            osc.start(time);
            osc.stop(time + 0.22);
        }

        playKa(time, vel) {
            // KAPALI TOK KÂ: Boğuk el içi kapama
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, time);
            osc.frequency.exponentialRampToValueAtTime(75, time + 0.03);

            gain.gain.setValueAtTime(vel * 0.7, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

            this.playSkinNoise(time, 0.015, 600, vel * 0.6);

            osc.connect(gain);
            gain.connect(this.dest);

            osc.start(time);
            osc.stop(time + 0.10);
        }

        playZil(time, vel) {
            // ZİL / ÇALPARA: Bronz parmak zilleri çınlaması
            const bufLen = Math.floor(this.ctx.sampleRate * 0.15);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; ++i) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.28));
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buf;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 5200;
            filter.Q.value = 3.5;

            const gain = this.ctx.createGain();
            gain.gain.value = vel * 0.5;

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.dest);

            source.start(time);
        }

        playKudum(time, vel) {
            // KUDÜM ZAHME: Sert tokmak darbesi ve bakır kase rezonansı
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(420, time);
            osc.frequency.exponentialRampToValueAtTime(260, time + 0.06);

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(650, time);
            osc2.frequency.exponentialRampToValueAtTime(380, time + 0.04);

            gain.gain.setValueAtTime(vel * 0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);

            this.playSkinNoise(time, 0.02, 2200, vel * 0.5);

            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(this.dest);

            osc.start(time);
            osc2.start(time);
            osc.stop(time + 0.26);
            osc2.stop(time + 0.26);
        }

        playBendir(time, vel) {
            // BÜYÜK BENDİR: Titreşen derin kasnak ve geniş deri rezonansı
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(75, time);
            osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);

            gain.gain.setValueAtTime(vel * 0.95, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.65);

            this.playSkinNoise(time, 0.04, 280, vel * 0.45);

            osc.connect(gain);
            gain.connect(this.dest);

            osc.start(time);
            osc.stop(time + 0.7);
        }

        playSkinNoise(time, dur, filterFreq, vel) {
            const bufLen = Math.floor(this.ctx.sampleRate * dur);
            const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; ++i) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.4));
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buf;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = filterFreq;
            filter.Q.value = 1.8;

            const gain = this.ctx.createGain();
            gain.gain.value = vel;

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.dest);

            source.start(time);
        }
    }

    class SynthVoice {
        constructor(audioCtx, dest) {
            this.ctx = audioCtx;
            this.dest = dest;
        }

        static midiToFreq(midiNote, detuneCents = 0) {
            return 440.0 * Math.pow(2.0, (midiNote - 69) / 12.0) * Math.pow(2.0, detuneCents / 1200.0);
        }

        playNote(midiNote, detuneCents, startTime, duration, velocity = 0.8, inst = 'ney', ornament = null) {
            const freq = SynthVoice.midiToFreq(midiNote, detuneCents);
            const vel = Math.max(0.05, Math.min(1.0, velocity));
            const dur = Math.max(0.05, duration);

            if (ornament === 'grace') {
                const graceFreq = freq * Math.pow(2, 23 / 1200);
                this.playAcousticVoice(graceFreq, startTime, 0.08, vel * 0.5, inst, null);
                startTime += 0.045;
            }

            this.playAcousticVoice(freq, startTime, dur, vel, inst, ornament);
        }

        playAcousticVoice(freq, startTime, dur, vel, inst, ornament) {
            if (inst === 'ud' || inst === 'tanbur' || inst === 'kanun' || inst === 'bass_plain') {
                // ==========================================================
                // REAL ACOUSTIC PLUCKED STRING (KARPLUS-STRONG MODEL)
                // ==========================================================
                const buf = synthesizeKarplusPluck(this.ctx, freq, dur, inst);
                const source = this.ctx.createBufferSource();
                source.buffer = buf;

                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();

                if (inst === 'ud') {
                    // Ud wooden bowl formant filter (warm body boost around 240Hz & 650Hz)
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(Math.min(3600, freq * 4.5), startTime);
                    filter.Q.value = 1.0;
                    gain.gain.setValueAtTime(vel * 1.0, startTime);
                } else if (inst === 'tanbur') {
                    filter.type = 'peaking';
                    filter.frequency.setValueAtTime(Math.min(6000, freq * 3.5), startTime);
                    filter.gain.value = 4.0;
                    filter.Q.value = 2.2;
                    gain.gain.setValueAtTime(vel * 0.95, startTime);
                } else if (inst === 'kanun') {
                    // Kanun: Brilliant treble boost and higher gain (+4dB) so it is clear and bright
                    filter.type = 'highshelf';
                    filter.frequency.setValueAtTime(2400, startTime);
                    filter.gain.value = 6.0;
                    gain.gain.setValueAtTime(vel * 1.45, startTime);
                } else if (inst === 'bass_plain') {
                    // Akustik Çello / Bas: Derin ahşap göğüs kafesi rezonansı
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(Math.min(800, freq * 3.5), startTime);
                    filter.Q.value = 1.2;
                    gain.gain.setValueAtTime(vel * 1.2, startTime);
                }

                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.3);

                source.connect(filter);
                filter.connect(gain);
                gain.connect(this.dest);

                source.start(startTime);
                source.stop(startTime + dur + 0.35);

            } else if (inst === 'drone') {
                // OTANTİK DEM SESİ (Ney & Tanbûr Kaba Dem Akustiği - Sıcak, dolgun, çınlamasız)
                const osc = this.ctx.createOscillator();
                const osc2 = this.ctx.createOscillator();
                const filter = this.ctx.createBiquadFilter();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc2.type = 'sine';

                osc.frequency.setValueAtTime(freq, startTime);
                // Sub-octave warm body tone with gentle detune for lush room chorus
                osc2.frequency.setValueAtTime(freq * 0.5 + 0.35, startTime);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(320, startTime);
                filter.Q.value = 0.8;

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.linearRampToValueAtTime(vel * 0.35, startTime + 0.12);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.35);

                osc.connect(filter);
                osc2.connect(filter);
                filter.connect(gain);
                gain.connect(this.dest);

                osc.start(startTime);
                osc2.start(startTime);
                osc.stop(startTime + dur + 0.4);
                osc2.stop(startTime + dur + 0.4);

            } else if (inst === 'bass_808') {
                // 808 Sub Bass
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.linearRampToValueAtTime(vel * 0.55, startTime + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.1);

                osc.connect(gain);
                gain.connect(this.dest);

                osc.start(startTime);
                osc.stop(startTime + dur + 0.2);

            } else {
                // ==========================================================
                // NEY: Mistik nefesli, hava hışırtısı ve kamış rezonansı
                // ==========================================================
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                if (ornament === 'slide') {
                    osc.frequency.setValueAtTime(freq * Math.pow(2, -200 / 1200), startTime);
                    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.12);
                } else {
                    osc.frequency.setValueAtTime(freq, startTime);
                }

                if (ornament === 'mordent') {
                    osc.frequency.setValueAtTime(freq, startTime);
                    osc.frequency.setValueAtTime(freq * Math.pow(2, 23 / 1200), startTime + 0.06);
                    osc.frequency.setValueAtTime(freq, startTime + 0.12);
                }

                if (ornament === 'turn') {
                    osc.frequency.setValueAtTime(freq * Math.pow(2, 23 / 1200), startTime);
                    osc.frequency.setValueAtTime(freq, startTime + 0.04);
                    osc.frequency.setValueAtTime(freq * Math.pow(2, -23 / 1200), startTime + 0.08);
                    osc.frequency.setValueAtTime(freq, startTime + 0.12);
                }

                osc.type = 'sine';
                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.linearRampToValueAtTime(vel * 0.38, startTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.08);

                osc.connect(gain);
                gain.connect(this.dest);

                osc.start(startTime);
                osc.stop(startTime + dur + 0.2);
            }
        }
    }

    class AudioEngine {
        constructor() {
            this.ctx = null;
            this.bpm = 100.0;
            this.isPlaying = false;
            this.isLooping = true;
            this.currentBeat = 0.0;
            this.totalBeats = 16.0;
            this.loopStartBeat = 0.0;
            this.loopEndBeat = 16.0;

            this.melodyInstrument = 'ney';
            this.chordInstrument = 'drone';
            this.bassInstrument = 'bass_plain';
            this.reverbPreset = 'cami';

            this.song = { melody: [], chords: [], bass: [], drums: [] };
            this.timerId = null;
            this.lastScheduleBeat = 0.0;
            this.startTimeAudio = 0.0;
            this.startBeatOffset = 0.0;
            this.onPlayheadUpdate = null;
            this.onStateChange = null;
        }

        async init() {
            if (this.ctx && this.ctx.state !== 'closed') {
                if (this.ctx.state === 'suspended') await this.ctx.resume();
                return;
            }
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.85;

            this.reverbNode = this.ctx.createConvolver();
            this.reverbGain = this.ctx.createGain();
            this.reverbGain.gain.value = 0.55;
            this.setupReverbImpulse(3.6);

            this.masterGain.connect(this.ctx.destination);
            this.reverbNode.connect(this.reverbGain);
            this.reverbGain.connect(this.masterGain);

            this.melodyGain = this.ctx.createGain();
            this.chordGain = this.ctx.createGain();
            this.bassGain = this.ctx.createGain();
            this.drumGain = this.ctx.createGain();

            this.melodyGain.connect(this.masterGain);
            this.melodyGain.connect(this.reverbNode);

            this.chordGain.connect(this.masterGain);
            this.chordGain.connect(this.reverbNode);

            this.bassGain.connect(this.masterGain);
            this.drumGain.connect(this.masterGain);

            this.melodySynth = new SynthVoice(this.ctx, this.melodyGain);
            this.chordSynth  = new SynthVoice(this.ctx, this.chordGain);
            this.bassSynth   = new SynthVoice(this.ctx, this.bassGain);
            this.drumSynth   = new DrumSynth(this.ctx, this.drumGain);
        }

        setupReverbImpulse(decaySec = 3.6) {
            const length = Math.floor(this.ctx.sampleRate * decaySec);
            const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
            for (let ch = 0; ch < 2; ++ch) {
                const d = impulse.getChannelData(ch);
                for (let i = 0; i < length; ++i) {
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i / length), 2.2);
                }
            }
            this.reverbNode.buffer = impulse;
        }

        setReverbPreset(preset) {
            this.reverbPreset = preset;
            if (!this.ctx) return;
            if (preset === 'dry') {
                this.reverbGain.gain.value = 0.0;
            } else if (preset === 'mesk') {
                this.setupReverbImpulse(1.5);
                this.reverbGain.gain.value = 0.35;
            } else {
                this.setupReverbImpulse(3.8);
                this.reverbGain.gain.value = 0.55;
            }
        }

        setBpm(b) { this.bpm = Math.max(30, Math.min(300, b)); }

        setChannelVolume(ch, v) {
            if (!this.ctx) return;
            const val = Math.max(0, Math.min(2.0, v));
            if (ch === 'melody') this.melodyGain.gain.value = val;
            if (ch === 'chords') this.chordGain.gain.value = val;
            if (ch === 'bass')   this.bassGain.gain.value = val;
            if (ch === 'drums')  this.drumGain.gain.value = val;
            if (ch === 'master') this.masterGain.gain.value = val;
        }

        beatToTime(beat) {
            return this.startTimeAudio + ((beat - this.startBeatOffset) * (60.0 / this.bpm));
        }

        timeToBeat(time) {
            return this.startBeatOffset + ((time - this.startTimeAudio) / (60.0 / this.bpm));
        }

        async play() {
            await this.init();
            if (this.isPlaying) return;
            this.isPlaying = true;
            this.startTimeAudio = this.ctx.currentTime;
            this.startBeatOffset = this.currentBeat;
            this.lastScheduleBeat = this.currentBeat;
            this.timerId = setInterval(() => this.scheduleLoop(), 25);
            if (this.onStateChange) this.onStateChange(true);
        }

        pause() {
            if (!this.isPlaying) return;
            this.isPlaying = false;
            if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
            if (this.onStateChange) this.onStateChange(false);
        }

        togglePlay() {
            if (this.isPlaying) this.pause();
            else this.play();
        }

        stop() {
            this.pause();
            this.currentBeat = this.loopStartBeat;
            if (this.onPlayheadUpdate) this.onPlayheadUpdate(this.currentBeat);
        }

        seek(beat) {
            const wasPlaying = this.isPlaying;
            if (wasPlaying) this.pause();
            this.currentBeat = Math.max(0, Math.min(this.totalBeats, beat));
            if (this.onPlayheadUpdate) this.onPlayheadUpdate(this.currentBeat);
            if (wasPlaying) this.play();
        }

        setSongData(d) {
            this.song = d;
            if (d.totalBeats) {
                this.totalBeats = d.totalBeats;
                this.loopEndBeat = d.totalBeats;
            }
        }

        scheduleLoop() {
            if (!this.isPlaying || !this.ctx) return;
            const curTime = this.ctx.currentTime;
            const curBeat = this.timeToBeat(curTime);

            if (this.isLooping && curBeat >= this.loopEndBeat) {
                this.startBeatOffset = this.loopStartBeat;
                this.startTimeAudio = curTime;
                this.lastScheduleBeat = this.loopStartBeat;
            }

            this.currentBeat = Math.max(0, this.timeToBeat(curTime));
            if (this.onPlayheadUpdate) this.onPlayheadUpdate(this.currentBeat);

            const secPerBeat = 60.0 / this.bpm;
            const fromBeat = this.lastScheduleBeat;
            const toBeat = this.currentBeat + (0.1 / secPerBeat);

            for (const note of (this.song.melody || [])) {
                if (note.startBeat >= fromBeat - 1e-4 && note.startBeat < toBeat) {
                    this.melodySynth.playNote(note.pitch, note.detuneCents || 0, this.beatToTime(note.startBeat), note.lengthBeats * secPerBeat, note.velocity || 0.8, this.melodyInstrument, note.ornament);
                }
            }

            for (const chord of (this.song.chords || [])) {
                if (chord.startBeat >= fromBeat - 1e-4 && chord.startBeat < toBeat) {
                    const durak = chord.durakMidiNote || 62;
                    for (const comma of (chord.commas || [])) {
                        const p = place(durak, comma);
                        this.chordSynth.playNote(p.note, p.detuneCents, this.beatToTime(chord.startBeat), chord.lengthBeats * secPerBeat, 0.75, this.chordInstrument);
                    }
                }
            }

            for (const note of (this.song.bass || [])) {
                if (note.startBeat >= fromBeat - 1e-4 && note.startBeat < toBeat) {
                    this.bassSynth.playNote(note.pitch, note.detuneCents || 0, this.beatToTime(note.startBeat), note.lengthBeats * secPerBeat, note.velocity || 0.7, this.bassInstrument);
                }
            }

            for (const hit of (this.song.drums || [])) {
                if (hit.startBeat >= fromBeat - 1e-4 && hit.startBeat < toBeat) {
                    this.drumSynth.trigger(hit.pitch, this.beatToTime(hit.startBeat), hit.velocity || 0.8);
                }
            }

            this.lastScheduleBeat = toBeat;
        }

        async auditionNote(note, detune = 0, inst = null, ornament = null) {
            await this.init();
            this.melodySynth.playNote(note, detune, this.ctx.currentTime, 0.7, 0.85, inst || this.melodyInstrument, ornament);
        }

        async auditionDrum(note, vel = 0.85) {
            await this.init();
            this.drumSynth.trigger(note, this.ctx.currentTime, vel);
        }

        async auditionChord(commas, durakMidi = 62) {
            await this.init();
            for (const c of commas) {
                const p = place(durakMidi, c);
                this.chordSynth.playNote(p.note, p.detuneCents, this.ctx.currentTime, 1.2, 0.75, this.chordInstrument);
            }
        }
    }

    // ============================================================================
    // 8. HISTORY MANAGER
    // ============================================================================
    class HistoryManager {
        constructor(maxEntries = 30) {
            this.undoStack = [];
            this.redoStack = [];
            this.maxEntries = maxEntries;
        }

        pushState(songData) {
            this.undoStack.push(JSON.stringify(songData));
            if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
            this.redoStack = [];
        }

        canUndo() { return this.undoStack.length > 1; }
        canRedo() { return this.redoStack.length > 0; }

        undo(currentSongData) {
            if (!this.canUndo()) return null;
            this.redoStack.push(JSON.stringify(currentSongData));
            this.undoStack.pop();
            const prev = this.undoStack[this.undoStack.length - 1];
            return JSON.parse(prev);
        }

        redo(currentSongData) {
            if (!this.canRedo()) return null;
            const next = this.redoStack.pop();
            this.undoStack.push(next);
            return JSON.parse(next);
        }
    }

    // ============================================================================
    // 9. MIDI EXPORT
    // ============================================================================
    function downloadMidi(songData, bpm, usul, fileName = 'makam_proje.mid') {
        const PPQ = 480;
        function writeVLQ(value) {
            const bytes = [];
            let buffer = value & 0x7F;
            while ((value >>= 7) > 0) { buffer <<= 8; buffer |= ((value & 0x7F) | 0x80); }
            while (true) { bytes.push(buffer & 0xFF); if (buffer & 0x80) buffer >>= 8; else break; }
            return bytes;
        }

        function centsToPB(cents) {
            const clamped = Math.max(-200, Math.min(200, cents));
            const raw = Math.round(8192 + ((clamped / 200) * 8191));
            const val = Math.max(0, Math.min(16383, raw));
            return { lsb: val & 0x7F, msb: (val >> 7) & 0x7F };
        }

        function buildTrack(events, channel) {
            const raw = [];
            for (const ev of events) {
                const sTick = Math.round(ev.startBeat * PPQ);
                const dTick = Math.max(1, Math.round(ev.lengthBeats * PPQ));
                const eTick = sTick + dTick;
                const vel = Math.max(1, Math.min(127, Math.round((ev.velocity || 0.8) * 127)));

                if (channel !== 9 && ev.detuneCents && Math.abs(ev.detuneCents) > 0.01) {
                    const pb = centsToPB(ev.detuneCents);
                    raw.push({ tick: Math.max(0, sTick - 1), priority: 1, bytes: [0xE0 | channel, pb.lsb, pb.msb] });
                }
                raw.push({ tick: sTick, priority: 2, bytes: [0x90 | channel, ev.pitch & 0x7F, vel] });
                raw.push({ tick: eTick, priority: 3, bytes: [0x80 | channel, ev.pitch & 0x7F, 0] });
            }
            raw.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.priority - b.priority);
            const last = raw.length > 0 ? raw[raw.length - 1].tick : 0;
            raw.push({ tick: last + PPQ, priority: 9, bytes: [0xFF, 0x2F, 0x00] });

            const trackBytes = [];
            let curTick = 0;
            for (const ev of raw) {
                trackBytes.push(...writeVLQ(Math.max(0, ev.tick - curTick)));
                curTick = ev.tick;
                trackBytes.push(...ev.bytes);
            }
            const len = trackBytes.length;
            return [0x4D, 0x54, 0x72, 0x6B, (len >> 24) & 0xFF, (len >> 16) & 0xFF, (len >> 8) & 0xFF, len & 0xFF, ...trackBytes];
        }

        const microsec = Math.round(60000000 / bpm);
        const tempoTrackBytes = [0x00, 0xFF, 0x51, 0x03, (microsec >> 16) & 0xFF, (microsec >> 8) & 0xFF, microsec & 0xFF, ...writeVLQ(PPQ), 0xFF, 0x2F, 0x00];
        const tLen = tempoTrackBytes.length;
        const tempoTrack = [0x4D, 0x54, 0x72, 0x6B, (tLen >> 24) & 0xFF, (tLen >> 16) & 0xFF, (tLen >> 8) & 0xFF, tLen & 0xFF, ...tempoTrackBytes];

        const chordNotes = [];
        for (const ch of (songData.chords || [])) {
            const durak = ch.durakMidiNote || 62;
            for (const comma of (ch.commas || [])) {
                const p = place(durak, comma);
                chordNotes.push({ pitch: p.note, detuneCents: p.detuneCents, startBeat: ch.startBeat, lengthBeats: ch.lengthBeats, velocity: 0.72 });
            }
        }

        const t1 = buildTrack(songData.melody || [], 0);
        const t2 = buildTrack(chordNotes, 1);
        const t3 = buildTrack(songData.bass || [], 2);
        const t4 = buildTrack(songData.drums || [], 9);

        const header = [0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x00, 0x05, (PPQ >> 8) & 0xFF, PPQ & 0xFF];
        const blob = new Blob([new Uint8Array([...header, ...tempoTrack, ...t1, ...t2, ...t3, ...t4])], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ============================================================================
    // 10. INTERACTIVE PIANO ROLL & DRUM LANES
    // ============================================================================
    class PianoRoll {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.song = options.song || { melody: [], chords: [], bass: [], drums: [] };
            this.makam = options.makam || null;
            this.usul = options.usul || null;
            this.durakMidi = options.durakMidiNote || 62;
            this.currentLayer = 'melody';
            this.totalBeats = 16.0;
            this.playheadBeat = 0.0;

            this.pixelsPerBeat = 65.0;
            this.rowHeight = 22.0;
            this.headerHeight = 28.0;
            this.updateKeyboardWidth();
            this.scrollX = 0;
            this.scrollY = 0;
            this.minMidi = 48;
            this.maxMidi = 84;

            this.selectedNotes = new Set();
            this.hoveredNote = null;
            this.isDragging = false;
            this.isResizing = false;
            this.isRightErasing = false;
            this.isMarqueeSelecting = false;
            this.marqueeBox = { x1: 0, y1: 0, x2: 0, y2: 0 };
            this.dragStart = { x: 0, y: 0, beat: 0, pitch: 0 };

            this.onAuditionNote = null;
            this.onAuditionDrum = null;
            this.onSeek = null;
            this.onNoteChanged = null;
            this.onSelectionChanged = null;

            this.setupEvents();
            this.resize();
        }

        updateKeyboardWidth() {
            const isMobile = (window.innerWidth <= 768);
            if (this.currentLayer === 'drums') {
                this.keyboardWidth = isMobile ? 74 : 110;
            } else {
                this.keyboardWidth = isMobile ? 42 : 54;
            }
        }

        setMakam(m, d) { this.makam = m; this.durakMidi = d || this.durakMidi; this.render(); }
        setUsul(u) { this.usul = u; this.render(); }
        setLayer(l) {
            this.currentLayer = l;
            this.updateKeyboardWidth();
            this.selectedNotes.clear();
            if (l === 'drums') {
                this.minMidi = 34;
                this.maxMidi = 48;
                this.scrollY = 0;
            } else if (l === 'bass') {
                this.minMidi = 36;
                this.maxMidi = 72;
                this.scrollY = 0;
            } else {
                this.minMidi = 48;
                this.maxMidi = 84;
                this.scrollY = 0;
            }
            this.notifySelection();
            this.render();
        }
        setPlayhead(b) { this.playheadBeat = b; this.render(); }
        setSong(s) { this.song = s; if (s.totalBeats) this.totalBeats = s.totalBeats; this.render(); }

        notifySelection() {
            if (this.onSelectionChanged) this.onSelectionChanged(this.selectedNotes);
        }

        resize() {
            const parent = this.canvas.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            const w = Math.max(300, rect.width || window.innerWidth - 420);
            const h = Math.max(200, rect.height || 380);

            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = w * dpr;
            this.canvas.height = h * dpr;
            this.canvas.style.width = `${w}px`;
            this.canvas.style.height = `${h}px`;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(dpr, dpr);
            this.render();
        }

        getActiveNotes() {
            if (this.currentLayer === 'melody') return this.song.melody || [];
            if (this.currentLayer === 'bass') return this.song.bass || [];
            if (this.currentLayer === 'drums') return this.song.drums || [];
            return [];
        }

        deleteSelectedNotes() {
            if (this.selectedNotes.size === 0) return;
            const notes = this.getActiveNotes();
            for (const n of this.selectedNotes) {
                const idx = notes.indexOf(n);
                if (idx !== -1) notes.splice(idx, 1);
            }
            this.selectedNotes.clear();
            this.notifySelection();
            if (this.onNoteChanged) this.onNoteChanged();
            this.render();
        }

        selectAll() {
            const notes = this.getActiveNotes();
            this.selectedNotes.clear();
            notes.forEach(n => this.selectedNotes.add(n));
            this.notifySelection();
            this.render();
        }

        clearActiveLayer() {
            if (this.currentLayer === 'melody') this.song.melody = [];
            if (this.currentLayer === 'bass') this.song.bass = [];
            if (this.currentLayer === 'drums') this.song.drums = [];
            this.selectedNotes.clear();
            this.notifySelection();
            if (this.onNoteChanged) this.onNoteChanged();
            this.render();
        }

        beatToX(b) { return this.keyboardWidth + (b * this.pixelsPerBeat) - this.scrollX; }
        xToBeat(x) { return (x - this.keyboardWidth + this.scrollX) / this.pixelsPerBeat; }
        pitchToY(p) { return this.headerHeight + ((this.maxMidi - p) * this.rowHeight) - this.scrollY; }
        yToPitch(y) { return this.maxMidi - Math.floor((y - this.headerHeight + this.scrollY) / this.rowHeight); }

        setupEvents() {
            window.addEventListener('resize', () => this.resize());

            this.canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });

            this.toolMode = 'draw'; // 'draw' | 'erase' | 'select'

            window.addEventListener('keydown', (e) => {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                        this.deleteSelectedNotes();
                    } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        this.selectAll();
                    }
                }
            });

            this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            window.addEventListener('mouseup', () => this.onMouseUp());
            this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

            // Advanced Mobile Touch Gestures & Panning Engine
            this.touchState = {
                isTwoFinger: false,
                dist0: 0,
                center0: { x: 0, y: 0 },
                scroll0: { x: 0, y: 0 },
                ppb0: 60,
                start: { x: 0, y: 0, clientX: 0, clientY: 0, scrollX: 0, scrollY: 0, time: 0 },
                isPanning: false,
                potentialPan: false,
                isNoteAction: false
            };

            this.canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    this.touchState.isTwoFinger = true;
                    this.touchState.potentialPan = false;
                    this.touchState.isPanning = false;
                    this.isDragging = false;
                    this.isResizing = false;

                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    this.touchState.dist0 = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                    this.touchState.center0 = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
                    this.touchState.scroll0 = { x: this.scrollX, y: this.scrollY };
                    this.touchState.ppb0 = this.pixelsPerBeat;
                    return;
                }

                if (e.touches.length === 1) {
                    const t = e.touches[0];
                    const rect = this.canvas.getBoundingClientRect();
                    const x = t.clientX - rect.left;
                    const y = t.clientY - rect.top;

                    this.touchState.isTwoFinger = false;
                    this.touchState.start = {
                        clientX: t.clientX,
                        clientY: t.clientY,
                        canvasX: x,
                        canvasY: y,
                        scrollX: this.scrollX,
                        scrollY: this.scrollY,
                        time: Date.now()
                    };

                    // Pan tool mode -> immediate direct panning
                    if (this.toolMode === 'pan') {
                        e.preventDefault();
                        this.touchState.isPanning = true;
                        this.touchState.potentialPan = false;
                        return;
                    }

                    // Keyboard column drag (left) or Ruler header drag (top) -> direct scroll
                    if (x < this.keyboardWidth || y < this.headerHeight) {
                        e.preventDefault();
                        this.touchState.isPanning = true;
                        this.touchState.potentialPan = false;
                        // Audition note if on keyboard
                        if (x < this.keyboardWidth && y >= this.headerHeight) {
                            const pitch = this.yToPitch(y);
                            if (this.currentLayer === 'drums') {
                                if (this.onAuditionDrum) this.onAuditionDrum(getClosestDrumPitch(pitch));
                            } else if (this.onAuditionNote) {
                                this.onAuditionNote(pitch, 0);
                            }
                        } else if (y < this.headerHeight && x >= this.keyboardWidth) {
                            // Tap on measure header selects the measure
                            const clickBeat = Math.max(0, this.xToBeat(x));
                            const cycleBeats = getUsulBeats(this.usul);
                            const measureIndex = Math.floor(clickBeat / cycleBeats);
                            const mStart = measureIndex * cycleBeats;
                            const mEnd = mStart + cycleBeats;
                            this.selectedNotes.clear();
                            for (const n of this.getActiveNotes()) {
                                if (n.startBeat >= mStart - 1e-4 && n.startBeat < mEnd - 1e-4) {
                                    this.selectedNotes.add(n);
                                }
                            }
                            this.notifySelection();
                            if (this.onSeek) this.onSeek(mStart);
                            this.render();
                        }
                        return;
                    }

                    // If touching an existing note -> start note drag / erase
                    const note = this.findNoteAt(x, y);
                    if (note || this.toolMode === 'erase') {
                        this.touchState.isNoteAction = true;
                        this.touchState.potentialPan = false;
                        this.touchState.isPanning = false;
                        const mouseEvent = {
                            clientX: t.clientX,
                            clientY: t.clientY,
                            button: (this.toolMode === 'erase') ? 2 : 0,
                            shiftKey: false,
                            preventDefault: () => {}
                        };
                        this.onMouseDown(mouseEvent);
                    } else {
                        // Empty grid space: allow drag-to-pan or tap-to-draw
                        this.touchState.isNoteAction = false;
                        this.touchState.potentialPan = true;
                        this.touchState.isPanning = false;
                    }
                }
            }, { passive: false });

            this.canvas.addEventListener('touchmove', (e) => {
                if (this.touchState.isTwoFinger && e.touches.length === 2) {
                    e.preventDefault();
                    const t1 = e.touches[0];
                    const t2 = e.touches[1];
                    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                    const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

                    // Pinch zoom
                    if (this.touchState.dist0 > 10) {
                        const scale = dist / this.touchState.dist0;
                        this.pixelsPerBeat = Math.max(25, Math.min(180, this.touchState.ppb0 * scale));
                    }

                    // 2-Finger Pan
                    const dx = center.x - this.touchState.center0.x;
                    const dy = center.y - this.touchState.center0.y;
                    this.scrollX = Math.max(0, this.touchState.scroll0.x - dx);
                    this.scrollY = Math.max(0, this.touchState.scroll0.y - dy);
                    this.render();
                    return;
                }

                if (e.touches.length === 1) {
                    const t = e.touches[0];
                    const dx = t.clientX - this.touchState.start.clientX;
                    const dy = t.clientY - this.touchState.start.clientY;
                    const distMoved = Math.hypot(dx, dy);

                    if (this.touchState.isPanning || (this.touchState.potentialPan && distMoved > 6)) {
                        e.preventDefault();
                        this.touchState.potentialPan = false;
                        this.touchState.isPanning = true;

                        this.scrollX = Math.max(0, this.touchState.start.scrollX - dx);
                        const maxScrollY = Math.max(0, (this.maxMidi - this.minMidi + 1) * this.rowHeight - (this.canvas.clientHeight - this.headerHeight));
                        this.scrollY = Math.max(0, Math.min(maxScrollY, this.touchState.start.scrollY - dy));
                        this.render();
                        return;
                    }

                    if (this.touchState.isNoteAction) {
                        e.preventDefault();
                        this.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
                    }
                }
            }, { passive: false });

            this.canvas.addEventListener('touchend', (e) => {
                if (this.touchState.isTwoFinger) {
                    if (e.touches.length < 2) this.touchState.isTwoFinger = false;
                    return;
                }

                // If user tapped on empty grid without dragging -> place/toggle note!
                if (this.touchState.potentialPan && !this.touchState.isPanning) {
                    const mouseEvent = {
                        clientX: this.touchState.start.clientX,
                        clientY: this.touchState.start.clientY,
                        button: (this.toolMode === 'erase') ? 2 : 0,
                        shiftKey: false,
                        preventDefault: () => {}
                    };
                    this.onMouseDown(mouseEvent);
                }

                this.touchState.isPanning = false;
                this.touchState.potentialPan = false;
                this.touchState.isNoteAction = false;
                this.onMouseUp();
            });

            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.ctrlKey) {
                    this.pixelsPerBeat = Math.max(30, Math.min(180, this.pixelsPerBeat * (e.deltaY < 0 ? 1.1 : 0.9)));
                } else if (e.shiftKey) {
                    this.scrollX = Math.max(0, this.scrollX + e.deltaY);
                } else {
                    this.scrollY = Math.max(0, Math.min((this.maxMidi - this.minMidi) * this.rowHeight - 150, this.scrollY + e.deltaY));
                }
                this.render();
            }, { passive: false });
        }

        setToolMode(mode) {
            this.toolMode = mode;
        }

        deleteSelectedNotes() {
            if (this.selectedNotes.size === 0) return;
            const notes = this.getActiveNotes();
            for (const n of this.selectedNotes) {
                const idx = notes.indexOf(n);
                if (idx !== -1) notes.splice(idx, 1);
            }
            this.selectedNotes.clear();
            this.notifySelection();
            if (this.onNoteChanged) this.onNoteChanged();
            this.render();
        }

        onMouseDown(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (e.button === 2 || this.toolMode === 'erase') {
                const note = this.findNoteAt(x, y);
                if (note) {
                    const notes = this.getActiveNotes();
                    const idx = notes.indexOf(note);
                    if (idx !== -1) {
                        notes.splice(idx, 1);
                        this.selectedNotes.delete(note);
                        this.notifySelection();
                        if (this.onNoteChanged) this.onNoteChanged();
                        this.render();
                    }
                }
                this.isRightErasing = true;
                return;
            }

            if (x < this.keyboardWidth && y >= this.headerHeight) {
                const pitch = this.yToPitch(y);
                if (this.currentLayer === 'drums') {
                    const validPitch = getClosestDrumPitch(pitch);
                    if (this.onAuditionDrum) this.onAuditionDrum(validPitch);
                } else if (pitch >= this.minMidi && pitch <= this.maxMidi && this.onAuditionNote) {
                    this.onAuditionNote(pitch, 0);
                }
                return;
            }

            if (y < this.headerHeight && x >= this.keyboardWidth) {
                const clickBeat = Math.max(0, this.xToBeat(x));
                const cycleBeats = getUsulBeats(this.usul);
                const measureIndex = Math.floor(clickBeat / cycleBeats);
                const measureStartBeat = measureIndex * cycleBeats;
                const measureEndBeat = measureStartBeat + cycleBeats;

                // Select all notes in this measure on the active layer
                this.selectedNotes.clear();
                for (const n of this.getActiveNotes()) {
                    if (n.startBeat >= measureStartBeat - 1e-4 && n.startBeat < measureEndBeat - 1e-4) {
                        this.selectedNotes.add(n);
                    }
                }
                this.notifySelection();
                if (this.onSeek) this.onSeek(measureStartBeat);
                this.render();
                return;
            }

            const note = this.findNoteAt(x, y);
            if (note) {
                if (!e.shiftKey && !this.selectedNotes.has(note)) {
                    this.selectedNotes.clear();
                }
                this.selectedNotes.add(note);
                this.notifySelection();

                const noteX = this.beatToX(note.startBeat);
                const noteW = note.lengthBeats * this.pixelsPerBeat;
                this.isResizing = (x >= noteX + noteW - 10);
                this.isDragging = !this.isResizing;
                this.dragStart = { x, y, beat: note.startBeat, pitch: note.pitch };
            } else {
                if (e.shiftKey) {
                    this.isMarqueeSelecting = true;
                    this.marqueeBox = { x1: x, y1: y, x2: x, y2: y };
                } else {
                    this.selectedNotes.clear();
                    this.notifySelection();
                    const beat = Math.floor(this.xToBeat(x) * 4) / 4;
                    let pitch = this.yToPitch(y);

                    if (this.currentLayer === 'drums') {
                        pitch = getClosestDrumPitch(pitch);
                        const newHit = { pitch, detuneCents: 0, startBeat: beat, lengthBeats: 0.25, velocity: 0.85, stroke: DRUM_LANES.find(l => l.pitch === pitch)?.stroke || 'Düm' };
                        this.getActiveNotes().push(newHit);
                        this.selectedNotes.add(newHit);
                        this.notifySelection();
                        if (this.onNoteChanged) this.onNoteChanged();
                        if (this.onAuditionDrum) this.onAuditionDrum(pitch);
                    } else if (beat >= 0 && pitch >= this.minMidi && pitch <= this.maxMidi) {
                        const noteCommas = Math.round((pitch - this.durakMidi) * (53 / 12));
                        const sounding = place(this.durakMidi, noteCommas);
                        const newNote = { pitch, detuneCents: sounding.detuneCents, commas: noteCommas, startBeat: beat, lengthBeats: 0.5, velocity: 0.8, locked: false, ornament: null };
                        this.getActiveNotes().push(newNote);
                        this.selectedNotes.add(newNote);
                        this.notifySelection();
                        if (this.onNoteChanged) this.onNoteChanged();
                        if (this.onAuditionNote) this.onAuditionNote(pitch, sounding.detuneCents);
                    }
                }
            }
            this.render();
        }

        onMouseMove(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.hoveredNote = this.findNoteAt(x, y);

            if (this.isRightErasing) {
                const note = this.findNoteAt(x, y);
                if (note) {
                    const notes = this.getActiveNotes();
                    const idx = notes.indexOf(note);
                    if (idx !== -1) {
                        notes.splice(idx, 1);
                        this.selectedNotes.delete(note);
                        this.notifySelection();
                        if (this.onNoteChanged) this.onNoteChanged();
                        this.render();
                    }
                }
                return;
            }

            if (this.isMarqueeSelecting) {
                this.marqueeBox.x2 = x;
                this.marqueeBox.y2 = y;

                const minX = Math.min(this.marqueeBox.x1, this.marqueeBox.x2);
                const maxX = Math.max(this.marqueeBox.x1, this.marqueeBox.x2);
                const minY = Math.min(this.marqueeBox.y1, this.marqueeBox.y2);
                const maxY = Math.max(this.marqueeBox.y1, this.marqueeBox.y2);

                this.selectedNotes.clear();
                for (const n of this.getActiveNotes()) {
                    const nx = this.beatToX(n.startBeat);
                    const ny = this.pitchToY(n.pitch);
                    const nw = n.lengthBeats * this.pixelsPerBeat;
                    const nh = this.rowHeight;
                    if (nx + nw >= minX && nx <= maxX && ny + nh >= minY && ny <= maxY) {
                        this.selectedNotes.add(n);
                    }
                }
                this.notifySelection();
                this.render();
                return;
            }

            if (this.isResizing && this.selectedNotes.size === 1) {
                const note = Array.from(this.selectedNotes)[0];
                const curBeat = this.xToBeat(x);
                note.lengthBeats = Math.max(0.25, Math.round((curBeat - note.startBeat) * 4) / 4);
                this.render();
                return;
            }

            if (this.isDragging && this.selectedNotes.size > 0) {
                const deltaBeat = (x - this.dragStart.x) / this.pixelsPerBeat;
                const deltaPitch = Math.round((this.dragStart.y - y) / this.rowHeight);
                for (const note of this.selectedNotes) {
                    if (note.locked) continue;
                    note.startBeat = Math.max(0, Math.round((this.dragStart.beat + deltaBeat) * 4) / 4);
                    if (this.currentLayer === 'drums') {
                        note.pitch = getClosestDrumPitch(this.dragStart.pitch + deltaPitch);
                    } else {
                        const newPitch = Math.max(this.minMidi, Math.min(this.maxMidi, this.dragStart.pitch + deltaPitch));
                        note.pitch = newPitch;
                        const noteCommas = Math.round((newPitch - this.durakMidi) * (53 / 12));
                        const sounding = place(this.durakMidi, noteCommas);
                        note.commas = noteCommas;
                        note.detuneCents = sounding.detuneCents;
                    }
                }
                this.render();
            }
        }

        onMouseUp() {
            if (this.isRightErasing || this.isDragging || this.isResizing || this.isMarqueeSelecting) {
                this.isRightErasing = false;
                this.isDragging = false;
                this.isResizing = false;
                this.isMarqueeSelecting = false;
                if (this.onNoteChanged) this.onNoteChanged();
                this.render();
            }
        }

        onDoubleClick(e) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const note = this.findNoteAt(x, y);
            if (note) {
                const notes = this.getActiveNotes();
                const idx = notes.indexOf(note);
                if (idx !== -1) {
                    notes.splice(idx, 1);
                    this.selectedNotes.delete(note);
                    this.notifySelection();
                    if (this.onNoteChanged) this.onNoteChanged();
                    this.render();
                }
            }
        }

        findNoteAt(x, y) {
            const notes = this.getActiveNotes();
            for (let i = notes.length - 1; i >= 0; --i) {
                const n = notes[i];
                const nx = this.beatToX(n.startBeat);
                const ny = this.pitchToY(n.pitch);
                const nw = n.lengthBeats * this.pixelsPerBeat;
                const nh = this.rowHeight;
                if (x >= nx && x <= nx + nw && y >= ny && y <= ny + nh) return n;
            }
            return null;
        }

        render() {
            this.updateKeyboardWidth();
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            const h = this.canvas.height / (window.devicePixelRatio || 1);
            this.ctx.clearRect(0, 0, w, h);

            // Warm Parchment Canvas Background
            this.ctx.fillStyle = '#fcf9f2';
            this.ctx.fillRect(0, 0, w, h);

            const makamDegrees = this.makam ? getMakamDegrees(this.makam) : [];

            // Grid background rows
            for (let p = this.minMidi; p <= this.maxMidi; ++p) {
                const y = this.pitchToY(p);
                if (y < this.headerHeight - this.rowHeight || y > h) continue;

                if (this.currentLayer === 'drums') {
                    const isDrumLane = DRUM_LANES.some(l => l.pitch === p);
                    this.ctx.fillStyle = isDrumLane ? '#f5eedb' : '#eae1cb';
                } else {
                    const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
                    const isScale = makamDegrees.some(d => (place(this.durakMidi, d).note % 12) === (p % 12));
                    this.ctx.fillStyle = isScale ? '#ffffff' : (isBlack ? '#ede3cc' : '#f7f1df');
                }

                this.ctx.fillRect(this.keyboardWidth, y, w - this.keyboardWidth, this.rowHeight);

                this.ctx.strokeStyle = '#e2d8bd';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(this.keyboardWidth, y + this.rowHeight);
                this.ctx.lineTo(w, y + this.rowHeight);
                this.ctx.stroke();
            }

            // Usul Beat Grid Lines & Measure Bar Numbers
            const cycleBeats = getUsulBeats(this.usul);

            for (let b = 0; b <= this.totalBeats + 4; b += 0.25) {
                const x = this.beatToX(b);
                if (x < this.keyboardWidth || x > w) continue;

                const isBar = Math.abs(b % cycleBeats) < 1e-4;
                const isBeat = Math.abs(b % 1.0) < 1e-4;

                this.ctx.strokeStyle = isBar ? '#b8860b' : (isBeat ? '#d8cbb0' : '#ece4d0');
                this.ctx.lineWidth = isBar ? 2 : (isBeat ? 1 : 0.5);

                this.ctx.beginPath();
                this.ctx.moveTo(x, this.headerHeight);
                this.ctx.lineTo(x, h);
                this.ctx.stroke();
            }

            // Draw Notes on Active Layer
            const notes = this.getActiveNotes();
            for (const n of notes) {
                const x = this.beatToX(n.startBeat);
                const y = this.pitchToY(n.pitch);
                const nw = Math.max(12, n.lengthBeats * this.pixelsPerBeat - 2);
                const nh = this.rowHeight - 2;

                if (x + nw < this.keyboardWidth || y < this.headerHeight - nh) continue;

                const isSel = this.selectedNotes.has(n);
                const isHover = (this.hoveredNote === n);

                if (this.currentLayer === 'drums') {
                    this.ctx.fillStyle = isSel ? '#d4af37' : '#8c2428';
                    this.ctx.strokeStyle = isHover ? '#fff' : (isSel ? '#fff' : '#4a1015');
                    this.ctx.lineWidth = isSel ? 2 : 1;
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y + 1, nw, nh, 3);
                    this.ctx.fill();
                    this.ctx.stroke();

                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 9.5px sans-serif';
                    this.ctx.fillText(n.stroke || 'Düm', x + 3, y + this.rowHeight - 7);
                } else {
                    const isDurak = (n.pitch === this.durakMidi);
                    const grad = this.ctx.createLinearGradient(x, y, x, y + nh);
                    if (isSel) {
                        grad.addColorStop(0, '#f9d976');
                        grad.addColorStop(1, '#e9a425');
                    } else if (isDurak) {
                        grad.addColorStop(0, '#1a5c61');
                        grad.addColorStop(1, '#0b2b2c');
                    } else {
                        grad.addColorStop(0, '#1e6d73');
                        grad.addColorStop(1, '#124e52');
                    }

                    this.ctx.fillStyle = grad;
                    this.ctx.strokeStyle = isHover ? '#ffffff' : (isSel ? '#ffffff' : '#071f20');
                    this.ctx.lineWidth = isSel ? 2 : 1;
                    this.ctx.beginPath();
                    this.ctx.roundRect(x, y + 1, nw, nh, 3);
                    this.ctx.fill();
                    this.ctx.stroke();

                    if (n.detuneCents !== 0 && Math.abs(n.detuneCents) >= 1) {
                        this.ctx.fillStyle = isSel ? '#1a0f02' : '#f3e5ab';
                        this.ctx.font = 'bold 9px sans-serif';
                        const sign = n.detuneCents > 0 ? '+' : '';
                        this.ctx.fillText(`${sign}${Math.round(n.detuneCents)}c`, x + 3, y + this.rowHeight - 7);
                    }

                    if (n.ornament) {
                        this.ctx.fillStyle = '#ffdf78';
                        this.ctx.font = 'bold 9px sans-serif';
                        const ornIcon = { grace: '✨', mordent: '〰️', turn: '🔄', slide: '🎢' }[n.ornament] || '✦';
                        this.ctx.fillText(ornIcon, x + nw - 13, y + 11);
                    }
                }
            }

            // Marquee Selection Box
            if (this.isMarqueeSelecting) {
                const minX = Math.min(this.marqueeBox.x1, this.marqueeBox.x2);
                const maxX = Math.max(this.marqueeBox.x1, this.marqueeBox.x2);
                const minY = Math.min(this.marqueeBox.y1, this.marqueeBox.y2);
                const maxY = Math.max(this.marqueeBox.y1, this.marqueeBox.y2);

                this.ctx.fillStyle = 'rgba(0, 210, 255, 0.15)';
                this.ctx.strokeStyle = '#00d2ff';
                this.ctx.lineWidth = 1;
                this.ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
                this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            }

            // Playhead Line
            const phX = this.beatToX(this.playheadBeat);
            if (phX >= this.keyboardWidth) {
                this.ctx.strokeStyle = '#e74c3c';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(phX, 0);
                this.ctx.lineTo(phX, h);
                this.ctx.stroke();

                this.ctx.fillStyle = '#e74c3c';
                this.ctx.beginPath();
                this.ctx.moveTo(phX - 5, this.headerHeight);
                this.ctx.lineTo(phX + 5, this.headerHeight);
                this.ctx.lineTo(phX, this.headerHeight + 7);
                this.ctx.fill();
            }

            // Top Header Measure Ruler Bar
            this.ctx.fillStyle = '#f5eedb';
            this.ctx.fillRect(0, 0, w, this.headerHeight);
            this.ctx.strokeStyle = '#b8860b';
            this.ctx.strokeRect(0, 0, w, this.headerHeight);

            for (let b = 0; b <= this.totalBeats + 4; b += cycleBeats) {
                const x = this.beatToX(b);
                if (x < this.keyboardWidth) continue;
                this.ctx.fillStyle = '#4a1015';
                this.ctx.font = 'bold 11px "Libre Caslon Text", serif';
                this.ctx.fillText(`Ölçü ${Math.floor(b / cycleBeats) + 1}`, x + 6, 18);
            }

            if (this.toolMode === 'erase') {
                this.ctx.save();
                this.ctx.fillStyle = '#8c2428';
                this.ctx.font = 'bold 11px sans-serif';
                this.ctx.fillText('🗑️ SİLGİ MODU AKTİF (Notaya dokununca siler)', Math.max(this.keyboardWidth + 80, w - 280), 18);
                this.ctx.restore();
            }

            // Left keyboard / Drum Lanes
            this.ctx.fillStyle = '#fdfbf7';
            this.ctx.fillRect(0, this.headerHeight, this.keyboardWidth, h - this.headerHeight);

            for (let p = this.minMidi; p <= this.maxMidi; ++p) {
                const y = this.pitchToY(p);
                if (y < this.headerHeight - this.rowHeight || y > h) continue;

                if (this.currentLayer === 'drums') {
                    const lane = DRUM_LANES.find(l => l.pitch === p);
                    this.ctx.fillStyle = lane ? '#e8dfc5' : '#dfd5ba';
                    this.ctx.fillRect(0, y + 1, this.keyboardWidth - 2, this.rowHeight - 2);

                    this.ctx.fillStyle = lane ? '#0b2b2c' : '#7d745c';
                    this.ctx.font = lane ? (this.keyboardWidth < 80 ? 'bold 9.5px sans-serif' : 'bold 11px "Libre Caslon Text", serif') : '10px sans-serif';
                    let dText = lane ? (this.keyboardWidth < 80 ? `${lane.stroke} (${lane.pitch})` : `🥁 ${lane.name}`) : `(Boş)`;
                    this.ctx.fillText(dText, 3, y + this.rowHeight - 6);
                } else {
                    const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
                    const isDurak = (p === this.durakMidi);

                    this.ctx.fillStyle = isDurak ? '#0b2b2c' : (isBlack ? '#ebe1c7' : '#fcf9f2');
                    this.ctx.fillRect(0, y + 1, this.keyboardWidth - 2, this.rowHeight - 2);

                    this.ctx.fillStyle = isDurak ? '#d4af37' : '#4a1015';
                    this.ctx.font = isDurak ? (this.keyboardWidth < 50 ? 'bold 9.5px sans-serif' : 'bold 10px "Libre Caslon Text", serif') : (this.keyboardWidth < 50 ? '9px sans-serif' : '9.5px "Libre Caslon Text", serif');
                    const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
                    let lbl = `${noteNames[p % 12]}${Math.floor(p / 12) - 1}`;
                    if (isDurak) lbl += (this.keyboardWidth < 50 ? ' ★' : ' ★ Durak');
                    this.ctx.fillText(lbl, 3, y + this.rowHeight - 6);
                }
            }
        }
    }

    class ChordStrip {
        constructor(container, options = {}) {
            this.container = container;
            this.song = options.song || { chords: [] };
            this.durakMidi = options.durakMidiNote || 62;
            this.selectedIndex = 0;
            this.onSelect = null;
            this.onAudition = null;
            this.render();
        }

        setSong(s) { this.song = s; this.render(); }
        setDurak(d) { this.durakMidi = d; this.render(); }

        select(idx) {
            this.selectedIndex = idx;
            this.render();
            if (this.onSelect) this.onSelect(this.song.chords[idx], idx);
        }

        render() {
            this.container.innerHTML = '';
            (this.song.chords || []).forEach((chord, idx) => {
                const block = document.createElement('div');
                block.className = `chord-block ${idx === this.selectedIndex ? 'selected' : ''} ${chord.locked ? 'locked' : ''}`;

                const header = document.createElement('div');
                header.className = 'chord-header';
                const lbl = document.createElement('span');
                lbl.className = 'chord-bar-num';
                lbl.textContent = `Ölçü ${idx + 1}`;
                header.appendChild(lbl);

                let cleanName = (chord.name || 'Durak (Karar)').replace(/^DEM\s*-\s*/i, '');
                const title = document.createElement('div');
                title.className = 'chord-title';
                title.textContent = cleanName;
                title.title = chord.name || '';

                const detail = document.createElement('div');
                detail.className = 'chord-commas';
                detail.textContent = (chord.commas || []).map(c => `${c}k`).join(' · ') || 'Durak Sesi';

                block.appendChild(header);
                block.appendChild(title);
                block.appendChild(detail);

                block.onclick = () => {
                    this.select(idx);
                    if (this.onAudition && chord.commas) this.onAudition(chord.commas, this.durakMidi);
                };
                this.container.appendChild(block);
            });
        }
    }

    class CandidatePanel {
        constructor(container, options = {}) {
            this.container = container;
            this.makam = options.makam || null;
            this.usul = options.usul || null;
            this.durakMidi = options.durakMidiNote || 62;
            this.song = options.song || { melody: [] };
            this.currentTab = 'melody';
            this.selectedNotes = new Set();

            // Persisted UI State
            this.melodyDensity = 0.34;
            this.melodyFreedom = 0.35;
            this.contourType = 'auto';
            this.formType = 'standard';
            this.drumDensity = 0.65;
            this.drumEnsemble = 'orchestra';
            this.useBendir = true;
            this.useKudum = true;
            this.useKa = true;
            this.useZil = true;

            this.onAuditionNote = null;
            this.onAuditionChord = null;
            this.onApplyChord = null;
            this.onApplyChordToAll = null;
            this.onGenerateMelody = null;
            this.onGenerateBass = null;
            this.onGenerateDrums = null;
            this.onApplyOrnament = null;
            this.onTabSwitched = null;

            this.render();
        }

        setMakam(m, d) { this.makam = m; this.durakMidi = d || this.durakMidi; this.render(); }
        setUsul(u) { this.usul = u; this.render(); }
        setSong(s) { this.song = s; this.render(); }
        setSelectedNotes(notesSet) { this.selectedNotes = notesSet || new Set(); this.render(); }

        setTab(t, notify = true) {
            this.currentTab = t;
            this.render();
            if (notify && this.onTabSwitched) this.onTabSwitched(t);
        }

        render() {
            this.container.innerHTML = '';
            const nav = document.createElement('div');
            nav.className = 'panel-nav-tabs';

            [
                { id: 'melody', label: 'Melodi' },
                { id: 'review', label: 'Denetçi' },
                { id: 'ornaments', label: 'Süsleme' },
                { id: 'chords', label: 'Dem' },
                { id: 'bass',   label: 'Bas' },
                { id: 'drums',  label: 'Usul' }
            ].forEach(t => {
                const btn = document.createElement('button');
                btn.className = `panel-tab-btn ${this.currentTab === t.id ? 'active' : ''}`;
                btn.textContent = t.label;
                btn.onclick = () => this.setTab(t.id, true);
                nav.appendChild(btn);
            });
            this.container.appendChild(nav);

            const content = document.createElement('div');
            content.className = 'panel-tab-content';

            if (this.currentTab === 'melody') this.renderMelodyTab(content);
            else if (this.currentTab === 'review') this.renderReviewTab(content);
            else if (this.currentTab === 'ornaments') this.renderOrnamentsTab(content);
            else if (this.currentTab === 'chords') this.renderChordsTab(content);
            else if (this.currentTab === 'bass') this.renderBassTab(content);
            else if (this.currentTab === 'drums') this.renderDrumsTab(content);

            this.container.appendChild(content);
        }

        renderMelodyTab(content) {
            if (!this.makam) return;
            const header = document.createElement('div');
            header.className = 'panel-section';
            header.innerHTML = `
                <div class="makam-title-row">
                    <h3>${this.makam.name} Makamı</h3>
                    <span class="badge badge-seyir">${SEYIR_INFO[this.makam.seyir]?.trName || ''}</span>
                </div>
                <p class="text-muted">${this.makam.character}</p>
                <div class="seyir-desc-box">
                    <strong>Seyir Kuralı:</strong> ${SEYIR_INFO[this.makam.seyir]?.description || ''}<br>
                    <strong>Güçlü:</strong> ${this.makam.guclu}k (Yarım Karar) | <strong>Karara İniş:</strong> ${this.makam.approachFrom > 0 ? '+' + this.makam.approachFrom + 'k (üstten)' : this.makam.approachFrom + 'k (alttan)'}
                </div>
            `;
            content.appendChild(header);

            const tilesSection = document.createElement('div');
            tilesSection.className = 'panel-section';
            tilesSection.innerHTML = `<h4>Makam Perdeleri (53 Koma Akortlu)</h4>`;
            const grid = document.createElement('div');
            grid.className = 'perde-tiles-grid';

            const degrees = getMakamDegrees(this.makam);
            degrees.forEach((comma, idx) => {
                const p = place(this.durakMidi, comma);
                const tile = document.createElement('button');
                tile.className = `perde-tile ${idx === 0 ? 'durak-tile' : (comma === this.makam.guclu ? 'guclu-tile' : '')}`;
                tile.innerHTML = `
                    <span class="perde-name">${getPerdeName(comma)}</span>
                    <span class="perde-commas">${comma} koma</span>
                    <span class="perde-detune">${p.detuneCents !== 0 ? (p.detuneCents > 0 ? '+' : '') + Math.round(p.detuneCents) + ' sent' : 'Tam'}</span>
                `;
                tile.onclick = () => { if (this.onAuditionNote) this.onAuditionNote(p.note, p.detuneCents); };
                grid.appendChild(tile);
            });
            tilesSection.appendChild(grid);
            content.appendChild(tilesSection);

            const isSelectionActive = this.selectedNotes && this.selectedNotes.size > 0;
            const gen = document.createElement('div');
            gen.className = 'panel-section gen-card';
            gen.innerHTML = `
                <h4>Seyir & Form Tabanlı Üretici</h4>
                ${isSelectionActive ? `<div style="padding: 6px 10px; background: rgba(0, 210, 255, 0.15); border-radius: 4px; font-size: 11px; margin-bottom: 8px; color: var(--accent-cyan); font-weight: bold;">🎯 ${this.selectedNotes.size} adet nota seçildi. Yalnızca seçili bölge/ölçü yenilenecektir.</div>` : ''}
                <div class="gen-controls">
                    <div class="control-row">
                        <label>Seyir Eğrisi & Tavır:</label>
                        <select id="contourSelect" class="form-select">
                            <option value="auto" ${this.contourType === 'auto' ? 'selected' : ''}>🎲 Doğal Çeşitlilik (Rastgele Farklı Seyirler)</option>
                            <option value="wave" ${this.contourType === 'wave' ? 'selected' : ''}>🌊 Dalgalı Meşk (Güçlü Etrafında Salınım)</option>
                            <option value="climb" ${this.contourType === 'climb' ? 'selected' : ''}>🧗‍♂️ Zirveli Meyan (Tırmanış & Meyan Açılımı)</option>
                            <option value="cascade" ${this.contourType === 'cascade' ? 'selected' : ''}>🪂 Süzülen Şelale (Tizlerden Aşağı İniş)</option>
                            <option value="call_response" ${this.contourType === 'call_response' ? 'selected' : ''}>🔄 Soru - Cevap (Tematik Motif Tekrarı)</option>
                            <option value="folk" ${this.contourType === 'folk' ? 'selected' : ''}>🎯 Karar Odaklı / Türkü Tavrı</option>
                        </select>
                    </div>
                    <div class="control-row">
                        <label>Form Mimarisi:</label>
                        <select id="formTypeSelect" class="form-select">
                            <option value="standard" ${this.formType === 'standard' ? 'selected' : ''}>Döngüsel Seyir (Standart)</option>
                            <option value="sarki" ${this.formType === 'sarki' ? 'selected' : ''}>Geleneksel Şarkı (Zemin - Meyan - Karar)</option>
                        </select>
                    </div>
                    <div class="control-row">
                        <label>Nota Yoğunluğu: <span id="densityVal">${this.melodyDensity}</span></label>
                        <input type="range" id="melodyDensity" min="0.15" max="0.75" step="0.05" value="${this.melodyDensity}">
                    </div>
                    <div class="control-row">
                        <label>Makam Sadakati & Özgürlük: <span id="freedomVal">%35 (Dengeli Klasik)</span></label>
                        <input type="range" id="melodyFreedom" min="0" max="100" step="5" value="${Math.round((this.melodyFreedom ?? 0.35) * 100)}">
                        <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 2px;">
                            🏛️ %0: Kati Geleneksel | 🎼 %35: Dengeli | ✨ %70: Zengin Geçki | 🎨 %100: Avangart
                        </div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-primary" id="btnGenMelody">✨ Tüm Melodiyi Oluştur</button>
                        <button class="btn btn-secondary" id="btnRandomMelody">${isSelectionActive ? '🎲 Seçili Bölgeyi Yenile' : '🎲 Farklı Çeşitleme'}</button>
                    </div>
                </div>
            `;
            content.appendChild(gen);

            const dSlider = gen.querySelector('#melodyDensity');
            const dVal = gen.querySelector('#densityVal');
            const fSlider = gen.querySelector('#melodyFreedom');
            const fVal = gen.querySelector('#freedomVal');
            const formSel = gen.querySelector('#formTypeSelect');
            const contourSel = gen.querySelector('#contourSelect');
            const btnGen = gen.querySelector('#btnGenMelody');
            const btnRand = gen.querySelector('#btnRandomMelody');

            if (dSlider) {
                dSlider.oninput = (e) => {
                    this.melodyDensity = parseFloat(e.target.value);
                    if (dVal) dVal.textContent = e.target.value;
                };
            }
            if (fSlider) {
                const updateFreedomLabel = (v) => {
                    let desc = 'Dengeli Klasik';
                    if (v <= 15) desc = 'Kati Geleneksel';
                    else if (v <= 45) desc = 'Dengeli Klasik';
                    else if (v <= 75) desc = 'Zengin Geçkili';
                    else desc = 'Serbest & Yenilikçi';
                    if (fVal) fVal.textContent = `%${v} (${desc})`;
                };
                updateFreedomLabel(Math.round((this.melodyFreedom ?? 0.35) * 100));

                fSlider.oninput = (e) => {
                    const val = parseInt(e.target.value, 10);
                    this.melodyFreedom = val / 100.0;
                    updateFreedomLabel(val);
                };
            }
            if (formSel) {
                formSel.onchange = (e) => {
                    this.formType = e.target.value;
                };
            }
            if (contourSel) {
                contourSel.onchange = (e) => {
                    this.contourType = e.target.value;
                };
            }
            if (btnRand && this.onGenerateMelody) {
                btnRand.onclick = () => {
                    const hasSel = this.selectedNotes && this.selectedNotes.size > 0;
                    this.onGenerateMelody(this.melodyDensity, Math.floor(Math.random() * 1000000) + 1, this.formType, hasSel, this.melodyFreedom, this.contourType);
                };
            }
            if (btnGen && this.onGenerateMelody) {
                btnGen.onclick = () => {
                    this.onGenerateMelody(this.melodyDensity, Math.floor(Math.random() * 1000000) + 1, this.formType, false, this.melodyFreedom, this.contourType);
                };
            }
        }

        renderReviewTab(content) {
            const rev = reviewMakamMelody(this.song.melody, this.makam, this.durakMidi, this.usul);
            const badgeColor = rev.score >= 85 ? '#38ef7d' : (rev.score >= 65 ? '#ffc107' : '#ff4757');

            const scoreCard = document.createElement('div');
            scoreCard.className = 'panel-section';
            scoreCard.innerHTML = `
                <div class="makam-title-row">
                    <h3>🧠 Akıllı Seyir Denetçisi</h3>
                    <span class="badge" style="background: ${badgeColor}; color: #000; font-weight: bold; padding: 3px 8px; border-radius: 12px; font-size: 11px;">%${rev.score} Uyumluluk</span>
                </div>
                <p class="text-muted">Makamın seyir adımları, yabancı perde tespiti, atlamalar ve karar inişi anlık olarak denetlenir.</p>
                <div class="review-status-bar" style="margin-top: 10px; font-weight: bold; color: ${badgeColor}; font-size: 13px;">
                    Sonuç: ${rev.status}
                </div>
            `;
            content.appendChild(scoreCard);

            const listCard = document.createElement('div');
            listCard.className = 'panel-section';
            listCard.innerHTML = `<h4>Melodik Bulgular ve Öneriler</h4>`;

            rev.issues.forEach(iss => {
                const item = document.createElement('div');
                item.className = `review-item review-${iss.type || 'info'}`;
                item.innerHTML = iss.text;
                listCard.appendChild(item);
            });

            content.appendChild(listCard);
        }

        renderOrnamentsTab(content) {
            const hasSelection = this.selectedNotes && this.selectedNotes.size > 0;
            const card = document.createElement('div');
            card.className = 'panel-section';
            card.innerHTML = `
                <h3>🪕 Geleneksel Makam Süslemeleri</h3>
                <p class="text-muted">Piano roll üzerinde nota seçin ve süsleme butonuna basın:</p>
                <div style="margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; border-left: 3px solid var(--accent-cyan);">
                    <strong>Seçili Notalar:</strong> ${hasSelection ? `<span style="color: #38ef7d; font-weight: bold;">${this.selectedNotes.size} adet nota seçildi</span>` : `<span style="color: #ffc107;">Yok (Önce notaya tıklayın veya Shift+Sürükleyin)</span>`}
                </div>
                <div class="ornament-btn-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                    <button class="btn btn-secondary btn-orn" data-orn="grace">✨ Çarpma (Grace)</button>
                    <button class="btn btn-secondary btn-orn" data-orn="mordent">〰️ Çırpma / Tril</button>
                    <button class="btn btn-secondary btn-orn" data-orn="turn">🔄 Grupeli Dönüş</button>
                    <button class="btn btn-secondary btn-orn" data-orn="slide">🎢 Makam Kaydırma</button>
                    <button class="btn btn-secondary btn-orn" data-orn="" style="grid-column: span 2;">❌ Süslemeyi Temizle</button>
                </div>
            `;
            content.appendChild(card);

            content.querySelectorAll('.btn-orn').forEach(b => {
                b.onclick = (e) => {
                    const targetBtn = e.currentTarget;
                    const orn = targetBtn.getAttribute('data-orn') || null;
                    if (this.onApplyOrnament) this.onApplyOrnament(orn);
                };
            });
        }

        renderChordsTab(content) {
            const chords = getMakamChords(this.makam, this.durakMidi);
            const info = document.createElement('div');
            info.className = 'panel-section';
            info.innerHTML = `
                <h3>🎻 Makam Dem & Eşlik Seçenekleri</h3>
                <p class="text-muted">Makamın ruhuna uygun geleneksel dem zeminleri:</p>
            `;
            content.appendChild(info);

            chords.forEach(ch => {
                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.innerHTML = `
                    <div class="candidate-header">
                        <strong>${ch.name}</strong>
                        <span class="badge badge-fit">%${ch.fit}</span>
                    </div>
                    <p class="candidate-why">${ch.why}</p>
                    <div class="candidate-actions">
                        <button class="btn btn-secondary btn-audition" title="Demi Dinle">🔊 Dinle</button>
                        <button class="btn btn-primary btn-apply" title="Seçili Ölçüye Ekle">✅ Seçili Ölçü</button>
                        <button class="btn btn-accent btn-apply-all" title="Tüm Eser Boyunca Uygula">🌟 Tüm Eser</button>
                    </div>
                `;
                card.querySelector('.btn-audition').onclick = () => { if (this.onAuditionChord) this.onAuditionChord(ch.commas, this.durakMidi); };
                card.querySelector('.btn-apply').onclick = () => { if (this.onApplyChord) this.onApplyChord(ch); };
                card.querySelector('.btn-apply-all').onclick = () => { if (this.onApplyChordToAll) this.onApplyChordToAll(ch); };
                content.appendChild(card);
            });
        }

        renderBassTab(content) {
            const info = document.createElement('div');
            info.className = 'panel-section';
            info.innerHTML = `
                <h3>🎸 Heterofonik Bas Motoru</h3>
                <p class="text-muted">Aşağıdaki bas yürüyüşlerinden birini seçtiğinizde, bas partisyonu üretilip piyano rulosuna işlenir.</p>
            `;
            content.appendChild(info);

            BASS_OPTIONS.forEach(opt => {
                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.innerHTML = `
                    <div class="candidate-header"><strong>${opt.name}</strong></div>
                    <p class="candidate-why">${opt.why}</p>
                    <div class="candidate-actions">
                        <button class="btn btn-sm btn-primary">✨ Bu Tarzda Bas Üret</button>
                    </div>
                `;
                card.querySelector('button').onclick = () => { if (this.onGenerateBass) this.onGenerateBass(opt.id); };
                content.appendChild(card);
            });
        }

        renderDrumsTab(content) {
            if (!this.usul) return;
            const info = document.createElement('div');
            info.className = 'panel-section';
            info.innerHTML = `
                <h3>🥁 ${this.usul.name} Usulü (${this.usul.beats}/${this.usul.beatType})</h3>
                <p class="text-muted">${this.usul.character}</p>
            `;
            content.appendChild(info);

            // Interactive Controls Card
            const ctrlCard = document.createElement('div');
            ctrlCard.className = 'candidate-card';
            ctrlCard.style.border = '2px solid var(--gold-dark)';
            ctrlCard.innerHTML = `
                <div class="candidate-header">
                    <strong>🎛️ Vurmalı Orkestrasyonu</strong>
                    <span class="badge badge-seyir">Özel Düzenleme</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin: 8px 0;">
                    <div>
                        <label style="font-size: 11px; font-weight: 700; color: var(--burgundy-dark); display: block; margin-bottom: 2px;">Vurmalı Karakteri / Topluluk:</label>
                        <select id="drumEnsembleSel" class="form-select" style="width: 100%;">
                            <option value="orchestra" ${this.drumEnsemble === 'orchestra' ? 'selected' : ''}>🥁 Zengin Türk Vurmalı Orkestrası</option>
                            <option value="kudum_bendir" ${this.drumEnsemble === 'kudum_bendir' ? 'selected' : ''}>🪘 Klasik Kudüm & Bendir Grubu</option>
                            <option value="fasil" ${this.drumEnsemble === 'fasil' ? 'selected' : ''}>🪇 Fasıl & Def Topluluğu</option>
                            <option value="bare" ${this.drumEnsemble === 'bare' ? 'selected' : ''}>📜 Sade Geleneksel Usul</option>
                        </select>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: var(--burgundy-dark);">
                            <span>Ritim Yoğunluğu:</span>
                            <span id="drumDensityLbl">%${Math.round(this.drumDensity * 100)}</span>
                        </div>
                        <input type="range" id="drumDensityRng" min="0.1" max="1.0" step="0.05" value="${this.drumDensity}" style="width: 100%;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; color: var(--burgundy-dark); font-weight: 600;">
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="checkbox" id="chkUseBendir" ${this.useBendir ? 'checked' : ''}> Derin Bendir (46)
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="checkbox" id="chkUseKudum" ${this.useKudum ? 'checked' : ''}> Kudüm Tiz (44)
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="checkbox" id="chkUseKa" ${this.useKa ? 'checked' : ''}> Kâ Tok El (40)
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="checkbox" id="chkUseZil" ${this.useZil ? 'checked' : ''}> Zil / Çalpara (42)
                        </label>
                    </div>
                </div>
                <div class="candidate-actions">
                    <button id="btnGenerateDrumsCustom" class="btn btn-primary" style="width: 100%; padding: 6px;">
                        🥁 Ritmi Oluştur ve Piyano Rulosuna Yaz
                    </button>
                </div>
            `;
            content.appendChild(ctrlCard);

            const ensembleSel = ctrlCard.querySelector('#drumEnsembleSel');
            const densityRng = ctrlCard.querySelector('#drumDensityRng');
            const densityLbl = ctrlCard.querySelector('#drumDensityLbl');
            const chkBendir = ctrlCard.querySelector('#chkUseBendir');
            const chkKudum = ctrlCard.querySelector('#chkUseKudum');
            const chkKa = ctrlCard.querySelector('#chkUseKa');
            const chkZil = ctrlCard.querySelector('#chkUseZil');

            if (ensembleSel) {
                ensembleSel.onchange = (e) => { this.drumEnsemble = e.target.value; };
            }
            if (densityRng) {
                densityRng.oninput = (e) => {
                    this.drumDensity = parseFloat(e.target.value);
                    if (densityLbl) densityLbl.textContent = `%${Math.round(this.drumDensity * 100)}`;
                };
            }
            if (chkBendir) chkBendir.onchange = (e) => { this.useBendir = e.target.checked; };
            if (chkKudum) chkKudum.onchange = (e) => { this.useKudum = e.target.checked; };
            if (chkKa) chkKa.onchange = (e) => { this.useKa = e.target.checked; };
            if (chkZil) chkZil.onchange = (e) => { this.useZil = e.target.checked; };

            const btnGen = ctrlCard.querySelector('#btnGenerateDrumsCustom');
            if (btnGen) {
                btnGen.onclick = () => {
                    if (this.onGenerateDrums) {
                        this.onGenerateDrums({
                            groove: this.drumEnsemble,
                            density: this.drumDensity,
                            useBendir: this.useBendir,
                            useKudum: this.useKudum,
                            useKa: this.useKa,
                            useZil: this.useZil
                        });
                    }
                };
            }

            const presetHeader = document.createElement('div');
            presetHeader.style.cssText = 'font-family: var(--font-serif); font-size: 11px; font-weight: 700; color: var(--burgundy-dark); margin: 10px 0 4px 2px;';
            presetHeader.textContent = 'Hızlı Usul Şablonları:';
            content.appendChild(presetHeader);

            GROOVE_OPTIONS.forEach(g => {
                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.innerHTML = `
                    <div class="candidate-header"><strong>${g.name}</strong></div>
                    <p class="candidate-why">${g.why}</p>
                    <div class="candidate-actions"><button class="btn btn-sm btn-secondary">⚡ Hızlı Uygula</button></div>
                `;
                card.querySelector('button').onclick = () => {
                    if (this.onGenerateDrums) {
                        this.onGenerateDrums({
                            groove: g.id,
                            density: this.drumDensity,
                            useBendir: this.useBendir,
                            useKudum: this.useKudum,
                            useKa: this.useKa,
                            useZil: this.useZil
                        });
                    }
                };
                content.appendChild(card);
            });
        }
    }

    class Mixer {
        constructor(container, audioEngine, options = {}) {
            this.container = container;
            this.engine = audioEngine;
            this.onAhenkChange = options.onAhenkChange || null;
            this.render();
        }

        render() {
            this.container.innerHTML = `
                <div class="mixer-container">
                    <div class="mixer-header">
                        <h4>Mikser & Reverb</h4>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <div class="ahenk-selector-group">
                                <label for="reverbSelect">Mekan Akustiği:</label>
                                <select id="reverbSelect" class="form-select">
                                    <option value="cami" selected>Tarihi Cami / Külliye</option>
                                    <option value="mesk">Meşk Odası</option>
                                    <option value="dry">Kuru (Dry)</option>
                                </select>
                            </div>
                            <div class="ahenk-selector-group">
                                <label for="ahenkSelect">Ahenk:</label>
                                <select id="ahenkSelect" class="form-select">
                                    ${AHENK_LIST.map((a, i) => `<option value="${i}">${a.name} (${a.durakName})</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="mixer-strips">
                        <div class="channel-strip">
                            <div class="channel-label">Melodi</div>
                            <div class="channel-controls">
                                <select class="form-select inst-sel" data-ch="melody">
                                    <option value="ney" selected>Ney (Mistik)</option>
                                    <option value="ud">Ud (Akustik)</option>
                                    <option value="kanun">Kanun (Parlak)</option>
                                    <option value="tanbur">Tanbur (Tel)</option>
                                </select>
                                <input type="range" class="fader" min="0" max="1.5" step="0.05" value="1.0" data-ch="melody" title="Melodi Seviyesi">
                            </div>
                        </div>
                        <div class="channel-strip">
                            <div class="channel-label">Dem & Eşlik</div>
                            <div class="channel-controls">
                                <select class="form-select inst-sel" data-ch="chords">
                                    <option value="drone" selected>Dem Sesi</option>
                                    <option value="kanun">Kanun Eşlik</option>
                                    <option value="ud">Ud Eşlik</option>
                                </select>
                                <input type="range" class="fader" min="0" max="1.5" step="0.05" value="0.75" data-ch="chords" title="Dem Seviyesi">
                            </div>
                        </div>
                        <div class="channel-strip">
                            <div class="channel-label">Bas</div>
                            <div class="channel-controls">
                                <select class="form-select inst-sel" data-ch="bass">
                                    <option value="bass_plain" selected>Akustik Bas</option>
                                    <option value="bass_808">808 Sub Bas</option>
                                </select>
                                <input type="range" class="fader" min="0" max="1.5" step="0.05" value="0.80" data-ch="bass" title="Bas Seviyesi">
                            </div>
                        </div>
                        <div class="channel-strip">
                            <div class="channel-label">Vurmalı</div>
                            <div class="channel-controls">
                                <div style="font-size: 10px; color: var(--burgundy-dark); font-weight: 700; white-space: nowrap; padding: 2px 4px;">Kudüm/Bendir</div>
                                <input type="range" class="fader" min="0" max="1.5" step="0.05" value="0.85" data-ch="drums" title="Vurmalı Seviyesi">
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this.container.querySelector('#ahenkSelect').onchange = (e) => {
                if (this.onAhenkChange) this.onAhenkChange(AHENK_LIST[parseInt(e.target.value, 10)]);
            };

            this.container.querySelector('#reverbSelect').onchange = (e) => {
                this.engine.setReverbPreset(e.target.value);
            };

            this.container.querySelectorAll('.inst-sel').forEach(s => {
                s.onchange = (e) => {
                    const ch = e.target.dataset.ch;
                    if (ch === 'melody') this.engine.melodyInstrument = e.target.value;
                    if (ch === 'chords') this.engine.chordInstrument = e.target.value;
                    if (ch === 'bass')   this.engine.bassInstrument = e.target.value;
                };
            });

            this.container.querySelectorAll('.fader').forEach(f => {
                f.oninput = (e) => {
                    this.engine.setChannelVolume(e.target.dataset.ch, parseFloat(e.target.value));
                };
            });
        }
    }

    // ============================================================================
    // 11. MAIN APP COORDINATOR
    // ============================================================================
    class MakamStudioApp {
        constructor() {
            this.currentMakam = findMakam('hicaz');
            this.currentUsul  = findUsul('sofyan');
            this.currentAhenk = AHENK_LIST[0];
            this.durakMidi    = this.currentAhenk.durakNote;
            this.cycles       = 4;
            this.bpm          = 100;
            this.formType     = 'standard';

            this.song = { melody: [], chords: [], bass: [], drums: [], totalBeats: 16.0 };
            this.history = new HistoryManager();
            this.audio = new AudioEngine();
            this.init();
        }

        init() {
            const makamSel = document.getElementById('makamSelect');
            if (makamSel) {
                makamSel.innerHTML = MAKAMS.map(m => `<option value="${m.id}" ${m.id === this.currentMakam.id ? 'selected' : ''}>${m.name} Makamı</option>`).join('');
                makamSel.onchange = (e) => { this.currentMakam = findMakam(e.target.value); this.onMakamChanged(); };
            }

            const usulSel = document.getElementById('usulSelect');
            if (usulSel) {
                usulSel.innerHTML = USULS.map(u => `<option value="${u.id}" ${u.id === this.currentUsul.id ? 'selected' : ''}>${u.name} (${u.beats}/${u.beatType})</option>`).join('');
                usulSel.onchange = (e) => { this.currentUsul = findUsul(e.target.value); this.onUsulChanged(); };
            }

            const cycleSel = document.getElementById('cycleSelect');
            if (cycleSel) {
                cycleSel.onchange = (e) => {
                    this.cycles = parseInt(e.target.value, 10);
                    this.generateAll();
                };
            }

            const bpmInp = document.getElementById('bpmInput');
            if (bpmInp) {
                bpmInp.oninput = (e) => {
                    this.bpm = parseInt(e.target.value, 10) || 100;
                    this.audio.setBpm(this.bpm);
                };
            }

            const btnExport = document.getElementById('btnExportMidi');
            if (btnExport) {
                btnExport.onclick = () => {
                    downloadMidi(this.song, this.bpm, this.currentUsul, `${this.currentMakam.name}_${this.currentUsul.name}.mid`);
                };
            }

            const btnGenAll = document.getElementById('btnGenAll');
            if (btnGenAll) {
                btnGenAll.onclick = () => this.generateAll();
            }

            const btnUndo = document.getElementById('btnUndo');
            if (btnUndo) btnUndo.onclick = () => this.undo();
            const btnRedo = document.getElementById('btnRedo');
            if (btnRedo) btnRedo.onclick = () => this.redo();

            const btnClearLayer = document.getElementById('btnClearLayer');
            if (btnClearLayer) {
                btnClearLayer.onclick = () => {
                    this.history.pushState(this.song);
                    this.pianoRoll.clearActiveLayer();
                    this.updateUI();
                };
            }

            const btnResetAll = document.getElementById('btnResetAll');
            if (btnResetAll) {
                btnResetAll.onclick = () => {
                    this.history.pushState(this.song);
                    this.song.melody = [];
                    this.song.chords = [];
                    this.song.bass = [];
                    this.song.drums = [];
                    this.pianoRoll.selectedNotes.clear();
                    this.updateUI();
                };
            }

            const btnToggle = document.getElementById('btnToggleSidebar');
            const sidebar = document.getElementById('workspaceSidebar');
            if (btnToggle && sidebar) {
                btnToggle.onclick = () => {
                    if (window.innerWidth <= 768) {
                        sidebar.classList.toggle('mobile-open');
                        const isOpened = sidebar.classList.contains('mobile-open');
                        document.querySelectorAll('.mob-nav-btn').forEach(b => {
                            b.classList.toggle('active', isOpened ? b.dataset.view === 'makam' : b.dataset.view === 'studio');
                        });
                    } else {
                        sidebar.classList.toggle('collapsed');
                        btnToggle.classList.toggle('active', !sidebar.classList.contains('collapsed'));
                    }
                    setTimeout(() => this.pianoRoll.resize(), 60);
                    setTimeout(() => this.pianoRoll.resize(), 270);
                };
            }

            // Piano roll & components
            const canvas = document.getElementById('pianoRollCanvas');
            this.pianoRoll = new PianoRoll(canvas, { song: this.song, makam: this.currentMakam, usul: this.currentUsul, durakMidiNote: this.durakMidi });
            this.pianoRoll.onAuditionNote = (n, d) => this.audio.auditionNote(n, d);
            this.pianoRoll.onAuditionDrum = (p) => this.audio.auditionDrum(p);
            this.pianoRoll.onSeek = (b) => this.audio.seek(b);
            this.pianoRoll.onNoteChanged = () => {
                this.history.pushState(this.song);
                this.audio.setSongData(this.song);
                this.candidatePanel.setSong(this.song);
            };
            this.pianoRoll.onSelectionChanged = (notesSet) => {
                this.candidatePanel.setSelectedNotes(notesSet);
            };

            this.chordStrip = new ChordStrip(document.getElementById('chordStripContainer'), { song: this.song, durakMidiNote: this.durakMidi });
            this.chordStrip.onAudition = (c, d) => this.audio.auditionChord(c, d);

            this.candidatePanel = new CandidatePanel(document.getElementById('candidatePanelContainer'), { makam: this.currentMakam, usul: this.currentUsul, durakMidiNote: this.durakMidi, song: this.song });
            this.candidatePanel.onAuditionNote = (n, d) => this.audio.auditionNote(n, d);
            this.candidatePanel.onAuditionChord = (c, d) => this.audio.auditionChord(c, d);

            // Tab synchronization to PianoRoll view
            this.candidatePanel.onTabSwitched = (tabId) => {
                if (tabId === 'melody' || tabId === 'ornaments' || tabId === 'review') {
                    this.setActiveLayer('melody');
                } else if (tabId === 'bass') {
                    this.setActiveLayer('bass');
                } else if (tabId === 'drums') {
                    this.setActiveLayer('drums');
                }
            };

            this.candidatePanel.onApplyChord = (ch) => {
                const idx = this.chordStrip.selectedIndex;
                if (idx >= 0 && idx < this.song.chords.length) {
                    this.history.pushState(this.song);
                    this.song.chords[idx].name = ch.name;
                    this.song.chords[idx].commas = ch.commas;
                    this.chordStrip.render();
                    this.audio.setSongData(this.song);
                    this.audio.auditionChord(ch.commas, this.durakMidi);
                }
            };

            this.candidatePanel.onApplyChordToAll = (ch) => {
                this.history.pushState(this.song);
                const total = this.song.chords.length;
                const guclu = this.currentMakam.guclu || 22;
                for (let i = 0; i < total; ++i) {
                    const c = this.song.chords[i];
                    if (ch.isDynamic) {
                        const isMeyan = (i === Math.floor(total * 0.5) || (total >= 4 && i === Math.floor(total * 0.75)));
                        c.name = isMeyan ? `DEM - Güçlü (${this.currentMakam.gucluName || 'Güçlü'})` : 'DEM - Durak (Karar)';
                        c.commas = isMeyan ? [guclu] : [0];
                    } else {
                        c.name = ch.name;
                        c.commas = ch.commas;
                    }
                }
                this.chordStrip.render();
                this.audio.setSongData(this.song);
                this.audio.auditionChord(ch.commas, this.durakMidi);
            };

            this.candidatePanel.onApplyOrnament = (orn) => {
                if (this.pianoRoll.selectedNotes.size > 0) {
                    this.history.pushState(this.song);
                    for (const n of this.pianoRoll.selectedNotes) {
                        n.ornament = orn;
                    }
                    this.pianoRoll.render();
                    this.candidatePanel.setSelectedNotes(this.pianoRoll.selectedNotes);

                    const sampleNote = Array.from(this.pianoRoll.selectedNotes)[0];
                    if (sampleNote) {
                        this.audio.auditionNote(sampleNote.pitch, sampleNote.detuneCents, this.audio.melodyInstrument, orn);
                    }
                }
            };

            this.candidatePanel.onGenerateMelody = (density, seed, formType, onlySelection, freedom, contourType) => {
                this.history.pushState(this.song);
                this.formType = formType || 'standard';
                const fVal = freedom !== undefined ? freedom : (this.candidatePanel.melodyFreedom ?? 0.35);
                const cVal = contourType || this.candidatePanel.contourType || 'auto';

                if (onlySelection && this.pianoRoll.selectedNotes && this.pianoRoll.selectedNotes.size > 0) {
                    const selNotes = Array.from(this.pianoRoll.selectedNotes);
                    let minBeat = Infinity, maxBeat = -Infinity;
                    for (const n of selNotes) {
                        if (n.startBeat < minBeat) minBeat = n.startBeat;
                        if (n.startBeat + n.lengthBeats > maxBeat) maxBeat = n.startBeat + n.lengthBeats;
                    }

                    const cycleBeats = getUsulBeats(this.currentUsul);
                    const startMeasure = Math.floor(minBeat / cycleBeats);
                    const endMeasure = Math.max(startMeasure + 1, Math.ceil(maxBeat / cycleBeats));
                    const startBeat = startMeasure * cycleBeats;
                    const rangeCycles = endMeasure - startMeasure;
                    const endBeat = startBeat + (rangeCycles * cycleBeats);

                    // Remove all existing notes in the measure range [startBeat, endBeat)
                    this.song.melody = (this.song.melody || []).filter(n => !(n.startBeat >= startBeat - 1e-4 && n.startBeat < endBeat - 1e-4));
                    this.pianoRoll.selectedNotes.clear();

                    const newNotes = generateMakamMelody({
                        makam: this.currentMakam,
                        usul: this.currentUsul,
                        durakMidiNote: this.durakMidi,
                        startBeat: startBeat,
                        cycles: rangeCycles,
                        density: density || this.candidatePanel.melodyDensity || 0.34,
                        freedom: fVal,
                        contourType: cVal,
                        seed: seed,
                        formType: this.formType
                    });

                    const addedSel = new Set();
                    for (const n of newNotes) {
                        if (n.startBeat >= startBeat - 1e-4 && n.startBeat < endBeat - 1e-4) {
                            this.song.melody.push(n);
                            addedSel.add(n);
                        }
                    }
                    this.song.melody.sort((a, b) => a.startBeat - b.startBeat);
                    this.pianoRoll.selectedNotes = addedSel;
                    this.candidatePanel.selectedNotes = addedSel;
                } else {
                    this.song.melody = generateMakamMelody({
                        makam: this.currentMakam,
                        usul: this.currentUsul,
                        durakMidiNote: this.durakMidi,
                        cycles: this.cycles,
                        density: density || this.candidatePanel.melodyDensity || 0.34,
                        freedom: fVal,
                        contourType: cVal,
                        seed: seed,
                        formType: this.formType
                    });
                }

                this.pianoRoll.render();
                this.candidatePanel.setSong(this.song);
                this.audio.setSongData(this.song);
                this.setActiveLayer('melody');
                this.updateUI();
            };

            this.candidatePanel.onGenerateBass = (kind) => {
                this.history.pushState(this.song);
                this.song.bass = generateMakamBass({ kind, makam: this.currentMakam, usul: this.currentUsul, durakMidiNote: this.durakMidi, cycles: this.cycles, melody: this.song.melody });
                this.setActiveLayer('bass');
                this.updateUI();

                if (this.song.bass.length > 0) {
                    const b0 = this.song.bass[0];
                    this.audio.auditionNote(b0.pitch, b0.detuneCents, this.audio.bassInstrument);
                }
            };

            this.candidatePanel.onGenerateDrums = (options) => {
                this.history.pushState(this.song);
                const opts = typeof options === 'string' ? { groove: options } : (options || {});
                opts.usul = this.currentUsul;
                opts.cycles = this.cycles;
                this.song.drums = generateUsulDrums(opts);
                this.setActiveLayer('drums');
                this.updateUI();

                this.audio.auditionDrum(36, 0.95);
            };

            this.mixer = new Mixer(document.getElementById('mixerContainer'), this.audio, {
                onAhenkChange: (newAhenk) => {
                    this.handleAhenkChange(newAhenk);
                }
            });

            // Transport buttons
            const btnPlay = document.getElementById('btnPlay');
            if (btnPlay) {
                btnPlay.onclick = async () => {
                    if (this.audio.isPlaying) this.audio.pause();
                    else await this.audio.play();
                };
            }

            const btnStop = document.getElementById('btnStop');
            if (btnStop) btnStop.onclick = () => this.audio.stop();

            const btnLoop = document.getElementById('btnLoop');
            if (btnLoop) {
                btnLoop.onclick = (e) => {
                    this.audio.isLooping = !this.audio.isLooping;
                    e.target.classList.toggle('active', this.audio.isLooping);
                };
            }

            // Global Spacebar Play / Pause Listener
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' || e.key === ' ') {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        this.audio.togglePlay();
                    }
                }
            });

            // Tool Switcher (Draw / Erase)
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const tool = e.currentTarget.dataset.tool;
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    this.pianoRoll.setToolMode(tool);
                };
            });

            // Delete Selected Button
            const btnDelSel = document.getElementById('btnDeleteSelected');
            if (btnDelSel) {
                btnDelSel.onclick = () => {
                    this.history.pushState(this.song);
                    this.pianoRoll.deleteSelectedNotes();
                };
            }

            // Mobile Bottom Navigation Bar (< 768px)
            document.querySelectorAll('.mob-nav-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const view = e.currentTarget.dataset.view;
                    document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    const sidebar = document.getElementById('workspaceSidebar');

                    if (view === 'studio' || view === 'roll') {
                        if (sidebar) sidebar.classList.remove('mobile-open');
                        setTimeout(() => this.pianoRoll.resize(), 60);
                    } else {
                        if (sidebar) {
                            sidebar.classList.remove('collapsed');
                            sidebar.classList.add('mobile-open');
                        }
                        if (view === 'makam') {
                            this.setActiveLayer('melody');
                            this.candidatePanel.setTab('melody');
                        }
                        if (view === 'drums') {
                            this.setActiveLayer('drums');
                            this.candidatePanel.setTab('drums');
                        }
                        if (view === 'dem') {
                            this.candidatePanel.setTab('chords');
                        }
                        setTimeout(() => this.pianoRoll.resize(), 60);
                    }
                };
            });

            // Window resize handler: restore desktop panel visibility when screen grows
            window.addEventListener('resize', () => {
                const sidebar = document.getElementById('workspaceSidebar');
                if (window.innerWidth > 768 && sidebar) {
                    sidebar.classList.remove('mobile-open');
                }
                this.pianoRoll.resize();
            });

            // Layer switcher buttons
            document.querySelectorAll('.layer-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const layer = e.target.dataset.layer;
                    this.setActiveLayer(layer);
                    if (layer === 'melody') this.candidatePanel.setTab('melody', false);
                    if (layer === 'bass')   this.candidatePanel.setTab('bass', false);
                    if (layer === 'drums')  this.candidatePanel.setTab('drums', false);
                };
            });

            // Audio callbacks
            this.audio.onPlayheadUpdate = (b) => {
                this.pianoRoll.setPlayhead(b);
                const tDisp = document.getElementById('timeDisplay');
                if (tDisp) tDisp.textContent = `Vuruş: ${b.toFixed(2)}`;
            };

            this.audio.onStateChange = (playing) => {
                if (btnPlay) {
                    btnPlay.innerHTML = playing 
                        ? '<svg class="btn-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> <span>Duraklat</span>'
                        : '<svg class="btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> <span>Oynat</span>';
                }
            };

            this.setupWebMidi();
            this.generateAll();

            setTimeout(() => this.pianoRoll.resize(), 100);
            setTimeout(() => this.pianoRoll.resize(), 500);
        }

        setActiveLayer(layer) {
            document.querySelectorAll('.layer-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.layer === layer);
            });
            this.pianoRoll.setLayer(layer);
        }

        handleAhenkChange(newAhenk) {
            const oldDurak = this.durakMidi;
            const newDurak = newAhenk.durakNote;
            const semitoneShift = newDurak - oldDurak;

            this.history.pushState(this.song);

            this.currentAhenk = newAhenk;
            this.durakMidi = newDurak;

            for (const n of (this.song.melody || [])) { n.pitch += semitoneShift; }
            for (const n of (this.song.bass || []))   { n.pitch += semitoneShift; }
            for (const c of (this.song.chords || [])) { c.durakMidiNote = newDurak; }

            this.pianoRoll.durakMidi = newDurak;
            this.pianoRoll.setMakam(this.currentMakam, this.durakMidi);
            this.chordStrip.setDurak(this.durakMidi);
            this.candidatePanel.setMakam(this.currentMakam, this.durakMidi);
            this.updateUI();

            this.audio.auditionChord([0, this.currentMakam.guclu || 22, 53], this.durakMidi);
        }

        setupWebMidi() {
            // Check permission silently so browser never pops up a prompt on page load
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'midi', sysex: false }).then(permissionStatus => {
                    if (permissionStatus.state === 'granted') {
                        this.initMidiAccess();
                    }
                }).catch(() => {});
            }
        }

        initMidiAccess() {
            if (navigator.requestMIDIAccess) {
                navigator.requestMIDIAccess().then(access => {
                    for (const input of access.inputs.values()) {
                        input.onmidimessage = (msg) => {
                            const [status, note, vel] = msg.data;
                            if ((status & 0xF0) === 0x90 && vel > 0) {
                                const degrees = getMakamDegrees(this.currentMakam);
                                let bestDeg = degrees[0];
                                let minD = 999;
                                for (const d of degrees) {
                                    const p = place(this.durakMidi, d);
                                    const diff = Math.abs(p.note - note);
                                    if (diff < minD) { minD = diff; bestDeg = d; }
                                }
                                const sound = place(this.durakMidi, bestDeg);
                                this.audio.auditionNote(sound.note, sound.detuneCents);
                            }
                        };
                    }
                }).catch(() => {});
            }
        }

        undo() {
            const prev = this.history.undo(this.song);
            if (prev) {
                this.song = prev;
                this.updateUI();
            }
        }

        redo() {
            const next = this.history.redo(this.song);
            if (next) {
                this.song = next;
                this.updateUI();
            }
        }

        onMakamChanged() {
            this.pianoRoll.setMakam(this.currentMakam, this.durakMidi);
            this.candidatePanel.setMakam(this.currentMakam, this.durakMidi);
            this.generateAll();
        }

        onUsulChanged() {
            this.pianoRoll.setUsul(this.currentUsul);
            this.candidatePanel.setUsul(this.currentUsul);
            this.generateAll();
        }

        generateAll() {
            const cycleBeats = getUsulBeats(this.currentUsul);
            this.song.totalBeats = cycleBeats * this.cycles;
            this.audio.totalBeats = this.song.totalBeats;
            this.audio.loopEndBeat = this.song.totalBeats;

            const chordsOpt = getMakamChords(this.currentMakam, this.durakMidi);
            this.song.chords = [];
            const guclu = this.currentMakam.guclu || 22;
            for (let i = 0; i < this.cycles; ++i) {
                // Dynamic Seyir Dem by default for intelligent piece structure
                const isMeyan = (i === Math.floor(this.cycles * 0.5) || (this.cycles >= 4 && i === Math.floor(this.cycles * 0.75)));
                const name = isMeyan ? `DEM - Güçlü (${this.currentMakam.gucluName || 'Güçlü'})` : 'DEM - Durak (Karar)';
                const commas = isMeyan ? [guclu] : [0];
                this.song.chords.push({ name, commas, startBeat: i * cycleBeats, lengthBeats: cycleBeats, durakMidiNote: this.durakMidi, locked: false });
            }

            const randSeed = Math.floor(Math.random() * 1000000) + 1;
            const freedom = this.candidatePanel ? (this.candidatePanel.melodyFreedom ?? 0.35) : 0.35;
            const contourType = this.candidatePanel ? (this.candidatePanel.contourType || 'auto') : 'auto';
            this.song.melody = generateMakamMelody({ makam: this.currentMakam, usul: this.currentUsul, durakMidiNote: this.durakMidi, cycles: this.cycles, density: this.candidatePanel?.melodyDensity || 0.36, freedom: freedom, contourType: contourType, seed: randSeed, formType: this.formType });
            this.song.bass = generateMakamBass({ kind: BASS_KIND.ON_THE_USUL, makam: this.currentMakam, usul: this.currentUsul, durakMidiNote: this.durakMidi, cycles: this.cycles, melody: this.song.melody, seed: randSeed + 1 });
            this.song.drums = generateUsulDrums({ usul: this.currentUsul, groove: GROOVE_KIND.ORCHESTRA, density: this.candidatePanel?.drumDensity || 0.65, cycles: this.cycles, seed: randSeed + 2 });

            this.history.pushState(this.song);
            this.updateUI();
        }

        updateUI() {
            this.pianoRoll.setSong(this.song);
            this.chordStrip.setSong(this.song);
            this.candidatePanel.setSong(this.song);
            this.audio.setSongData(this.song);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.app = new MakamStudioApp(); });
    } else {
        window.app = new MakamStudioApp();
    }
})();
