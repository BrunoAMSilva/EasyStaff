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

export function getNoteLinePosition(note: string, octave: number, clef: 'treble' | 'bass'): number {
  const basePositions: { [key: string]: number } = {
    'treble-C': 13,
    'treble-D': 12,
    'treble-E': 11,
    'treble-F': 10,
    'treble-G': 9,
    'treble-A': 7,
    'treble-B': 5,
    'bass-C': 14,
    'bass-D': 13,
    'bass-E': 12,
    'bass-F': 11,
    'bass-G': 10,
    'bass-A': 9,
    'bass-B': 8,
  };
  const basePosition = basePositions[`${clef}-${note}`] || 1;
  const adjustedPosition = basePosition - (octave - 4) * 7; // Adjust for octave
  return adjustedPosition;
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