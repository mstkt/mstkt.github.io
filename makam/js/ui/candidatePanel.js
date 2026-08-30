/**
 * Makam Theory & Candidate Recommendation Panel
 *
 * Inspector panel for:
 *  1. Makam analysis, Çeşni structures, Seyir rules, and clickable Perde Degree tiles
 *  2. Dem drone & ladder stack chord accompaniment suggestions
 *  3. Heterophonic bassline choices
 *  4. Usul rhythm cycles and groove variations
 */

import { place, getPerdeName } from '../theory/tuning.js';
import { getMakamDegrees, SEYIR_INFO, findCesni } from '../theory/makam.js';
import { getMakamChords } from '../theory/accompaniment.js';
import { BASS_OPTIONS } from '../theory/bassEngine.js';
import { GROOVE_OPTIONS } from '../theory/rhythmEngine.js';

export class CandidatePanel {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.makam = options.makam || null;
        this.usul = options.usul || null;
        this.durakMidi = options.durakMidiNote || 62;

        this.currentTab = 'melody'; // 'melody' | 'chords' | 'bass' | 'drums'

        // Callbacks
        this.onAuditionNote = null;
        this.onAuditionChord = null;
        this.onAuditionDrum = null;
        this.onApplyChord = null;
        this.onGenerateMelody = null;
        this.onGenerateBass = null;
        this.onGenerateDrums = null;

