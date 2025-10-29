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
}

/**
 * Prepare notes for audio playback from MusicXML part data
 * Accumulates beats correctly across measures to handle time signature changes
 */
export function prepareNotesForAudio(part: Part): AudioNote[] {
    const firstMeasure = part.measures[0];
    const staves = firstMeasure.attributes?.staves || 1;
    
    let totalBeatsSoFar = 1; // Start at beat 1
    
    return part.measures.flatMap((measure: Measure) => {
        const beats = measure.attributes?.time.beats || 4;
        const measureStartBeat = totalBeatsSoFar;
        
        const currentBeats = new Map<number, number>(
            new Array(staves).fill(0).map((_, idx) => [idx + 1, 0])
        );
        const lastNotes = new Map();
        
        const measureNotes = measure.notes.map((note) => {
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
            
            return {
                note: {
                    pitch: note.pitch,
                    duration: note.duration,
                    type: note.type,
                },
                beat: currentBeat + measureStartBeat - 1,
            };
        }).filter(item => item.note.pitch); // Only include notes with pitch (exclude rests)
        
        // Accumulate total beats for next measure
        totalBeatsSoFar += beats;
        
        return measureNotes;
    });
}
