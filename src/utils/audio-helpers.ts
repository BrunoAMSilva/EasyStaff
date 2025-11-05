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
 * Helper function to check if two notes are equivalent for tie merging
 * @param note1 First note to compare
 * @param note2 Second note to compare
 * @param staff1 Staff of first note
 * @param staff2 Staff of second note
 * @returns true if notes have same pitch, staff, and voice
 */
function areNotesEquivalent(
    note1: import("../content.config").Note,
    note2: import("../content.config").Note,
    staff1: number,
    staff2: number
): boolean {
    if (!note1.pitch || !note2.pitch) return false;
    
    return note1.pitch.step === note2.pitch.step &&
           note1.pitch.octave === note2.pitch.octave &&
           (note1.pitch.alter || 0) === (note2.pitch.alter || 0) &&
           staff1 === staff2 &&
           note1.voice === note2.voice;
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
        note: import("../content.config").Note;
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
        
        // Check for tie start - merge with subsequent tied notes
        const hasTieStart = note.tie === 'start' || note.notations?.tied?.type === 'start';
        
        if (hasTieStart) {
            // Continue searching through all subsequent notes to find and merge all notes in a chain of ties
            // with matching pitch, staff, and voice
            for (let j = i + 1; j < allNotes.length; j++) {
                const nextItem = allNotes[j];
                const nextNote = nextItem.note;
                
                // Skip if not a pitch note
                if (!nextNote.pitch) continue;
                
                // Check if this note can be tied with the current note
                if (areNotesEquivalent(note, nextNote, current.staff, nextItem.staff)) {
                    const hasTieStop = nextNote.tie === 'stop' || nextNote.notations?.tied?.type === 'stop';
                    
                    if (hasTieStop) {
                        // Add duration of tied note
                        duration += nextNote.duration;
                        skipIndices.add(j);
                        
                        // If this note also has a tie start, continue looking for more tied notes in the chain
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
