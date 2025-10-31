import { XMLParser } from 'fast-xml-parser';
import type {
    MeasureAttributes,
    Part,
    ScorePartwise,
    Work,
    Measure,
    Note,
    NotePitch,
    MeasureDirection,
    Clef,
    KeyAttribute,
    TimeAttribute,
    NoteNotations,
    DirectionSound
} from '../content.config';

/**
 * MusicXML Parser
 * 
 * This module provides a clean, modular parser for MusicXML files.
 * Each parsing function is separated for easy maintenance and testing.
 * The parser returns a ScorePartwise object that matches the TypeScript definitions.
 * 
 * Supported Features:
 * - Work information (title, etc.)
 * - Multiple parts with unique IDs
 * - Measure attributes (time signature, key signature, clefs, staves)
 * - Note parsing with pitch, duration, voice, staff assignment
 * - Technical notations (fingering)
 * - Slur markings
 * - Measure directions and metronome markings
 * - Proper error handling and validation
 * 
 * Usage:
 * ```typescript
 * import { parseMusicXML, getMusicXMLStats } from './music-xml-parser';
 * 
 * const xmlContent = readFileSync('score.musicxml', 'utf-8');
 * const score = parseMusicXML(xmlContent);
 * const stats = getMusicXMLStats(score);
 * ```
 */

/**
 * Parse work information from score-partwise
 */
function parseWork(scorePartwise: any): Work {
    if (scorePartwise?.work?.['work-title']) {
        return { workTitle: scorePartwise.work['work-title'] };
    }
    return { workTitle: 'Untitled' };
}

/**
 * Parse key signature from attributes
 */
function parseKey(keyData: any): KeyAttribute {
    return {
        fifths: keyData?.fifths ? parseInt(keyData.fifths) : 0,
        mode: keyData?.mode || undefined
    };
}

/**
 * Parse time signature from attributes
 */
function parseTime(timeData: any): TimeAttribute {
    return {
        beats: timeData?.beats ? parseInt(timeData.beats) : 4,
        beatType: timeData?.['beat-type'] ? parseInt(timeData['beat-type']) : 4
    };
}

/**
 * Parse clef information from attributes
 */
function parseClef(clefData: any): Clef | Clef[] {
    if (Array.isArray(clefData)) {
        return clefData.map(clef => ({
            sign: clef.sign || 'G',
            line: clef.line ? parseInt(clef.line) : 2,
            number: clef['@_number'] ? parseInt(clef['@_number']) : undefined
        }));
    } else {
        return {
            sign: clefData?.sign || 'G',
            line: clefData?.line ? parseInt(clefData.line) : 2,
            number: clefData?.['@_number'] ? parseInt(clefData['@_number']) : undefined
        };
    }
}

/**
 * Parse measure attributes
 */
function parseMeasureAttributes(attributesData: any): MeasureAttributes | undefined {
    if (!attributesData) return undefined;

    return {
        divisions: attributesData.divisions ? parseInt(attributesData.divisions) : 1,
        key: parseKey(attributesData.key),
        time: parseTime(attributesData.time),
        staves: attributesData.staves ? parseInt(attributesData.staves) : undefined,
        clef: attributesData.clef ? parseClef(attributesData.clef) : { sign: 'G', line: 2 }
    };
}

function parseSound(soundData: unknown): DirectionSound | undefined {
    if (!soundData || typeof soundData !== "object") return undefined;
    const tempo = "@_tempo" in soundData && typeof soundData['@_tempo'] === "number" ? soundData['@_tempo'] : undefined;
    const dynamics = "@_dynamics" in soundData && typeof soundData['@_dynamics'] === "number" ? soundData['@_dynamics'] : undefined;

    return {
        tempo: tempo,
        dynamics: dynamics || undefined
    };
}

/**
 * Parse a single direction from measure data
 */
