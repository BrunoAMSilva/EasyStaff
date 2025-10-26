import { z, defineCollection } from "astro:content";

// Regex used to validate the notation string. Mirrors the JSON Schema pattern
// and accepts:
// - solfege note names: do re mi fa sol la si
// - optional accidentals: # or b
// - optional trailing dashes to extend duration (do-, do--)
// - chords: <name>-chord with optional trailing dashes
// - bracketed simultaneous groups: [do mi- fa]
// - rest: a single dot '.'
const NOTE_PATTERN = /^(?:\s*(?:\.|\[(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)(?:\s+(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?))*\]|(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?-chord(?:-+)?|(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)))(?:\s+(?:\.|\[(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)(?:\s+(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?))*\]|(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?-chord(?:-+)?|(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)))*\s*$/;


const songs = defineCollection({
    type: "data",
    schema: z.object({
        // allow files to include an in-file $schema pointer
        $schema: z.string().optional(),

        // optional metadata
        title: z.string().optional(),
        timeSignature: z.string().regex(/^\d+\/\d+$/).optional(),
        tempo: z.number().min(20).max(300).optional().default(120),
        // staffs: array of { name, notation }
        staffs: z
            .array(
                z.object({
                    name: z.string(),
                    clef: z.enum(["treble", "bass"]).optional().default("treble"),
                    notation: z.string().regex(NOTE_PATTERN, {
                        message: "Invalid notation: tokens must be notes (do,re,mi...), chords (-chord), bracketed groups, or '.' for rests",
                    }),
                })
            )
            .min(1),
    }),
});
export const collections = {songs};

