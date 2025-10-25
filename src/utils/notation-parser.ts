function parseDuration(part: string): number {
    const match = part.match(/-+$/);
    return match ? match[0].length + 1 : 1; // 1 + number of dashes
}

/**
 * Parse a notation line like "do re re . mi-mi-mi . [re fa] ."
 */
function parseNotation(line: string, beatsPerMeasure = 4): Measure[] {
    const measures: Measure[] = [];
    let currentMeasure: Measure = { beats: [] };
    let beatCount = 0;

    // Keep bracketed groups like [do re--- fa] intact as a single part
    const parts = (line.match(/\[[^\]]+\]|[^\s]+/g) || []).filter(Boolean);

    for (const part of parts) {
        let token: Token;


        // Handle simple rest
        if (part === ".") {
            token = { type: "rest", duration: 1 };
        }
        // Bracketed group: notes that start on the same beat, e.g. [do re--- fa]
        else if (part.startsWith("[") && part.endsWith("]")) {
            const inner = part.slice(1, -1).trim();
            const innerParts = inner.split(/\s+/).filter(Boolean);

            const noteTokens: Token[] = innerParts.map((p) => {
                const value = p.replace(/-+$/, "");
                const duration = parseDuration(p);
                return { type: "note", value, duration };
            });

            // The group consumes as many beats as the longest inner duration
            const maxDuration = Math.max(...noteTokens.map((t) => t.duration));

            // Represent the simultaneous notes by a single beat containing multiple note tokens.
            // Use a special token object shaped as multiple note tokens stored in `token` variable
            // by encoding them as a single token with type "chord" and a string value is avoided
            // to keep the rest of the code handling simple. We'll store them as a placeholder
            // token where `value` is unused and we instead attach `notes` property (not in types),
            // but to remain compatible with existing `Token` union we will not change the Token
            // type here; instead we'll set token to a note-like container and handle beats below.
            token = { type: "chord", value: "[group]", duration: maxDuration } as any;

            // attach the actual notes for when we push the starting beat (handled below)
            (token as any).notes = noteTokens;
        }
        else if (part.endsWith("-chord")) {
            const match = part.match(/^([a-zA-Z#b]+-chord)(-*)$/);
            const value = match?.[1] ?? part;
            const duration = (match?.[2]?.length ?? 0) + 1;
            token = { type: "chord", value, duration };
        } else {
            const value = part.replace(/-+$/, "");
            const duration = parseDuration(part);
            token = { type: "note", value, duration };
        }

        // Add token to measure
        // If this is a bracket-group token we created above, it contains a `.notes` array
        // with individual note tokens and a duration equal to the max inner duration.
        if ((token as any).notes) {
            const notes: Token[] = (token as any).notes;
            const totalDuration: number = (token as any).duration;

            for (let i = 0; i < totalDuration; i++) {
                if (i === 0) {
                    // First beat: store all simultaneous notes
                    currentMeasure.beats.push({ tokens: notes });
                } else {
                    // Subsequent beats: placeholders
                    currentMeasure.beats.push(null);
                }

                beatCount++;
                if (beatCount >= beatsPerMeasure) {
                    measures.push(currentMeasure);
                    currentMeasure = { beats: [] };
                    beatCount = 0;
                }
            }
        } else {
            for (let i = 0; i < token.duration; i++) {
                if (i === 0) {
                    // First beat: store token
                    currentMeasure.beats.push({ tokens: [token] });
                } else {
                    // Subsequent beats: placeholders
                    currentMeasure.beats.push(null);
                }

                beatCount++;
                if (beatCount >= beatsPerMeasure) {
                    measures.push(currentMeasure);
                    currentMeasure = { beats: [] };
                    beatCount = 0;
                }
            }
        }
    }

    // Pad last measure with rests if needed
    while (currentMeasure.beats.length < beatsPerMeasure) {
        currentMeasure.beats.push({ tokens: [{ type: "rest", duration: 1 }] });
    }
    measures.push(currentMeasure);

    return measures;
}

export function parseSong(input: any): Song {
    return {
        staffs: input.staffs.map((staff: any) => ({
            name: staff.name,
            measures: parseNotation(staff.notation),
        })),
    };
}