/**
 * 4-Channel Mixer & Instrument Router Component
 */

import { INSTRUMENTS } from '../audio/synthVoice.js';
import { AHENK_LIST } from '../theory/tuning.js';

export class Mixer {
    constructor(containerElement, audioEngine, options = {}) {
        this.container = containerElement;
        this.engine = audioEngine;

        this.onAhenkChange = options.onAhenkChange || null;
        this.selectedAhenk = AHENK_LIST[0]; // Default Bolahenk (D4 = 62)

        this.mutes = { melody: false, chords: false, bass: false, drums: false };
        this.solos = { melody: false, chords: false, bass: false, drums: false };
        this.volumes = { melody: 1.0, chords: 0.75, bass: 0.80, drums: 0.85, master: 0.85 };

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="mixer-container">
                <div class="mixer-header">
                    <h4>🎚️ Mikser & Enstrümanlar</h4>
                    <div class="ahenk-selector-group">
                        <label for="ahenkSelect">Ahenk Akordu:</label>
                        <select id="ahenkSelect" class="form-select">
                            ${AHENK_LIST.map((a, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${a.name} (${a.durakName}) - ${a.description}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="mixer-strips">
                    <!-- 1. Melodi Strip -->
                    <div class="channel-strip" data-channel="melody">
                        <div class="channel-label">🎼 Melodi</div>
                        <select class="inst-select form-select" data-channel="melody">
                            <option value="${INSTRUMENTS.MEY}">Mey / Balaban (Ufak Kamış)</option>
                            <option value="${INSTRUMENTS.CLARINET}">Klarnet (Sol Klarnet / Trakya)</option>
                            <option value="${INSTRUMENTS.KAVAL}">Kaval / Sipsi (Nefesli)</option>
                            <option value="${INSTRUMENTS.NEY}" selected>Ney (Nefesli)</option>
                            <option value="${INSTRUMENTS.TANBUR}">Tanbur / Bağlama</option>
                            <option value="${INSTRUMENTS.UD}">Ud / Kanun</option>
                            <option value="${INSTRUMENTS.STRINGS}">Yaylılar / Keman</option>
                        </select>
                        <div class="fader-group">
                            <input type="range" class="fader" min="0" max="1.5" step="0.05" value="${this.volumes.melody}" data-channel="melody">
                            <span class="vol-text">100%</span>
                        </div>
                        <div class="mute-solo-group">
                            <button class="btn-ms btn-mute" data-channel="melody">M</button>
                            <button class="btn-ms btn-solo" data-channel="melody">S</button>
                        </div>
                    </div>

                    <!-- 2. Eşlik Strip -->
                    <div class="channel-strip" data-channel="chords">
                        <div class="channel-label">🎻 Dem & Eşlik</div>
                        <select class="inst-select form-select" data-channel="chords">
                            <option value="${INSTRUMENTS.DRONE}" selected>Dem Drone (Organ)</option>
                            <option value="${INSTRUMENTS.STRINGS}">Yaylı Grubu</option>
                            <option value="${INSTRUMENTS.UD}">Kanun / Ud</option>
                        </select>
                        <div class="fader-group">
                            <input type="range" class="fader" min="0" max="1.5" step="0.05" value="${this.volumes.chords}" data-channel="chords">
                            <span class="vol-text">75%</span>
                        </div>
                        <div class="mute-solo-group">
                            <button class="btn-ms btn-mute" data-channel="chords">M</button>
                            <button class="btn-ms btn-solo" data-channel="chords">S</button>
                        </div>
                    </div>

                    <!-- 3. Bas Strip -->
                    <div class="channel-strip" data-channel="bass">
                        <div class="channel-label">🎸 Bas</div>
                        <select class="inst-select form-select" data-channel="bass">
                            <option value="${INSTRUMENTS.BASS_PLAIN}" selected>Akustik Bas</option>
                            <option value="${INSTRUMENTS.BASS_808}">808 Sub Bas</option>
                            <option value="${INSTRUMENTS.BASS_REESE}">Reese Bas</option>
                        </select>
                        <div class="fader-group">
                            <input type="range" class="fader" min="0" max="1.5" step="0.05" value="${this.volumes.bass}" data-channel="bass">
                            <span class="vol-text">80%</span>
                        </div>
                        <div class="mute-solo-group">
                            <button class="btn-ms btn-mute" data-channel="bass">M</button>
                            <button class="btn-ms btn-solo" data-channel="bass">S</button>
                        </div>
                    </div>

                    <!-- 4. Vurmalı Strip -->
                    <div class="channel-strip" data-channel="drums">
                        <div class="channel-label">🥁 Usul Vurmalı</div>
                        <select class="inst-select form-select" data-channel="drums">
                            <option value="turkish" selected>Kudüm / Bendir / Def</option>
                            <option value="acoustic">Akustik Davul Kiti</option>
                            <option value="808">808 Elektronik Davul</option>
                        </select>
                        <div class="fader-group">
                            <input type="range" class="fader" min="0" max="1.5" step="0.05" value="${this.volumes.drums}" data-channel="drums">
                            <span class="vol-text">85%</span>
                        </div>
                        <div class="mute-solo-group">
                            <button class="btn-ms btn-mute" data-channel="drums">M</button>
                            <button class="btn-ms btn-solo" data-channel="drums">S</button>
                        </div>
                    </div>

                    <!-- Master Volume -->
                    <div class="channel-strip master-strip">
                        <div class="channel-label">🔊 Master</div>
                        <div class="fader-group" style="margin-top: 32px;">
                            <input type="range" class="fader" min="0" max="1.2" step="0.05" value="${this.volumes.master}" data-channel="master">
                            <span class="vol-text">85%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        // Ahenk select
        const ahenkSelect = this.container.querySelector('#ahenkSelect');
        if (ahenkSelect) {
            ahenkSelect.onchange = (e) => {
                const idx = parseInt(e.target.value, 10);
                this.selectedAhenk = AHENK_LIST[idx];
                if (this.onAhenkChange) {
                    this.onAhenkChange(this.selectedAhenk);
                }
            };
        }

        // Instrument dropdowns
        this.container.querySelectorAll('.inst-select').forEach(sel => {
            sel.onchange = (e) => {
                const ch = e.target.dataset.channel;
                const val = e.target.value;
                if (ch === 'melody') this.engine.melodyInstrument = val;
                if (ch === 'chords') this.engine.chordInstrument = val;
                if (ch === 'bass')   this.engine.bassInstrument = val;
                if (ch === 'drums')  this.engine.drumKit = val;
            };
        });

        // Volume faders
        this.container.querySelectorAll('.fader').forEach(fader => {
            fader.oninput = (e) => {
                const ch = e.target.dataset.channel;
                const val = parseFloat(e.target.value);
                this.volumes[ch] = val;
                const textSpan = e.target.parentElement.querySelector('.vol-text');
                if (textSpan) textSpan.textContent = `${Math.round(val * 100)}%`;
                this.updateAudioGains();
            };
        });

        // Mute / Solo buttons
        this.container.querySelectorAll('.btn-mute').forEach(btn => {
            btn.onclick = (e) => {
                const ch = e.target.dataset.channel;
                this.mutes[ch] = !this.mutes[ch];
                e.target.classList.toggle('active', this.mutes[ch]);
                this.updateAudioGains();
            };
        });

        this.container.querySelectorAll('.btn-solo').forEach(btn => {
            btn.onclick = (e) => {
                const ch = e.target.dataset.channel;
                this.solos[ch] = !this.solos[ch];
                e.target.classList.toggle('active', this.solos[ch]);
                this.updateAudioGains();
            };
        });
    }

    updateAudioGains() {
        const hasAnySolo = Object.values(this.solos).some(Boolean);

        ['melody', 'chords', 'bass', 'drums'].forEach(ch => {
            let gain = this.volumes[ch];
            if (this.mutes[ch]) {
                gain = 0;
            } else if (hasAnySolo && !this.solos[ch]) {
                gain = 0;
            }
            this.engine.setChannelVolume(ch, gain);
        });

        this.engine.setChannelVolume('master', this.volumes.master);
    }
}

