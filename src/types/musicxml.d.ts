export interface Work {
    workTitle: string;
}

export interface MeasureAttributesKey {
    fifths: number;
    mode?: string;
}

export interface MeasureAttributesTime {
    beats: number;
    beatType: number;
}

export interface Clef {
    sign: string;
    line: number;
    number?: number;
}

export interface MeasureAttributes {
    divisions: number;
    key: MeasureAttributesKey;
    staves?: number;
    time: MeasureAttributesTime;
    clef: Clef | Clef[];
}

export interface Metronome {
    parentheses?: 'yes' | 'no';
    beatUnit: string;
    perMinute: string;
}

export interface DirectionSound {
    tempo: string;
}

export interface MeasureDirection {
    placement?: 'above' | 'below';
    system?: 'only-top' | 'only-bottom' | 'yes';
    directionType: Metronome;
    staff?: number;
    sound?: DirectionSound;
}

export interface NotePitch {
    step: string;
    octave: number;
    alter?: number;
}

export interface TechnicalNotation {
    fingering?: string;
}

export interface NoteNotations {
    technical?: TechnicalNotation;
    slur?: Slur;
}

export interface Slur {
    type: 'start' | 'stop';
    number?: number;
}

export interface Note {
    pitch: NotePitch;
    duration: number;
    voice: number;
    type: string;
    stem?: string;
    staff?: number;
    notations?: NoteNotations;
}

export interface Measure {
    number: string;
    attributes?: MeasureAttributes;
    directions?: MeasureDirection;
    notes: Note[];
}

export interface Part {
    id: string;
    measures: Measure[];
}

export interface ScorePartwise {
    work?: Work;
    parts: Part[];
}