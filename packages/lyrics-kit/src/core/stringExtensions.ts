import _ from "lodash";

export function isCaseInsensitiveSimilar(self: string, other: string): boolean {
    const s1 = self.toLowerCase(), s2 = other.toLowerCase();
    return s1.indexOf(s2) >= 0 || s1.indexOf(s1) >= 0;
}

export function distance(
    self: string, other: string,
    options: {
        substitutionCost?: number, insertionCost?: number, deletionCost?: number
    }
): number {
    options = _.defaultTo(options, {
        substitutionCost: 1, 
        insertionCost: 1, 
        deletionCost: 1
    });
    const { substitutionCost, insertionCost, deletionCost } = options;
    let d: number[] = _.range(other.length);
    let t = 0;
    for (const c1 of self) {
        t = d[0];
        d[0] += 1;
        for (let i = 0; i < other.length; i++) {
            const c2 = other[i];
            let t2 = d[i + 1];
            if (c1 === c2) {
                d[i + 1] = t;
            } else {
                d[i + 1] = Math.min(t + substitutionCost, d[i] + insertionCost, t2 + deletionCost);
            }
            t = t2;
        }
    }
    return d[d.length - 1];
}

/** similarity(s1: string, s2: string) */
export function similarity(s1: string, s2: string): number {
    const len = Math.min(s1.length, s2.length);
    const diff = Math.min(
        distance(s1, s2, {insertionCost: 0}),
        distance(s1, s2, {deletionCost: 0}),
    );
    return (len - diff) / len;
}

/** similarity(s1: string, in s2: string) */
export function similarityIn(s1: string, s2: string): number {
    const len = Math.min(s1.length, s2.length);
    const diff = distance(s1, s2, { insertionCost: 0 })
    return (len - diff) / len;
}