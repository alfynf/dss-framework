import { CriteriaType, DssMethodType } from '@prisma/client';
import prisma from '../prisma';
import { buildCriteriaTree } from './topics.js';

export const createDss = async (topicId) => {
  const creatorId = 1;

  const dss = await prisma.dss.create({
    data: { creatorId, topicId },
  });

  return dss;
};

export const updateDssMethod = async (dssId, method) => {
  const dss = await prisma.dss.updateMany({
    where: { dssId: dssId },
    data: { method: method },
  });

  return dss;
};

export const getDss = async () => {
  const dss = await prisma.dss.findMany({
    select: {
      dssId: true,
      topic: {
        select: {
          name: true,
          description: true,
        },
      },
      creator: {
        select: {
          name: true,
        },
      },
    },
  });

  return dss;
};

export const getDetailDss = async (dssId) => {
  const dss = await prisma.dss.findUnique({
    select: {
      dssId: true,
      topic: {
        select: {
          topicId: true,
          name: true,
          description: true,
        },
      },
      method: true,
      creator: {
        select: {
          name: true,
        },
      },
      dssAlternatives: {
        select: {
          dssAlternativeId: true,
          alternative: {
            select: {
              alternativeId: true,
              name: true,
            },
          },
          rankValue: true,
          sValue: true,
        },
      },
      dssCriterias: {
        select: {
          dssCriteriaId: true,
          criteria: {
            select: {
              criteriaId: true,
              name: true,
              description: true,
              type: true,
              weight: true,
              parentCriteriaId: true,
            },
          },
        },
      },
      dssCriteriaAlternatives: {
        select: {
          dssCriteriaAlternativeId: true,
          alternative: {
            select: {
              alternativeId: true,
              name: true,
            },
          },
          criteria: {
            select: {
              criteriaId: true,
              name: true,
            },
          },
          value: true,
        },
      },
    },
    where: { dssId: parseInt(dssId) },
  });

  const criteriaList = dss.dssCriterias.flatMap(Object.values);
  dss.dssCriterias = buildCriteriaTree(criteriaList);
  return dss;
};

export const addCriterias = async (data) => {
  const _ = await prisma.dssCriteriaAlternative.createMany({
    data: data,
  });

  return;
};

export const saveDssScore = async (dssId, ranking) => {
    // console.log(dssId);
    // console.log(ranking)
    await Promise.all(
        ranking.map((data) =>
          prisma.dssAlternative.updateMany({
            where: {dssId: dssId, alternativeId: data.alternativeId},
            data: { sValue: data.score, rankValue: data.ranking }
          })
        )
      );
    return;
};

export const getDssResult = async (dssId) => {
  const dss = await prisma.dss.findUnique({
    select: {
      dssId: true,
      dssAlternatives: {
        select: {
          dssAlternativeId: true,
          alternative: {
            select: {
              alternativeId: true,
              name: true,
            },
          },
          rankValue: true,
          sValue: true,
        },
      },
    },
    where: { dssId: parseInt(dssId) },
  });
  return dss;
};

export const calculateDss = async (dssId, method) => {
  const dss = await prisma.dss.findUnique({
    where: { dssId: dssId },
    select: {
      dssId: true,
      dssCriterias: {
        select: {
          criteria: {
            select: {
              criteriaId: true,
              name: true,
              weight: true,
              parentCriteriaId: true,
              type: true,
            },
          },
        },
      },
      dssCriteriaAlternatives: {
        select: {
          alternative: {
            select: {
              alternativeId: true,
              name: true,
            },
          },
          criteria: {
            select: {
              criteriaId: true,
              name: true,
              type: true,
              weight: true,
              parentCriteriaId: true,
            },
          },
          value: true,
        },
      },
    },
  });

    let criterias = dss.dssCriterias.flatMap(Object.values);   
    const weightedCriteria = calculateFinalWeights(criterias);
    const weightMap = Object.fromEntries(
        weightedCriteria.map((c) => [c.criteriaId, c.finalWeight])
      );
    let alternatives = dss.dssCriteriaAlternatives

    alternatives = Object.values(alternatives.reduce((acc, { alternative, criteria, value }) => {
        const { alternativeId, name } = alternative;
        if (!acc[alternativeId]) {
          acc[alternativeId] = { alternativeId, name, values: {} };
        }
        acc[alternativeId].values[criteria.criteriaId] = value;
        return acc;
      }, {}));   


    let methodResult = []

    if (method == DssMethodType.WP) {
        methodResult = Object.entries(calculateWP(weightMap, alternatives, criterias))   
    } else if (method == DssMethodType.SAW) {
        const normalizedAlternatives = normalizeSawAlternatives(criterias, alternatives);
        methodResult = Object.entries(calculateSAW(weightMap, normalizedAlternatives, criterias))   
    } else if (method == DssMethodType.TOPSIS) {
        const result = calculateTopsis(alternatives, criterias)
        // console.log("method result: ", result);
    };
    const ranking = methodResult
            .map(([alternativeId, score]) => ({ alternativeId: Number(alternativeId), score })) 
            .sort((a, b) => b.score - a.score)
            .map((item, index) => ({ ...item, ranking: index + 1 }));   
    
    console.log("ranking: ", ranking)
    await saveDssScore(dssId, ranking);
    return;
};

