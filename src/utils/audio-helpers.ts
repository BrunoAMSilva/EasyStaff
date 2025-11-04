/**
 * Audio Helper Functions
 * 
 * Utility functions for preparing and managing audio playback data
 */

import type { Part, Measure } from "../content.config";

export interface AudioNote {
    note: {
        pitch?: {
            step: string;
            octave: number;
            alter?: number;
        };
        duration: number;
        type: string;
    };
    beat: number;
    slurStart?: boolean;
    slurStop?: boolean;
}

/**
 * Prepare notes for audio playback from MusicXML part data
 * Accumulates beats correctly across measures to handle time signature changes
 * Handles ties by merging tied notes into single longer notes
 * Handles slurs by marking notes for legato playback
 */
export function prepareNotesForAudio(part: Part): AudioNote[] {
    const firstMeasure = part.measures[0];
    const staves = firstMeasure.attributes?.staves || 1;
    
    let totalBeatsSoFar = 1; // Start at beat 1
    
    // First pass: collect all notes with their positions
    const allNotes: Array<{
        note: any;
        beat: number;
        staff: number;
        measureIndex: number;
    }> = [];
    
    part.measures.forEach((measure: Measure, measureIndex: number) => {
        const beats = measure.attributes?.time.beats || 4;
        const measureStartBeat = totalBeatsSoFar;
        
        const currentBeats = new Map<number, number>(
            new Array(staves).fill(0).map((_, idx) => [idx + 1, 0])
        );
        const lastNotes = new Map();
        
        measure.notes.forEach((note) => {
            const staff = note.staff || 1;
            const beat = currentBeats.get(staff) || 0;
            
            const lastNote = lastNotes.get(staff);
            lastNotes.set(staff, note);
            
            let currentBeat;
            if (!lastNote || note.isChord) {
                currentBeat = beat === 0 ? 1 : beat;
                currentBeats.set(staff, currentBeat);
            } else {
                currentBeat = beat === 0 ? 1 : beat + (lastNote.duration || 1);
                currentBeats.set(staff, currentBeat);
            }
            
            allNotes.push({
                note,
                beat: currentBeat + measureStartBeat - 1,
                staff,
                measureIndex
            });
        });
        
        // Accumulate total beats for next measure
        totalBeatsSoFar += beats;
    });
    
    // Second pass: process ties and slurs
    const audioNotes: AudioNote[] = [];
    const skipIndices = new Set<number>();
    
    for (let i = 0; i < allNotes.length; i++) {
        if (skipIndices.has(i)) continue;
        
        const current = allNotes[i];
        const note = current.note;
        
        // Skip rests (notes without pitch)
        if (!note.pitch) continue;
        
        let duration = note.duration;
        let endBeat = current.beat;
        
        // Check for tie start - merge with subsequent tied notes
        const hasTieStart = note.tie === 'start' || note.notations?.tied?.type === 'start';
        
        if (hasTieStart) {
            // Look ahead for tied notes with matching pitch
            // Continue searching through all notes until we find the matching tied note
            for (let j = i + 1; j < allNotes.length; j++) {
                const nextItem = allNotes[j];
                const nextNote = nextItem.note;
                
                // Skip if not a pitch note
                if (!nextNote.pitch) continue;
                
                // Only tie notes with same pitch, same staff, same voice
                if (nextNote.pitch.step === note.pitch.step &&
                    nextNote.pitch.octave === note.pitch.octave &&
                    (nextNote.pitch.alter || 0) === (note.pitch.alter || 0) &&
                    nextItem.staff === current.staff &&
                    nextNote.voice === note.voice) {
                    
                    const hasTieStop = nextNote.tie === 'stop' || nextNote.notations?.tied?.type === 'stop';
                    
                    if (hasTieStop) {
                        // Add duration of tied note
                        duration += nextNote.duration;
                        endBeat = nextItem.beat;
                        skipIndices.add(j);
                        
                        // If this note also has a tie start, continue looking for more tied notes
                        const hasNextTieStart = nextNote.tie === 'start' || nextNote.notations?.tied?.type === 'start';
                        if (!hasNextTieStart) {
                            // This is the end of the tie chain
                            break;
                        }
                        // Otherwise continue the loop to find the next tied note
                    }
                }
            }
        }
        
        // Check for slur markings
        const slurStart = note.notations?.slur?.type === 'start';
        const slurStop = note.notations?.slur?.type === 'stop';
        
        audioNotes.push({
            note: {
                pitch: note.pitch,
                duration,
                type: note.type,
            },
            beat: current.beat,
            slurStart,
            slurStop,
        });
    }
    
    return audioNotes;
}
