/**
 * Audio Engine for Piano Sound Synthesis
 * 
 * This module provides piano sound generation using the Web Audio API.
 * It creates realistic piano-like sounds using a combination of oscillators
 * and envelope shaping to simulate the attack, decay, sustain, and release
 * characteristics of a real piano.
 */

import type { Note } from "../content.config";

/**
 * Convert a note (step, octave, alter) to frequency in Hz
 * Uses A4 = 440Hz as reference
 */
export function noteToFrequency(step: string, octave: number, alter: number = 0): number {
    // Map note steps to semitones from C
    const stepToSemitone: Record<string, number> = {
        'C': 0,
        'D': 2,
        'E': 4,
        'F': 5,
        'G': 7,
        'A': 9,
        'B': 11,
    };

    const semitone = stepToSemitone[step.toUpperCase()];
    if (semitone === undefined) {
        console.warn(`Unknown note step: ${step}`);
        return 440; // Default to A4
    }

    // Calculate semitones from A4 (A4 = 440Hz, reference point)
    // A4 is in octave 4, and is the 9th semitone (A)
    const semitonesFromA4 = (octave - 4) * 12 + (semitone - 9) + alter;
    
    // Use equal temperament: frequency = 440 * 2^(n/12)
    return 440 * Math.pow(2, semitonesFromA4 / 12);
}

/**
 * Piano Audio Player
 * Manages audio playback synchronized with the partiture
 */
export class PianoAudioPlayer {
    private audioContext: AudioContext | null = null;
    private scheduledNotes: Map<number, { stopTime: number; gainNode: GainNode }> = new Map();
    private isInitialized: boolean = false;
    private masterGain: GainNode | null = null;
    private noteIdCounter: number = 0;
    private cleanupTimer: number | null = null;

    constructor() {
        // Audio context will be created on first user interaction
    }

    /**
     * Get or create a singleton instance
     */
    private static instance: PianoAudioPlayer | null = null;
    