function normalizeSawAlternatives(criteria, alternatives) {
    let minMaxValues = {};

  // Cari nilai min/max sesuai tipe criteria
  criteria.forEach((criterion) => {
    let values = alternatives
      .map((alt) => alt.values[criterion.criteriaId])
      .filter((v) => v !== undefined); // Hapus undefined

    let min = values.length > 0 ? Math.min(...values) : 0;
    let max = values.length > 0 ? Math.max(...values) : 0;

    minMaxValues[criterion.criteriaId] =
      criterion.type === 'BENEFIT' ? max : min;
  });

  // Update nilai di alternatives sesuai dengan min/max yang udah dicari
  alternatives.forEach((alt) => {
    Object.keys(alt.values).forEach((key) => {
      let criteriaId = Number(key); // Key dalam object values itu string, convert ke number
      let normalizer = minMaxValues[criteriaId] || 1; // Pakai 1 biar nggak bagi 0

      if (normalizer !== 0) {
        alt.values[criteriaId] = alt.values[criteriaId] / normalizer;
      }
    });
  });

  return alternatives;
}

function calculateFinalWeights(criteria, parentId = null) {
  const filtered = criteria.filter((c) => c.parentCriteriaId === parentId);
  const totalWeight = filtered.reduce((sum, c) => sum + c.weight, 0);

  return filtered.flatMap((c) => {
    const finalWeight = parseFloat(
      (c.weight * (1 / (totalWeight || 1))).toFixed(3)
    );
    // const finalWeight = parentId ? c.weight * (1 / totalWeight) : c.weight;
    return [
      { ...c, finalWeight },
      ...calculateFinalWeights(criteria, c.criteriaId),
    ];
  });
}

function calculateWP(
  weightMap,
  alternatives,
  criteria,
  parentCriteriaId = null
) {
  // console.log("PARENTID: ", parentCriteriaId)
  const filteredCriteria = criteria.filter(
    (c) => c.parentCriteriaId === parentCriteriaId
  );
  // console.log("filteredCriteria: ", filteredCriteria)
  if (filteredCriteria.length === 0) return {}; // Base case

  let scores = {};

  filteredCriteria.forEach((criterion) => {
    const subScores = calculateWP(
      weightMap,
      alternatives,
      criteria,
      criterion.criteriaId
    );
    //   console.log("subscore:", subScores);
    alternatives.forEach((alt) => {
      // console.log(Object.keys(subScores).length > 0);
      // console.log("subscore dalam alt: ", subScores);
      const subScore =
        Object.keys(subScores).length > 0
          ? Math.pow(
              subScores[alt.alternativeId],
              weightMap[criterion.criteriaId]
            )
          : Math.pow(
              alt.values[criterion.criteriaId] || 1,
              weightMap[criterion.criteriaId] || 0
            );

      // console.log("scores di criteria %s dan alt %d adalah: %d", criterion.criteriaId, alt.alternativeId, subScore )

      scores[alt.alternativeId] = (scores[alt.alternativeId] || 1) * subScore;
    });
  });
  return scores;
}

function calculateSAW(
  weightMap,
  alternatives,
  criteria,
  parentCriteriaId = null
) {
  console.log('PARENTID: ', parentCriteriaId);
  const filteredCriteria = criteria.filter(
    (c) => c.parentCriteriaId === parentCriteriaId
  );
  console.log('filteredCriteria: ', filteredCriteria);
  if (filteredCriteria.length === 0) return {}; // Base case
  let scores = {};

  filteredCriteria.forEach((criterion) => {
    const subScores = calculateSAW(
      weightMap,
      alternatives,
      criteria,
      criterion.criteriaId
    );
    //   console.log("subscore:", subScores);
    alternatives.forEach((alt) => {
      // console.log(Object.keys(subScores).length > 0);
      // console.log("subscore dalam alt: ", subScores);
      const subScore =
        Object.keys(subScores).length > 0
          ? subScores[alt.alternativeId] * weightMap[criterion.criteriaId] // SAW pakai tambah, bukan kali
          : (alt.values[criterion.criteriaId] || 0) *
            weightMap[criterion.criteriaId];

      // console.log("scores di criteria %s dan alt %d adalah: %d", criterion.criteriaId, alt.alternativeId, subScore )

      scores[alt.alternativeId] = (scores[alt.alternativeId] || 0) + subScore;
    });
    // console.log("scores: ",scores)
    // console.log("FINISH PARENTID: ", parentCriteriaId)
    })
    return scores;
}

