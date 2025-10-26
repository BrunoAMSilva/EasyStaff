type Token =
  | { type: "note"; value: string; duration: number }
  | { type: "chord"; value: string; duration: number }
  | { type: "rest"; duration: number };

interface Beat {
  tokens: Token[];
}

interface Measure {
    beats: (Beat | null)[];
}

interface StaffData {
    name: string;
    clef: "treble" | "bass";
    measures: Measure[];
}

interface Song {
    staffs: StaffData[];
}