    static getInstance(): PianoAudioPlayer {
        if (!PianoAudioPlayer.instance) {
            PianoAudioPlayer.instance = new PianoAudioPlayer();
        }
        return PianoAudioPlayer.instance;
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    async initialize(delay: number): Promise<void> {
        if (this.isInitialized) return;

        try {
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Master volume at 30%
            this.masterGain.connect(this.audioContext.destination);
            await new Promise(resolve => setTimeout(resolve, delay));
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }

    /**
     * Play a single note with piano-like characteristics
     */
    private playNote(frequency: number, startTime: number, duration: number, velocity: number = 0.7): void {
        if (!this.audioContext || !this.masterGain) return;

        const now = this.audioContext.currentTime;
        const actualStartTime = Math.max(now, startTime);
        const stopTime = actualStartTime + duration;

        // Create oscillators for a richer piano sound
        // Fundamental frequency
        const osc1 = this.audioContext.createOscillator();
        osc1.type = 'triangle'; // Triangle wave for a softer, more piano-like tone
        osc1.frequency.setValueAtTime(frequency, actualStartTime);

        // Slight detuning for warmth
        const osc2 = this.audioContext.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(frequency * 1.001, actualStartTime);

        // Higher harmonic for brightness
        const osc3 = this.audioContext.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(frequency * 2, actualStartTime);

        // Create gain nodes for each oscillator
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();

        // Mix oscillators with different levels
        gain1.gain.value = 0.4 * velocity;
        gain2.gain.value = 0.3 * velocity;
        gain3.gain.value = 0.1 * velocity; // Subtle harmonic

        // Create envelope gain node
        const envelopeGain = this.audioContext.createGain();
        
        // Piano envelope: fast attack, exponential decay
        const attackTime = 0.002; // 2ms attack
        const decayTime = 0.3; // 300ms decay
        const sustainLevel = 0.4;
        const releaseTime = 0.5; // 500ms release

        // Set envelope
        envelopeGain.gain.setValueAtTime(0, actualStartTime);
        envelopeGain.gain.linearRampToValueAtTime(1, actualStartTime + attackTime);
        envelopeGain.gain.exponentialRampToValueAtTime(
            sustainLevel,
            actualStartTime + attackTime + decayTime
        );
        
        // Release phase
        envelopeGain.gain.setValueAtTime(sustainLevel, stopTime);
        envelopeGain.gain.exponentialRampToValueAtTime(0.001, stopTime + releaseTime);

        // Connect audio graph
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        
        gain1.connect(envelopeGain);
        gain2.connect(envelopeGain);
        gain3.connect(envelopeGain);
        
        envelopeGain.connect(this.masterGain);

        // Schedule oscillators
        osc1.start(actualStartTime);
        osc2.start(actualStartTime);
        osc3.start(actualStartTime);

        osc1.stop(stopTime + releaseTime);
        osc2.stop(stopTime + releaseTime);
        osc3.stop(stopTime + releaseTime);

        // Store reference for potential early stopping
        const noteId = ++this.noteIdCounter;
        this.scheduledNotes.set(noteId, { stopTime, gainNode: envelopeGain });

        // Schedule periodic cleanup if not already scheduled
        this.scheduleCleanup();
    }

    /**
     * Periodically clean up finished notes
     */
    private scheduleCleanup(): void {
        if (this.cleanupTimer !== null) return;
        
        this.cleanupTimer = window.setInterval(() => {
            if (!this.audioContext) return;
            
            const now = this.audioContext.currentTime;
            const toDelete: number[] = [];
            
            this.scheduledNotes.forEach((value, key) => {
                if (now > value.stopTime + 0.5) {
                    toDelete.push(key);
                }
            });
            
            toDelete.forEach(key => this.scheduledNotes.delete(key));
            
            // Stop cleanup timer if no notes are scheduled
            if (this.scheduledNotes.size === 0 && this.cleanupTimer !== null) {
                window.clearInterval(this.cleanupTimer);
                this.cleanupTimer = null;
            }
        }, 1000);
    }

    /**
     * Schedule notes for playback based on MusicXML data
     * @param notes Array of notes with timing information
     * @param beatsPerMinute Tempo
     * @param divisions Duration divisions per quarter note
     * @param startBeat Beat number to start from (for seeking)
     * @param delayMs Optional delay in milliseconds before starting playback
     */
    scheduleNotes(
        notes: Array<{ note: Note; beat: number }>,
        beatsPerMinute: number,
        divisions: number,
        startBeat: number = 0
    ): void {
        if (!this.audioContext || !this.isInitialized) return;

        const now = this.audioContext.currentTime;
        const secondsPerBeat = 60 / beatsPerMinute;
        const secondsPerDivision = secondsPerBeat / divisions;

        notes.forEach(({ note, beat }) => {
            // Skip notes before the start beat
            if (beat < startBeat) return;

            // Skip if note doesn't have pitch (might be a rest)
            if (!note.pitch) return;

            const frequency = noteToFrequency(
                note.pitch.step,
                note.pitch.octave,
                note.pitch.alter || 0
            );

            // Calculate timing relative to start beat, including the delay
            const beatOffset = beat - startBeat;
            const startTime = now + (beatOffset * secondsPerBeat);
            const duration = note.duration * secondsPerDivision;

            // Play the note
            this.playNote(frequency, startTime, duration);
        });
    }

    /**
     * Stop all currently playing notes immediately
     */
    stopAll(): void {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        
        this.scheduledNotes.forEach(({ gainNode }) => {
            try {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            } catch (error) {
                // Ignore errors from already-stopped notes
            }
        });

        this.scheduledNotes.clear();
        
        // Stop cleanup timer
        if (this.cleanupTimer !== null) {
            window.clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Set master volume (0 to 1)
     */
    setVolume(volume: number): void {
        if (!this.masterGain) return;
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.value = clampedVolume;
    }

    /**
     * Clean up resources
     */
    async dispose(): Promise<void> {
        this.stopAll();
        
        if (this.cleanupTimer !== null) {
            window.clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close();
        }
        
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
    }

    /**
     * Check if audio is initialized
     */
    get initialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Get the current audio context time in seconds
     * Returns null if audio context is not initialized
     */
    getCurrentTime(): number | null {
        if (!this.audioContext || !this.isInitialized) return null;
        return this.audioContext.currentTime;
    }
}
