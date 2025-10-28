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

const KeyAttributeSchema = z.object({
    fifths: z.number(),
    mode: z.string().optional(),
});

export interface KeyAttribute extends z.infer<typeof KeyAttributeSchema> { }

const TimeAttributeSchema = z.object({
    beats: z.number(),
    beatType: z.number(),
});

export interface TimeAttribute extends z.infer<typeof TimeAttributeSchema> { }

const ClefSchema = z.object({
    sign: z.string(),
    line: z.number(),
    number: z.number().optional(),
});

export interface Clef extends z.infer<typeof ClefSchema> { }

const MeasureAttributesSchema = z.object({
    divisions: z.number(),
    key: KeyAttributeSchema,
    staves: z.number().optional(),
    time: TimeAttributeSchema,
    clef: z.union([ClefSchema, z.array(ClefSchema)]),
});

export interface MeasureAttributes extends z.infer<typeof MeasureAttributesSchema> { }

const MetronomeSchema = z.object({
    parentheses: z.enum(['yes', 'no']).optional(),
    beatUnit: z.string(),
    perMinute: z.string(),
});

export interface Metronome extends z.infer<typeof MetronomeSchema> { }

const DirectionSoundSchema = z.object({
    tempo: z.string(),
});

export interface DirectionSound extends z.infer<typeof DirectionSoundSchema> { }

const MeasureDirectionSchema = z.object({
    placement: z.enum(['above', 'below']).optional(),
    system: z.enum(['only-top', 'only-bottom', 'yes']).optional(),
    directionType: MetronomeSchema,
    staff: z.number().optional(),
    sound: DirectionSoundSchema.optional(),
});

export interface MeasureDirection extends z.infer<typeof MeasureDirectionSchema> { }

const NotePitchSchema = z.object({
    step: z.string(),
    octave: z.number(),
    alter: z.number().optional(),
});

export interface NotePitch extends z.infer<typeof NotePitchSchema> { }

const TechnicalNotationSchema = z.object({
    fingering: z.string().optional(),
});

export interface TechnicalNotation extends z.infer<typeof TechnicalNotationSchema> { }

const SlurSchema = z.object({
    type: z.enum(['start', 'stop']),
    number: z.number().optional(),
});

export interface Slur extends z.infer<typeof SlurSchema> { }

const NoteNotationsSchema = z.object({
    technical: TechnicalNotationSchema.optional(),
    slur: SlurSchema.optional(),
});

export interface NoteNotations extends z.infer<typeof NoteNotationsSchema> { }

const NoteSchema = z.object({
    pitch: NotePitchSchema.optional(),
    isChord: z.boolean().optional(),
    duration: z.number(),
    voice: z.number(),
    type: z.string(),
    stem: z.string().optional(),
    staff: z.number().optional(),
    notations: NoteNotationsSchema.optional(),
});

export interface Note extends z.infer<typeof NoteSchema> { }

const MeasureSchema = z.object({
    number: z.string(),
    attributes: MeasureAttributesSchema.optional(),
    directions: MeasureDirectionSchema.optional(),
    notes: z.array(NoteSchema),
});

export interface Measure extends z.infer<typeof MeasureSchema> { }

const PartSchema = z.object({
    id: z.string(),
    measures: z.array(MeasureSchema),
});

export interface Part extends z.infer<typeof PartSchema> { }

const WorkSchema = z.object({
    workTitle: z.string(),
});

export interface Work extends z.infer<typeof WorkSchema> { }

const ScorePartwiseSchema = z.object({
    work: WorkSchema.optional(),
    parts: z.array(PartSchema),
});

export interface ScorePartwise extends z.infer<typeof ScorePartwiseSchema> { }

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
    schema: ScorePartwiseSchema,
});

export const collections = { songs, partitures };