function parseSingleDirection(directionData: any): MeasureDirection | undefined {
    if (!directionData) return undefined;
    const directionType = directionData['direction-type'] || directionData['metronome'];
    if (!directionType) return undefined;

    let parsedDirectionType: any = {};

    if (directionType.metronome) {
        parsedDirectionType = {
            parentheses: directionType.metronome['@_parentheses'] || 'no',
            beatUnit: directionType.metronome['beat-unit'] || 'quarter',
            perMinute: directionType.metronome?.['per-minute']?.toString() || '120'
        };
    }
    return {
        placement: directionData['@_placement'] as 'above' | 'below' | undefined,
        system: directionData['@_system'] as 'only-top' | 'only-bottom' | 'yes' | undefined,
        directionType: parsedDirectionType,
        staff: directionData.staff ? parseInt(directionData.staff) : undefined,
        sound: directionData.sound ? parseSound(directionData.sound) : undefined
    };
}

/**
 * Parse direction information from measure
 */
function parseDirection(directionData: any): MeasureDirection | MeasureDirection[] | undefined {
    if (!directionData) return undefined;

    // Handle array of directions
    if (Array.isArray(directionData)) {
        return directionData.map(dir => parseSingleDirection(dir)).filter((dir): dir is MeasureDirection => dir !== undefined);
    }

    return parseSingleDirection(directionData);
}

/**
 * Parse pitch information from note
 */
function parsePitch(pitchData: any): NotePitch {
    return {
        step: pitchData?.step || 'C',
        octave: pitchData?.octave ? parseInt(pitchData.octave) : 4,
        alter: pitchData?.alter ? parseInt(pitchData.alter) : undefined
    };
}

/**
 * Parse note notations including technical markings, slurs, and ties
 * 
 * @param notationsData - Raw notations data from XML
 * @returns Parsed NoteNotations object or undefined if no notations
 */
function parseNotations(notationsData: any): NoteNotations | undefined {
    if (!notationsData) return undefined;

    const notations: NoteNotations = {};

    // Parse technical notations (fingering, etc.)
    if (notationsData.technical?.fingering) {
        notations.technical = {
            fingering: notationsData.technical.fingering.toString()
        };
    }

    // Parse slur markings
    if (notationsData.slur) {
        const slurData = Array.isArray(notationsData.slur) ? notationsData.slur[0] : notationsData.slur;
        notations.slur = {
            type: slurData['@_type'] as 'start' | 'stop',
            number: slurData['@_number'] ? parseInt(slurData['@_number']) : undefined
        };
    }

    // Parse tied notes (different from tie elements in note)
    if (notationsData.tied) {
        const tiedData = Array.isArray(notationsData.tied) ? notationsData.tied[0] : notationsData.tied;
        // Add tied notation support if needed by the type system
    }

    return Object.keys(notations).length > 0 ? notations : undefined;
}

/**
 * Parse a single note from measure data
 * 
 * @param noteData - Raw note data from XML parser
 * @returns Parsed Note object or null if it's a rest or invalid note
 */
function parseNote(noteData: any): Note | null {
    // Handle rests
    if (noteData.rest !== undefined) {
        const measureRest = noteData.rest['@_measure'] === 'yes';
        return {
            isChord: false,
            duration: noteData.duration ? parseInt(noteData.duration) : 1,
            voice: noteData.voice ? parseInt(noteData.voice) : 1,
            type: noteData.type || 'quarter',
            rest: {
                measure: measureRest ? 'yes' : undefined
            },
            staff: noteData.staff ? parseInt(noteData.staff) : 1,
        };
    }

    // Skip notes without pitch (backup elements, etc.)
    if (!noteData.pitch) return null;


    try {
        return {
            isChord: noteData.chord === '' ? true : false,
            pitch: parsePitch(noteData.pitch),
            duration: noteData.duration ? parseInt(noteData.duration) : 1,
            voice: noteData.voice ? parseInt(noteData.voice) : 1,
            type: noteData.type || 'quarter',
            stem: noteData.stem || undefined,
            staff: noteData.staff ? parseInt(noteData.staff) : undefined,
            notations: parseNotations(noteData.notations)
        };
    } catch (error) {
        console.warn('Failed to parse note:', noteData, error);
        return null;
    }
}

/**
 * Parse notes from measure, handling both single notes and arrays
 */
