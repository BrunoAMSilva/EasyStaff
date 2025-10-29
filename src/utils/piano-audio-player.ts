import * as Tone from 'tone';
import type { Note, Part } from '../content.config';

interface ScheduledNote {
    time: number;
    pitch: string;
    duration: number;
    noteId?: string;
}

export class PianoAudioPlayer {
    private synth: Tone.PolySynth;
    private scheduledNotes: ScheduledNote[] = [];
    private isPlaying: boolean = false;
    private tempo: number = 120;
    private divisionsPerQuarter: number = 1;
    private scheduledEventIds: number[] = [];

    constructor(tempo: number = 120) {
        this.tempo = tempo;
        
        // Create a polyphonic synth with piano-like settings
        // Using FMSynth for more complex harmonics similar to piano
        this.synth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3.01,
            modulationIndex: 14,
            oscillator: {
                type: 'triangle'
            },
            envelope: {
                attack: 0.001,
                decay: 0.3,
                sustain: 0.1,
                release: 1.2
            },
            modulation: {
                type: 'square'
            },
            modulationEnvelope: {
                attack: 0.002,
                decay: 0.2,
                sustain: 0,
                release: 0.2
            },
            volume: -10
        }).toDestination();
        
        // Add a subtle reverb effect for more realistic ambience
        const reverb = new Tone.Reverb({
            decay: 1.5,
            wet: 0.1
        }).toDestination();
        
        this.synth.connect(reverb);
        
        // Set up Transport
        Tone.getTransport().bpm.value = tempo;
    }

    /**
     * Convert MusicXML note data to a playable format
     */
    private noteToFrequency(note: Note): string | null {
        if (!note.pitch) return null;
        
        const { step, octave, alter = 0 } = note.pitch;
        
        // Build note name (e.g., C4, D#5, Eb3)
        let noteName = step;
        if (alter === 1) noteName += '#';
        else if (alter === -1) noteName += 'b';
        
        return `${noteName}${octave}`;
    }

    /**
     * Calculate note duration in quarter notes based on MusicXML duration
     */
    private calculateDurationInBeats(xmlDuration: number): number {
        // Duration in MusicXML is in divisions
        // One quarter note = divisionsPerQuarter divisions
        return xmlDuration / this.divisionsPerQuarter;
    }
    
    /**
     * Calculate note duration in seconds (for Tone.js triggerAttackRelease)
     */
    private calculateDurationInSeconds(xmlDuration: number): number {
        const quarterNoteDuration = 60 / this.tempo; // seconds per quarter note
        return (xmlDuration / this.divisionsPerQuarter) * quarterNoteDuration;
    }

    /**
     * Load notes from MusicXML parts and schedule them
     */
    public loadFromParts(parts: Part[]) {
        this.scheduledNotes = [];
        let currentBeat = 0; // Track position in quarter notes

        // Process first part (usually the main melody)
        if (parts.length === 0 || !parts[0]) return;

        const part = parts[0];
        
        // Get divisions from first measure
        const firstMeasure = part.measures[0];
        if (firstMeasure?.attributes?.divisions) {
            this.divisionsPerQuarter = firstMeasure.attributes.divisions;
        }

        // Process each measure
        for (const measure of part.measures) {
            // Update divisions if changed
            if (measure.attributes?.divisions) {
                this.divisionsPerQuarter = measure.attributes.divisions;
            }

            // Process notes in the measure
            let measureBeat = currentBeat;
            for (const note of measure.notes) {
                const pitch = this.noteToFrequency(note);
                
                if (pitch && !note.isChord) {
                    // Regular note (not a chord continuation)
                    const durationBeats = this.calculateDurationInBeats(note.duration);
                    const durationSeconds = this.calculateDurationInSeconds(note.duration);
                    
                    this.scheduledNotes.push({
                        time: measureBeat, // Store as beats for Transport
                        pitch,
                        duration: durationSeconds // Duration for synth in seconds
                    });
                    
                    measureBeat += durationBeats;
                } else if (pitch && note.isChord) {
                    // Chord note - plays at the same time as previous note
                    const durationSeconds = this.calculateDurationInSeconds(note.duration);
                    
                    // Use the current beat (same as last note)
                    this.scheduledNotes.push({
                        time: currentBeat,
                        pitch,
                        duration: durationSeconds
                    });
                } else if (!pitch) {
                    // Rest or unpitched note
                    const durationBeats = this.calculateDurationInBeats(note.duration);
                    measureBeat += durationBeats;
                }
            }
            
            currentBeat = measureBeat;
        }

        console.log(`Loaded ${this.scheduledNotes.length} notes for playback`);
    }

    /**
     * Start audio playback using Tone.js Transport
     */
    public async play() {
        if (this.isPlaying) return;

        // Initialize Tone.js audio context (required for user interaction)
        await Tone.start();
        console.log('Audio context started');

        this.isPlaying = true;
        
        // Clear any previously scheduled events
        this.clearScheduledEvents();
        
        // Schedule all notes using Transport
        this.scheduleNotesWithTransport();
        
        // Start the Transport
        Tone.getTransport().start();

        console.log('Playback started');
    }

    /**
     * Schedule notes using Tone.js Transport for proper pause/resume
     */
    private scheduleNotesWithTransport() {
        for (const note of this.scheduledNotes) {
            // Convert beat time to Transport notation (quarter notes to seconds at current BPM)
            // Transport.schedule expects time in seconds or Tone.Time notation
            const timeInQuarters = `0:${note.time}:0`; // Format: bars:quarters:sixteenths
            
            const eventId = Tone.getTransport().schedule((time) => {
                this.synth.triggerAttackRelease(
                    note.pitch,
                    note.duration,
                    time
                );
            }, timeInQuarters);
            
            this.scheduledEventIds.push(eventId as number);
        }
    }
    
    /**
     * Clear all scheduled events
     */
    private clearScheduledEvents() {
        for (const eventId of this.scheduledEventIds) {
            Tone.getTransport().clear(eventId);
        }
        this.scheduledEventIds = [];
    }

    /**
     * Pause audio playback
     */
    public pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;

        // Pause the Transport (maintains position)
        Tone.getTransport().pause();
        
        // Release all currently playing notes
        this.synth.releaseAll();

        console.log('Playback paused at', Tone.getTransport().seconds);
    }

    /**
     * Stop and reset playback
     */
    public stop() {
        this.pause();
        
        // Stop and reset Transport to beginning
        Tone.getTransport().stop();
        Tone.getTransport().position = 0;
        
        // Clear scheduled events
        this.clearScheduledEvents();
    }

    /**
     * Update tempo (affects playback speed)
     */
    public setTempo(newTempo: number) {
        this.tempo = newTempo;
        
        // Update Transport BPM
        Tone.getTransport().bpm.value = newTempo;
        
        console.log('Tempo changed to', newTempo);
    }

    /**
     * Clean up resources
     */
    public dispose() {
        this.stop();
        this.synth.dispose();
        Tone.getTransport().cancel();
    }
}
