import { z, defineCollection } from "astro:content";
import { musicXMLLoader } from "./utils/musicxml-loader";

// Regex used to validate the notation string. Mirrors the JSON Schema pattern
// and accepts:
// - solfege note names: do re mi fa sol la si
// - optional accidentals: # or b
// - optional trailing dashes to extend duration (do-, do--)
// - chords: <name>-chord with optional trailing dashes
// - bracketed simultaneous groups: [do mi- fa]
// - rest: a single dot '.'
const NOTE_PATTERN = /^(?:\s*(?:\.|\[(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)(?:\s+(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?))*\]|(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?-chord(?:-+)?|(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)))(?:\s+(?:\.|\[(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)(?:\s+(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?))*\]|(?:(?:do|re|mi|fa|sol|la|si)(?:[#b])?-chord(?:-+)?|(?:do|re|mi|fa|sol|la|si)(?:[#b])?(?:-+)?)))*\s*$/;

// Define the schema for ScorePartwise objects from MusicXML
const scorePartwiseSchema = z.object({
    work: z.object({
        workTitle: z.string(),
    }).optional(),
    parts: z.array(z.object({
        id: z.string(),
        measures: z.array(z.object({
            number: z.string(),
            attributes: z.object({
                divisions: z.number(),
                key: z.object({
                    fifths: z.number(),
                    mode: z.string().optional(),
                }),
                time: z.object({
                    beats: z.number(),
                    beatType: z.number(),
                }),
                staves: z.number().optional(),
                clef: z.union([
                    z.object({
                        sign: z.string(),
                        line: z.number(),
                        number: z.number().optional(),
                    }),
                    z.array(z.object({
                        sign: z.string(),
                        line: z.number(),
                        number: z.number().optional(),
                    })),
                ]),
            }).optional(),
            directions: z.object({
                placement: z.enum(['above', 'below']).optional(),
                system: z.enum(['only-top', 'only-bottom', 'yes']).optional(),
                directionType: z.object({
                    parentheses: z.string().optional(),
                    beatUnit: z.string(),
                    perMinute: z.string(),
                }),
                staff: z.number().optional(),
                sound: z.object({
                    tempo: z.string(),
                }).optional(),
            }).optional(),
            notes: z.array(z.object({
                pitch: z.object({
                    step: z.string(),
                    octave: z.number(),
                    alter: z.number().optional(),
                }),
                duration: z.number(),
                voice: z.number(),
                type: z.string(),
                stem: z.string().optional(),
                staff: z.number().optional(),
                notations: z.object({
                    technical: z.object({
                        fingering: z.string().optional(),
                    }).optional(),
                    slur: z.object({
                        type: z.enum(['start', 'stop']),
                        number: z.number().optional(),
                    }).optional(),
                }).optional(),
            })),
        })),
    })),
});

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

const partitures = defineCollection({
    loader: musicXMLLoader(),
    schema: scorePartwiseSchema,
});

export const collections = { songs, partitures };

