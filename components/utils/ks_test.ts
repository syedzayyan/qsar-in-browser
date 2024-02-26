function ksStatistic(obsOne: number[], obsTwo: number[]): number {
    const cdfOne: number[] = obsOne.slice().sort((a, b) => a - b);
    const cdfTwo: number[] = obsTwo.slice().sort((a, b) => a - b);

    let i: number = 0;
    let j: number = 0;
    let d: number = 0.0;
    let fn1: number = 0.0;
    let fn2: number = 0.0;
    const l1: number = cdfOne.length;
    const l2: number = cdfTwo.length;

    while (i < l1 && j < l2) {
        const d1: number = cdfOne[i];
        const d2: number = cdfTwo[j];

        if (d1 <= d2) {
            i++;
            fn1 = i / l1;
        }

        if (d2 <= d1) {
            j++;
            fn2 = j / l2;
        }

        const dist: number = Math.abs(fn2 - fn1);

        if (dist > d) {
            d = dist;
        }
    }

    return d;
}

function ksSignificance(alam: number): number {
    const EPS1: number = 0.001;
    const EPS2: number = 1.0e-8;

    let fac: number = 2.0;
    let sum: number = 0.0;
    let termBf: number = 0.0;

    const a2: number = -2.0 * alam * alam;

    for (let j: number = 1; j <= 100; j++) {
        const term: number = fac * Math.exp(a2 * j * j);
        sum += term;

        if (Math.abs(term) <= EPS1 * termBf || Math.abs(term) <= EPS2 * sum) {
            return sum;
        }

        fac = -fac;
        termBf = Math.abs(term);
    }

    return 1.0; // failing to converge
}

export function ksTest(obsOne: number[], obsTwo: number[]): number {
    const d: number = ksStatistic(obsOne, obsTwo);
    const l1: number = obsOne.length;
    const l2: number = obsTwo.length;

    const en: number = Math.sqrt((l1 * l2) / (l1 + l2));
    return ksSignificance(en + 0.12 + 0.11 / en); // magic numbers
}

