import { mean, sum } from "mathjs"

export type coverageSets = {
    id: string,
    canonical_smiles: string,
    fingerprint: number[],
    predictions: number
}

export var coverageNameSpace = (sFull: coverageSets[], sPrior: coverageSets[] = []) => {
    if (sPrior.length != 0) {
        sFull = sFull.concat(sPrior)
    }
    let fullFpCounts = getFpCounts(sFull);
    function getFpCounts(subset: coverageSets[]) : {} {
        let fpCount = {};
        subset.map((x) => {
            x.fingerprint.map((y, i) => {
                if (y !== 0) {
                    if (!fpCount[i]) {
                        fpCount[i] = 1;
                    } else {
                        fpCount[i] += 1;
                    }
                }
            });
        });
        return fpCount;
    }

    function getBaseCoverageScores(fpCountsSubset, fpCountsFull, NSubset, NFull) {
        const alpha = 1;
        const PSampled = NSubset / NFull;
        const baseScores = [];
        for (const fp in fpCountsSubset) {
            const count = fpCountsSubset[fp];
            if (fpCountsFull[fp] === NFull) {
                continue;
            }
            const PSmooth = (count + alpha) / (fpCountsFull[fp] + alpha / PSampled);
            baseScores.push(-Math.log(PSmooth / PSampled));
        }
        return baseScores;
    }


    function getFinalCoverageScores(baseScores, fpCountsSubset, NSubset) {
        return baseScores.map((score, i) => {
            const count = Object.values(fpCountsSubset)[i];

            if (typeof count !== 'number' || typeof NSubset !== 'number' || isNaN(count) || isNaN(NSubset)) {
                throw new Error('Invalid count or NSubset value');
            }

            const p1 = count / NSubset;
            const p2 = 1 - p1;

            let H;
            if (count === NSubset) {
                H = 0;
            } else {
                H = -((p1 * Math.log2(p1)) + (p2 * Math.log2(p2))) / Math.log2(2);
            }

            if (score < 0 && count / NSubset > 0.5) {
                return score * (2 - H);
            } else {
                return score * H;
            }
        });
    }
    
    function calculateCoverageScore(sampledIndices: number[]) {       
        let sampled = sampledIndices.map(i => sFull[i]);
        if (sPrior.length != 0) {
            sampled = sFull.concat(sampled)
        };
        let sampledFpCounts = getFpCounts(sampled);
        let baseScores = getBaseCoverageScores(sampledFpCounts, fullFpCounts, sampled.length, sFull.length);
        let finalScores = getFinalCoverageScores(baseScores, sampledFpCounts, sampled.length);
        
        let cumulativeCompoundScore = [];

        sampled.map((x) => {
            x.fingerprint.map((y, i) => {
                let compoundScore = finalScores[Object.keys(sampledFpCounts).at(i)];
                cumulativeCompoundScore.push(compoundScore != undefined ? compoundScore : 0);                    
            })
        })

        let subsetScore = sum(cumulativeCompoundScore);
        let meanPreds = mean(sampled.map(x => x.predictions))
        return [subsetScore, meanPreds]
    }

    return {
        calculateCoverageScore : calculateCoverageScore
    }
}
