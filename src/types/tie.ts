/**
 * Type definitions for tie rendering
 */

export interface TieInfo {
    isStart: boolean;
    isMiddle: boolean;
    isEnd: boolean;
    totalDuration: number; // Only set for start notes
}
