export type Notation = 'letter' | 'solfege';

const solfegeMap: Record<string, string> = {
    'C': 'Do',
    'D': 'Re',
    'E': 'Mi',
    'F': 'Fa',
    'G': 'Sol',
    'A': 'La',
    'B': 'Si'
};

export function getNoteName(step: string, notation: Notation): string {
    if (notation === 'letter') return step;

    return solfegeMap[step] || step;
}