        this.render();
    }

    setMakam(makam, durakMidi) {
        this.makam = makam;
        this.durakMidi = durakMidi || this.durakMidi;
        this.render();
    }

    setUsul(usul) {
        this.usul = usul;
        this.render();
    }

    setTab(tab) {
        this.currentTab = tab;
        this.render();
    }

    render() {
        this.container.innerHTML = '';

        // Tab Navigation Header
        const nav = document.createElement('div');
        nav.className = 'panel-nav-tabs';

        const tabs = [
            { id: 'melody', label: '🎼 Melodi & Seyir' },
            { id: 'chords', label: '🎻 Dem & Eşlik' },
            { id: 'bass',   label: '🎸 Heterofonik Bas' },
            { id: 'drums',  label: '🥁 Usul & Vurmalı' }
        ];

        tabs.forEach(t => {
            const btn = document.createElement('button');
            btn.className = `panel-tab-btn ${this.currentTab === t.id ? 'active' : ''}`;
            btn.textContent = t.label;
            btn.onclick = () => this.setTab(t.id);
            nav.appendChild(btn);
        });

        this.container.appendChild(nav);

        // Tab Content Container
        const content = document.createElement('div');
        content.className = 'panel-tab-content';

        switch (this.currentTab) {
            case 'melody': this.renderMelodyTab(content); break;
            case 'chords': this.renderChordsTab(content); break;
            case 'bass':   this.renderBassTab(content); break;
            case 'drums':  this.renderDrumsTab(content); break;
        }

        this.container.appendChild(content);
    }

    renderMelodyTab(content) {
        if (!this.makam) return;

        // 1. Makam Header & Seyir Info
        const header = document.createElement('div');
        header.className = 'panel-section makam-info-card';

        const titleRow = document.createElement('div');
        titleRow.className = 'makam-title-row';

        const name = document.createElement('h3');
        name.textContent = `${this.makam.name} Makamı`;

        const seyirBadge = document.createElement('span');
        seyirBadge.className = 'badge badge-seyir';
        seyirBadge.textContent = SEYIR_INFO[this.makam.seyir]?.trName || 'Seyir';

        titleRow.appendChild(name);
        titleRow.appendChild(seyirBadge);

        const desc = document.createElement('p');
        desc.className = 'text-muted';
        desc.textContent = this.makam.character;

        const seyirDesc = document.createElement('div');
        seyirDesc.className = 'seyir-desc-box';
        seyirDesc.innerHTML = `<strong>Seyir Kuralı:</strong> ${SEYIR_INFO[this.makam.seyir]?.description || ''}
            <br><strong>Güçlü:</strong> ${this.makam.guclu} koma (Yarım Karar) | <strong>Karar İnişi:</strong> ${this.makam.approachFrom > 0 ? '+' + this.makam.approachFrom + ' koma (üstten)' : this.makam.approachFrom + ' koma (alttan)'}`;

        header.appendChild(titleRow);
        header.appendChild(desc);
        header.appendChild(seyirDesc);
        content.appendChild(header);

        // 2. Çeşni Yapısı
        const cesniBox = document.createElement('div');
        cesniBox.className = 'panel-section cesni-box';
        const loCesni = findCesni(this.makam.lower, this.makam.lowerIsPentachord);
        const hiCesni = findCesni(this.makam.upper, this.makam.upperIsPentachord);

        cesniBox.innerHTML = `
            <h4>Çeşni Mimarisi</h4>
            <div class="cesni-badges">
                <div class="cesni-pill">
                    <span class="cesni-tag">${this.makam.lowerIsPentachord ? '5\'li' : '4\'lü'}</span>
                    <strong>${this.makam.lower}</strong> (${loCesni?.steps.join('-') || ''})
                </div>
                <span class="cesni-join">+</span>
                <div class="cesni-pill">
                    <span class="cesni-tag">${this.makam.upperIsPentachord ? '5\'li' : '4\'lü'}</span>
                    <strong>${this.makam.upper}</strong> (${hiCesni?.steps.join('-') || ''})
                </div>
            </div>
        `;
        content.appendChild(cesniBox);

        // 3. Perde Derece Karoları (Clickable Degree Tiles)
        const tilesSection = document.createElement('div');
        tilesSection.className = 'panel-section';
        tilesSection.innerHTML = `<h4>Makam Perdeleri (53 Koma Akortlu)</h4><p class="text-hint">Perdelere tıklayarak mikrotonal tınıyı dinleyin:</p>`;

        const grid = document.createElement('div');
        grid.className = 'perde-tiles-grid';

        const degrees = getMakamDegrees(this.makam);
        degrees.forEach((comma, idx) => {
            const p = place(this.durakMidi, comma);
            const perdeName = getPerdeName(comma);

            const tile = document.createElement('button');
            tile.className = `perde-tile ${idx === 0 ? 'durak-tile' : (comma === this.makam.guclu ? 'guclu-tile' : '')}`;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'perde-name';
            nameSpan.textContent = perdeName;

            const commaSpan = document.createElement('span');
            commaSpan.className = 'perde-commas';
            commaSpan.textContent = `${comma} koma`;

            const detuneSpan = document.createElement('span');
            detuneSpan.className = 'perde-detune';
            detuneSpan.textContent = p.detuneCents !== 0 ? `${p.detuneCents > 0 ? '+' : ''}${Math.round(p.detuneCents)} sent` : 'Tam';

            tile.appendChild(nameSpan);
            tile.appendChild(commaSpan);
            tile.appendChild(detuneSpan);

            tile.onclick = () => {
                if (this.onAuditionNote) {
                    this.onAuditionNote(p.note, p.detuneCents);
                }
            };

            grid.appendChild(tile);
        });

        tilesSection.appendChild(grid);
        content.appendChild(tilesSection);

        // 4. Generator Controls
        const genSection = document.createElement('div');
        genSection.className = 'panel-section gen-card';
        genSection.innerHTML = `
            <h4>Seyir Tabanlı Melodi Üretici</h4>
            <div class="gen-controls">
                <div class="control-row">
                    <label>Yoğunluk (Density): <span id="densityVal">0.34</span></label>
                    <input type="range" id="melodyDensity" min="0.15" max="0.75" step="0.05" value="0.34">
                </div>
                <div class="control-row">
                    <label>Tohum (Seed): <span id="seedVal">1</span></label>
                    <input type="number" id="melodySeed" min="1" max="9999" value="1">
                </div>
                <div class="btn-group">
                    <button class="btn btn-primary" id="btnGenMelody">✨ Seyir Melodisi Üret</button>
                    <button class="btn btn-secondary" id="btnRandomizeMelody">🎲 Tohum Değiştir</button>
                </div>
            </div>
        `;
        content.appendChild(genSection);

        // Hook Generator Events
        setTimeout(() => {
            const densitySlider = document.getElementById('melodyDensity');
            const densityLabel = document.getElementById('densityVal');
            const seedInput = document.getElementById('melodySeed');
            const seedLabel = document.getElementById('seedVal');
            const btnGen = document.getElementById('btnGenMelody');
            const btnRand = document.getElementById('btnRandomizeMelody');

            if (densitySlider) {
                densitySlider.oninput = (e) => { densityLabel.textContent = e.target.value; };
            }
            if (seedInput) {
                seedInput.oninput = (e) => { seedLabel.textContent = e.target.value; };
            }
            if (btnRand) {
                btnRand.onclick = () => {
                    const newSeed = Math.floor(Math.random() * 999) + 1;
                    seedInput.value = newSeed;
                    seedLabel.textContent = newSeed;
                    if (this.onGenerateMelody) {
                        this.onGenerateMelody(parseFloat(densitySlider.value), newSeed);
                    }
                };
            }
            if (btnGen) {
                btnGen.onclick = () => {
                    if (this.onGenerateMelody) {
                        this.onGenerateMelody(parseFloat(densitySlider.value), parseInt(seedInput.value, 10));
                    }
                };
            }
        }, 10);
    }

    renderChordsTab(content) {
        if (!this.makam) return;

        const intro = document.createElement('div');
        intro.className = 'panel-section';
        intro.innerHTML = `
            <h3>Makam Eşlik ve Dem Seçenekleri</h3>
            <p class="text-muted">Türk musikisinde Batı armonisi kalıpları yerine makamın kendi derecelerinden üretilen Dem ve merdiven yığınları kullanılır.</p>
        `;
        content.appendChild(intro);

        const chordList = getMakamChords(this.makam, this.durakMidi);

        chordList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'candidate-card';

            const top = document.createElement('div');
            top.className = 'candidate-header';

            const title = document.createElement('strong');
            title.textContent = item.name;

            const badges = document.createElement('div');
            badges.className = 'candidate-badges';

            const fitBadge = document.createElement('span');
            fitBadge.className = 'badge badge-fit';
            fitBadge.textContent = `%${item.fit} Uyum`;

            badges.appendChild(fitBadge);

            if (item.microtonal) {
                const microBadge = document.createElement('span');
                microBadge.className = 'badge badge-micro';
                microBadge.textContent = '⚡ Mikrotonal';
                badges.appendChild(microBadge);
            }

            top.appendChild(title);
            top.appendChild(badges);

            const desc = document.createElement('p');
            desc.className = 'candidate-why';
            desc.textContent = item.why;

            const actions = document.createElement('div');
            actions.className = 'candidate-actions';

            const playBtn = document.createElement('button');
            playBtn.className = 'btn btn-sm btn-secondary';
            playBtn.textContent = '🔊 Dinle';
            playBtn.onclick = () => {
                if (this.onAuditionChord) {
                    this.onAuditionChord(item.commas, this.durakMidi);
                }
            };

            const applyBtn = document.createElement('button');
            applyBtn.className = 'btn btn-sm btn-primary';
            applyBtn.textContent = '✅ Seçili Ölçüye Ekle';
            applyBtn.onclick = () => {
                if (this.onApplyChord) {
                    this.onApplyChord(item);
                }
            };

            actions.appendChild(playBtn);
            actions.appendChild(applyBtn);

            card.appendChild(top);
            card.appendChild(desc);
            card.appendChild(actions);

            content.appendChild(card);
        });
    }

    renderBassTab(content) {
        const intro = document.createElement('div');
        intro.className = 'panel-section';
        intro.innerHTML = `
            <h3>Heterofonik Bas Partisi</h3>
            <p class="text-muted">Geleneksel icrada bas enstrümanlar akor kök sesi yerine sürekli dem tutar veya melodiyi alttan sadeleştirerek takip eder.</p>
        `;
        content.appendChild(intro);

        BASS_OPTIONS.forEach(opt => {
            const card = document.createElement('div');
            card.className = 'candidate-card';

            card.innerHTML = `
                <div class="candidate-header">
                    <strong>${opt.name}</strong>
                </div>
                <p class="candidate-why">${opt.why}</p>
                <div class="candidate-actions">
                    <button class="btn btn-sm btn-primary btn-apply-bass" data-kind="${opt.id}">✨ Bu Tarzda Bas Üret</button>
                </div>
            `;

            content.appendChild(card);
        });

        setTimeout(() => {
            content.querySelectorAll('.btn-apply-bass').forEach(b => {
                b.onclick = (e) => {
                    const kind = e.target.dataset.kind;
                    if (this.onGenerateBass) {
                        this.onGenerateBass(kind);
                    }
                };
            });
        }, 10);
    }

    renderDrumsTab(content) {
        if (!this.usul) return;

        const info = document.createElement('div');
        info.className = 'panel-section usul-card';
        info.innerHTML = `
            <h3>${this.usul.name} Usulü (${this.usul.beats}/${this.usul.beatType})</h3>
            <p class="text-muted">${this.usul.character}</p>
            <div class="usul-stroke-bar">
                <strong>Vuruş Dizilimi:</strong>
                <div class="stroke-pills">
                    ${this.usul.strokes.map(s => `<span class="stroke-pill ${s === 'Düm' ? 'stroke-dum' : 'stroke-tek'}">${s || '·'}</span>`).join('')}
                </div>
            </div>
        `;
        content.appendChild(info);

        GROOVE_OPTIONS.forEach(groove => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerHTML = `
                <div class="candidate-header">
                    <strong>${groove.name}</strong>
                </div>
                <p class="candidate-why">${groove.why}</p>
                <div class="candidate-actions">
                    <button class="btn btn-sm btn-primary btn-apply-groove" data-groove="${groove.id}">🥁 Usulü Ritime Yaz</button>
                </div>
            `;
            content.appendChild(card);
        });

        setTimeout(() => {
            content.querySelectorAll('.btn-apply-groove').forEach(b => {
                b.onclick = (e) => {
                    const g = e.target.dataset.groove;
                    if (this.onGenerateDrums) {
                        this.onGenerateDrums(g);
                    }
                };
            });
        }, 10);
    }
}

