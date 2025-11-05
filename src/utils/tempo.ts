import type { MeasureDirection } from "../content.config";

export function extractTempo(directions: MeasureDirection | MeasureDirection[] | undefined): number {
    if (!directions) return 120;

    const tempoDirection = Array.isArray(directions)
        ? directions.find((dir) => dir.sound?.tempo)
        : directions;

    if (tempoDirection?.sound?.tempo) {
        const parsedTempo = tempoDirection.sound.tempo;
        return Number.isNaN(parsedTempo) ? 120 : parsedTempo;
    }

    return 120;
}