/**
 * Microtonal Standard MIDI File (SMF Type 1) Generator
 *
 * Emits 4-track Standard MIDI Files compatible with all DAWs (Logic, Ableton, FL Studio, Cubase, Reaper):
 *  - Track 1: Melodi (Channel 1) with per-note microtonal Pitch Bend events
 *  - Track 2: Eşlik / Dem (Channel 2)
 *  - Track 3: Bas (Channel 3)
 *  - Track 4: Usul Ritim / Vurmalı (Channel 10)
 */

import { place } from '../theory/tuning.js';

const PPQ = 480; // Pulses (Ticks) per quarter note

/** Writes a Variable Length Quantity (VLQ) for MIDI delta time */
function writeVLQ(value) {
    const bytes = [];
    let buffer = value & 0x7F;
    while ((value >>= 7) > 0) {
        buffer <<= 8;
        buffer |= ((value & 0x7F) | 0x80);
    }
    while (true) {
        bytes.push(buffer & 0xFF);
        if (buffer & 0x80) {
            buffer >>= 8;
        } else {
            break;
        }
    }
    return bytes;
}

/** Converts pitch bend in cents (+/- 200 cents standard range) to 14-bit MIDI Pitch Wheel */
function centsToPitchBend(cents, bendRangeSemis = 2.0) {
    const maxCents = bendRangeSemis * 100.0;
    const clampedCents = Math.max(-maxCents, Math.min(maxCents, cents));
    const factor = clampedCents / maxCents; // -1.0 to +1.0
    const raw = Math.round(8192 + (factor * 8191));
    const value = Math.max(0, Math.min(16383, raw));
    return {
        lsb: value & 0x7F,
        msb: (value >> 7) & 0x7F
    };
}

/** Builds a single MIDI track from a list of timed note events */
function buildTrack(events, channel, trackName = '') {
    const rawEvents = [];

    // Track Name Meta Event
    if (trackName) {
        const nameBytes = Array.from(new TextEncoder().encode(trackName));
        rawEvents.push({
            tick: 0,
            priority: 0,
            bytes: [0xFF, 0x03, nameBytes.length, ...nameBytes]
        });
    }

    // Convert notes into NoteOn / NoteOff and PitchBend events
    for (const ev of events) {
        const startTick = Math.round(ev.startBeat * PPQ);
        const durationTick = Math.max(1, Math.round(ev.lengthBeats * PPQ));
        const endTick = startTick + durationTick;
        const vel = Math.max(1, Math.min(127, Math.round((ev.velocity || 0.8) * 127)));

        // Microtonal Pitch Bend
        if (channel !== 9 && ev.detuneCents && Math.abs(ev.detuneCents) > 0.01) {
            const pb = centsToPitchBend(ev.detuneCents);
            rawEvents.push({
                tick: Math.max(0, startTick - 1), // Place immediately before note-on
                priority: 1,
                bytes: [0xE0 | (channel & 0x0F), pb.lsb, pb.msb]
            });
        }

        // Note On
        rawEvents.push({
            tick: startTick,
            priority: 2,
            bytes: [0x90 | (channel & 0x0F), ev.pitch & 0x7F, vel]
        });

        // Note Off
        rawEvents.push({
            tick: endTick,
            priority: 3,
            bytes: [0x80 | (channel & 0x0F), ev.pitch & 0x7F, 0]
        });
    }

    // Sort events strictly by tick, then priority
    rawEvents.sort((a, b) => {
        if (a.tick !== b.tick) return a.tick - b.tick;
        return a.priority - b.priority;
    });

    // End of Track Meta Event
    const lastTick = rawEvents.length > 0 ? rawEvents[rawEvents.length - 1].tick : 0;
    rawEvents.push({
        tick: lastTick + PPQ,
        priority: 9,
        bytes: [0xFF, 0x2F, 0x00]
    });

    // Convert to delta-time byte stream
    const trackBytes = [];
    let currentTick = 0;

    for (const ev of rawEvents) {
        const delta = Math.max(0, ev.tick - currentTick);
        currentTick = ev.tick;

        trackBytes.push(...writeVLQ(delta));
        trackBytes.push(...ev.bytes);
    }

    // Track chunk header: "MTrk" + 4-byte length
    const len = trackBytes.length;
    return [
        0x4D, 0x54, 0x72, 0x6B,
        (len >> 24) & 0xFF,
        (len >> 16) & 0xFF,
        (len >> 8) & 0xFF,
        len & 0xFF,
        ...trackBytes
    ];
}

