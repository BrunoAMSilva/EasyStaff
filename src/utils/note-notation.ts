export type Notation = 'letter' | 'solfege';

export function getNoteName(step: string, notation: Notation): string {
    if (notation === 'letter') return step;

    const solfegeMap: Record<string, string> = {
        'C': 'Do',
        'D': 'Re',
        'E': 'Mi',
        'F': 'Fa',
        'G': 'Sol',
        'A': 'La',
        'B': 'Si'
    };

    return solfegeMap[step] || step;
}