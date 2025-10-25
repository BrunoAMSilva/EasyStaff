interface Note {
    name: string;
    /* color: string; */
    duration: number;
    octave?: number;
    isSharp?: boolean;
    isFlat?: boolean;
    isNatural?: boolean;
}