function parseNotes(noteData: any): Note[] {
    if (!noteData) return [];

    const notes = Array.isArray(noteData) ? noteData : [noteData];
    return notes
        .map(parseNote)
        .filter((note): note is Note => note !== null);
}

/**
 * Parse a single measure
 */
function parseMeasure(measureData: any): Measure {
    return {
        number: measureData['@_number']?.toString() || '1',
        attributes: parseMeasureAttributes(measureData.attributes),
        directions: parseDirection(measureData.direction),
        notes: parseNotes(measureData.note)
    };
}

/**
 * Parse measures from part data
 */
function parseMeasures(measureData: any): Measure[] {
    if (!measureData) return [];

    const measures = Array.isArray(measureData) ? measureData : [measureData];
    return measures.map(parseMeasure);
}

/**
 * Parse a single part
 */
function parsePart(partData: any, partId: string): Part {
    return {
        id: partId,
        measures: parseMeasures(partData.measure)
    };
}

/**
 * Parse parts from score-partwise
 */
function parseParts(scorePartwise: any): Part[] {
    const partData = scorePartwise?.part;
    if (!partData) return [];

    const parts = Array.isArray(partData) ? partData : [partData];
    return parts.map((part: any, index: number) => {
        const partId = part['@_id'] || `P${index + 1}`;
        return parsePart(part, partId);
    });
}

/**
 * Validate the parsed ScorePartwise object
 * 
 * @param scorePartwise - The parsed score object
 * @returns true if valid, throws error if invalid
 */
function validateScorePartwise(scorePartwise: ScorePartwise): boolean {
    if (!scorePartwise.work) {
        throw new Error('Invalid ScorePartwise: Missing work information');
    }

    if (!Array.isArray(scorePartwise.parts) || scorePartwise.parts.length === 0) {
        throw new Error('Invalid ScorePartwise: No parts found');
    }

    for (const part of scorePartwise.parts) {
        if (!part.id) {
            throw new Error('Invalid ScorePartwise: Part missing ID');
        }
        if (!Array.isArray(part.measures)) {
            throw new Error(`Invalid ScorePartwise: Part ${part.id} has no measures`);
        }
    }

    return true;
}

/**
 * Main MusicXML parser function
 * 
 * Parses a MusicXML string and returns a structured ScorePartwise object.
 * The parser is modular and handles various MusicXML elements including:
 * - Work information (title, etc.)
 * - Parts and measures
 * - Notes with pitch, duration, and notations
 * - Time signatures, key signatures, and clefs
 * - Measure attributes and directions
 * 
 * @param xmlContent - The MusicXML content as a string
 * @returns Parsed ScorePartwise object
 * @throws Error if parsing fails or XML is invalid
 */
export function parseMusicXML(xmlContent: string): ScorePartwise {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        parseTagValue: true
    });

    try {
        const doc = parser.parse(xmlContent);
        const scorePartwise = doc['score-partwise'];

        if (!scorePartwise) {
            throw new Error('Invalid MusicXML: No score-partwise element found');
        }

        const result: ScorePartwise = {
            work: parseWork(scorePartwise),
            parts: parseParts(scorePartwise)
        };

        // Validate the result before returning
        validateScorePartwise(result);

        return result;
    } catch (error) {
        console.error('Error parsing MusicXML:', error);
        throw new Error(`Failed to parse MusicXML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Utility function to get basic statistics about a parsed MusicXML
 * 
 * @param scorePartwise - Parsed ScorePartwise object
 * @returns Object containing basic statistics
 */
export function getMusicXMLStats(scorePartwise: ScorePartwise): {
    title: string;
    partCount: number;
    measureCount: number;
    noteCount: number;
} {
    const noteCount = scorePartwise.parts.reduce((total: number, part: Part) => {
        return total + part.measures.reduce((measureTotal: number, measure: Measure) => {
            return measureTotal + measure.notes.length;
        }, 0);
    }, 0);

    const measureCount = scorePartwise.parts.reduce((total: number, part: Part) => {
        return total + part.measures.length;
    }, 0);

    return {
        title: scorePartwise.work?.workTitle || 'Untitled',
        partCount: scorePartwise.parts.length,
        measureCount,
        noteCount
    };
}