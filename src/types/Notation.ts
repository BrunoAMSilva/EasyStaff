export type Token =
  | { type: "note"; value: string; duration: number }
  | { type: "chord"; value: string; duration: number }
  | { type: "rest"; duration: number };

export interface Beat {
  tokens: Token[];
}

export interface Measure {
  beats: (Beat | null)[];
}

export interface StaffData {
  name: string;
  clef: "treble" | "bass";
  measures: Measure[];
}

export interface Song {
  title: string;
  staffs: StaffData[];
  timeSignature: string;
  tempo: number;
}
