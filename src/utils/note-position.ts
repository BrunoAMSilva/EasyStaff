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

export function getNoteFinger(note: string, clef: 'treble' | 'bass'): number {
  const noteFingers: { [key: string]: number } = {
    'treble-do': 1,
    'treble-re': 2,
    'treble-mi': 3,
    'treble-fa': 4,
    'treble-sol': 5,
    'treble-la': 6,
    'treble-si': 7,
    'bass-do': 1,
    'bass-re': 2,
    'bass-mi': 3,
    'bass-fa': 4,
    'bass-sol': 5,
    'bass-la': 6,
    'bass-si': 7,
  };
  return noteFingers[`${clef}-${note}`] || 0;
}