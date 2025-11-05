import type { NoteStep } from "../content.config";

const NOTES_MAP = {
  'C': 1,
  'D': 2,
  'E': 3,
  'F': 4,
  'G': 5,
  'A': 6,
  'B': 7,
} as const;

const NOTE_ORDER: NoteStep[] = ["C", "D", "E", "F", "G", "A", "B"];

const NOTE_INDEX = NOTE_ORDER.reduce<Record<NoteStep, number>>((acc, step, index) => {
  acc[step] = index;
  return acc;
}, {} as Record<NoteStep, number>);

const CLEF_ANCHORS: Record<"treble" | "bass", { row: number; octave: number; stepIndex: number }> = {
  treble: { row: 13, octave: 4, stepIndex: NOTE_INDEX.C },
  bass: { row: 14, octave: 4, stepIndex: NOTE_INDEX.C },
};
export function getNotePosition(note: string, clef: 'treble' | 'bass'): string {
  const notePositions: { [key: string]: string } = {
    'treble-do': 'row-13',
    'treble-re': 'row-12',
    'treble-mi': 'row-11',
    'treble-fa': 'row-10',
    'treble-sol': 'row-9',
    'treble-la': 'row-7',
    'treble-si': 'row-5',
    'bass-do': 'row-8',
    'bass-re': 'row-7',
    'bass-mi': 'row-6',
    'bass-fa': 'row-5',
    'bass-sol': 'row-4',
    'bass-la': 'row-3',
    'bass-si': 'row-2',
  };
  return notePositions[`${clef}-${note}`] || 'row-1'; // Default position if note not found
}

export function getNoteLinePosition(note: NoteStep, octave: number, clef: "treble" | "bass"): number {
  const anchor = CLEF_ANCHORS[clef] ?? CLEF_ANCHORS.treble;
  const noteIndex = NOTE_INDEX[note];

  if (noteIndex === undefined) {
    return anchor.row;
  }

  const octaveOffset = (octave - anchor.octave) * NOTE_ORDER.length;
  const stepOffset = noteIndex - anchor.stepIndex;
  // Each step corresponds to a line or space in the staff grid, so we slide from the anchor
  return anchor.row - (octaveOffset + stepOffset);
}


export function getNoteFinger(note: string, clef: 'treble' | 'bass'): number {
  const noteFingers: { [key: string]: number } = {
    'treble-do': 1,
    'treble-re': 2,
    'treble-mi': 3,
    'treble-fa': 1,
    'treble-sol': 2,
    'treble-la': 3,
    'treble-si': 4,
    'bass-do': 5,
    'bass-re': 4,
    'bass-mi': 3,
    'bass-fa': 2,
    'bass-sol': 3,
    'bass-la': 2,
    'bass-si': 1,
  };
  return noteFingers[`${clef}-${note}`] || 0;
}

const LIMIT_NOTES = ['A', 'C', 'E', 'G', 'B'];
const UPPER_OCTAVE_TREBLE = 54;
const LOWER_OCTAVE_TREBLE = 43;
const UPPER_OCTAVE_BASS = 36;
const LOWER_OCTAVE_BASS = 25;

export function requiresSupportingLine(note: NoteStep, octave: number, clef: 'treble' | 'bass'): boolean {
  const noteValue = NOTES_MAP[note];
  if (noteValue === undefined) return false;
  const value = Number.parseInt(`${octave}${noteValue}`, 10);
  if (clef === 'treble') {
    return (
      (value < LOWER_OCTAVE_TREBLE && LIMIT_NOTES.includes(note)) ||
      (value > UPPER_OCTAVE_TREBLE && LIMIT_NOTES.includes(note))
    );
  }
  return (
    (value < LOWER_OCTAVE_BASS && LIMIT_NOTES.includes(note)) ||
    (value > UPPER_OCTAVE_BASS && LIMIT_NOTES.includes(note))
  );

}