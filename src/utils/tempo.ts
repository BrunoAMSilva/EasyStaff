import type { MeasureDirection } from "../content.config";

export function extractTempo(directions: MeasureDirection | MeasureDirection[] | undefined): number {
    console.log("Extracting tempo from directions:", directions);
    if (!directions) return 120;

    console.log("isArray:", Array.isArray(directions));
    const tempoDirection = Array.isArray(directions)
        ? directions.find((dir) => dir.sound?.tempo)
        : directions;

    if (tempoDirection?.sound?.tempo) {
        const parsedTempo = tempoDirection.sound.tempo;
        return Number.isNaN(parsedTempo) ? 120 : parsedTempo;
    }

    return 120;
}