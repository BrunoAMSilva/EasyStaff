export function getNotePosition(note: string): string {
  const notePositions: { [key: string]: string } = {
    do: 'row-13',
    re: 'row-12',
    mi: 'row-11',
    fa: 'row-10',
    sol: 'row-9',
    la: 'row-7',
    si: 'row-5',
  };
  return notePositions[note] || 'row-1'; // Default position if note not found
}