function calculateTopsis(alternatives, criterias) {
    const dNorm = normalizeTopsisAlternatives(criterias, alternatives);

    const criteriaIds = criterias.map(c => c.criteriaId);

    let weightedMatrix = dNorm.map(alt => ({
        alternativeId: alt.alternativeId,
        name: alt.name,
        values: Object.fromEntries(
            criteriaIds.map(cId => {
                let weight = criterias.find(c => c.criteriaId === cId)?.weight || 0;
                return [cId, alt.values[cId] * weight];
            })
        ),
    }));

    let gabungan = calculateRecursiveValues(criterias, weightedMatrix)
    console.log("gabungan: ", gabungan)

    let idealBest = {}, idealWorst = {};
    criteriaIds.forEach(cId => {
        let isBenefit = criterias.find(c => c.criteriaId === cId)?.type === "BENEFIT";
        let values = gabungan.map(alt => alt.values[cId]);
        idealBest[cId] = isBenefit ? Math.max(...values) : Math.min(...values);
        idealWorst[cId] = isBenefit ? Math.min(...values) : Math.max(...values);
    });

    let scores = gabungan.map(alt => {
        let dPlus = Math.sqrt(
            criteriaIds.reduce((sum, cId) => sum + Math.pow(alt.values[cId] - idealBest[cId], 2), 0)
        );
        let dMinus = Math.sqrt(
            criteriaIds.reduce((sum, cId) => sum + Math.pow(alt.values[cId] - idealWorst[cId], 2), 0)
        );
        return {
            alternativeId: alt.alternativeId,
            name: alt.name,
            score: dMinus / (dPlus + dMinus),
        };
    });

    return scores;
}

function calculateRecursiveValues(criterias, alternatives) {
    // Buat mapping criteria berdasarkan ID
    const criteriaMap = Object.fromEntries(criterias.map(c => [c.criteriaId, c]));
    console.log("criteriaMap: ", criteriaMap);

    // Fungsi rekursif untuk menghitung nilai root criteria
    function computeCriteriaValue(criteriaId, values) {
        const criteria = criteriaMap[criteriaId];
        if (!criteria) return 0; // Jika tidak ditemukan, return 0

        // Cari subcriteria
        const subCriteria = criterias.filter(c => c.parentCriteriaId === criteriaId);
        
        if (subCriteria.length === 0) {
            // Jika ini adalah leaf node (kriteria tanpa subcriteria), gunakan nilai langsung
            return values[criteriaId] || 0;
        }

        // Hitung nilai berdasarkan subcriteria
        let value = 1;
        subCriteria.forEach(sub => {
            const subValue = computeCriteriaValue(sub.criteriaId, values); // Rekursi ke subcriteria
            value *= subValue * sub.weight; // Kalikan hasil perhitungan subcriteria dengan bobotnya
        });

        // Kalikan dengan bobot root criteria setelah semua subcriteria dihitung
        return value * criteria.weight;
    }

    // Iterasi untuk setiap alternatif
    alternatives.forEach(alt => {
        criterias.forEach(root => {
            if (root.parentCriteriaId === null) {
                // Hanya hitung untuk root criteria (parentCriteriaId === null)
                alt.values[root.criteriaId] = computeCriteriaValue(root.criteriaId, alt.values);
            }
        });
    });

    return alternatives;
}
  

function normalizeTopsisAlternatives(criteria, alternatives) {
    let sumSquares = {};

    // Step 1: Hitung SUMSQ (ΣX²) per kriteria
    criteria.forEach((criterion) => {
        sumSquares[criterion.criteriaId] = alternatives
            .map((alt) => alt.values[criterion.criteriaId] || 0)
            .reduce((sum, val) => sum + val ** 2, 0);
    });

    // Step 2: Normalisasi Matriks Keputusan (DNorm)
    let DNorm = alternatives.map((alt) => {
        let normValues = {};
        Object.keys(alt.values).forEach((key) => {
            let criteriaId = Number(key);
            let sumSq = sumSquares[criteriaId];
            normValues[criteriaId] = sumSq !== 0 ? alt.values[criteriaId] / Math.sqrt(sumSq) : 0;
        });
        return { alternativeId: alt.alternativeId, name: alt.name, values: normValues };
    });

    return DNorm;
}