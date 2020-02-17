interface KugouKrcHeaderField {
    version: number;
    content: {
        language: number;
        type: number;
        lyricContent: string[][];
    }[];
}