/**
 * Builds the Tempo & Conductor Track
 */
function buildTempoTrack(bpm, beatsPerBar = 4, beatUnit = 4) {
    const microsecPerQuarter = Math.round(60000000 / bpm);
    const trackBytes = [
        // Delta 0, Time Signature: beatsPerBar, log2(beatUnit), 24 clocks/quarter, 8 32nds/quarter
        0x00, 0xFF, 0x58, 0x04,
        beatsPerBar & 0xFF,
        Math.round(Math.log2(beatUnit)) & 0xFF,
        24, 8,

        // Delta 0, Set Tempo
        0x00, 0xFF, 0x51, 0x03,
        (microsecPerQuarter >> 16) & 0xFF,
        (microsecPerQuarter >> 8) & 0xFF,
        microsecPerQuarter & 0xFF,

        // Delta PPQ, End of Track
        ...writeVLQ(PPQ),
        0xFF, 0x2F, 0x00
    ];

    const len = trackBytes.length;
    return [
        0x4D, 0x54, 0x72, 0x6B,
        (len >> 24) & 0xFF,
        (len >> 16) & 0xFF,
        (len >> 8) & 0xFF,
        len & 0xFF,
        ...trackBytes
    ];
}

/**
 * Creates a Standard MIDI File (.mid) binary Blob from the current song data.
 *
 * @param {object} songData - { melody: [], chords: [], bass: [], drums: [] }
 * @param {number} bpm
 * @param {object} usul
 * @returns {Blob}
 */
export function exportMidiFile(songData, bpm = 100, usul = null) {
    const beats = usul ? usul.beats : 4;
    const beatType = usul ? usul.beatType : 4;

    const tempoTrack = buildTempoTrack(bpm, beats, beatType);

    // Flatten chord events to note events
    const chordNotes = [];
    for (const ch of (songData.chords || [])) {
        if (ch.commas && ch.commas.length > 0) {
            const durak = ch.durakMidiNote || 62;
            for (const comma of ch.commas) {
                const p = place(durak, comma);
                chordNotes.push({
                    pitch: p.note,
                    detuneCents: p.detuneCents,
                    startBeat: ch.startBeat,
                    lengthBeats: ch.lengthBeats,
                    velocity: 0.72
                });
            }
        }
    }

    const melodyTrack = buildTrack(songData.melody || [], 0, 'Makam Melodi');
    const chordsTrack = buildTrack(chordNotes, 1, 'Makam Eşlik / Dem');
    const bassTrack   = buildTrack(songData.bass || [], 2, 'Makam Bas');
    const drumTrack   = buildTrack(songData.drums || [], 9, 'Usul Vurmalı');

    const numTracks = 5;

    // MIDI Header Chunk: "MThd", length=6, format=1, tracks=5, division=480
    const headerChunk = [
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x01, // Format 1
        (numTracks >> 8) & 0xFF, numTracks & 0xFF,
        (PPQ >> 8) & 0xFF, PPQ & 0xFF
    ];

    const fileBytes = new Uint8Array([
        ...headerChunk,
        ...tempoTrack,
        ...melodyTrack,
        ...chordsTrack,
        ...bassTrack,
        ...drumTrack
    ]);

    return new Blob([fileBytes], { type: 'audio/midi' });
}

/**
 * Generates and triggers browser download of the MIDI file.
 */
export function downloadMidiFile(songData, bpm = 100, usul = null, fileName = 'makam_proje.mid') {
    const blob = exportMidiFile(songData, bpm, usul);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

