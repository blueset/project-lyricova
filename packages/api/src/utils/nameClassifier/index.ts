/**
 * Name Language Classifier
 *
 * Classifies pure-Han names as Chinese (zh) vs Japanese (ja) by comparing
 * the given romanization against both Mandarin pinyin and Japanese readings.
 *
 * Primary signal: reading reconciliation (how well does the romanization
 * match pinyin vs romaji of the Han text).
 * Fallback: phonotactic analysis of the romanization itself.
 */

import { alignSegments, extractScoringCore } from "./normalize";
import { phonotacticClassify } from "./phonotactics";
import { reconcile } from "./reconciliation";

export interface ClassificationResult {
  label: "ja" | "zh" | "unknown";
  confidence: number;
  reasons: string[];
  signals: {
    mandarinScore: number;
    japaneseScore: number;
    mandarinReading: string;
    japaneseReading: string;
    pinyinCoverage: number;
    romajiCoverage: number;
    pinyinFeatures: number;
    romajiFeatures: number;
    romanCore: string;
    hanCore: string;
  };
}

// Tunable thresholds
const RECONCILIATION_WIN_MARGIN = 0.15;
const RECONCILIATION_MIN_SCORE = 0.55;

/**
 * Classify a pure-Han name's language based on its romanization.
 *
 * @param romanization - The romanized form (e.g., "Minato Takahiro")
 * @param original - The original Han text (e.g., "湊貴大")
 * @returns Classification result with label, confidence, and diagnostic info
 */
export async function classifyNameLanguage(
  romanization: string,
  original: string,
): Promise<ClassificationResult> {
  const reasons: string[] = [];

  // Step 1: Align romanization to original
  const segments = alignSegments(romanization, original);
  const { romanCore, hanCore } = extractScoringCore(segments);

  // If no CJK content to score, we can only use phonotactics
  if (!hanCore || !romanCore) {
    const phonoResult = phonotacticClassify(romanization);
    reasons.push("No Han core found; using phonotactics only");
    return {
      label: phonoResult.label,
      confidence: phonoResult.confidence * 0.7, // lower confidence without reconciliation
      reasons,
      signals: {
        mandarinScore: 0,
        japaneseScore: 0,
        mandarinReading: "",
        japaneseReading: "",
        pinyinCoverage: phonoResult.pinyinCoverage,
        romajiCoverage: phonoResult.romajiCoverage,
        pinyinFeatures: phonoResult.pinyinFeatures,
        romajiFeatures: phonoResult.romajiFeatures,
        romanCore,
        hanCore,
      },
    };
  }

  // Step 2: Reconciliation — romanize Han as both languages and compare
  const reconResult = await reconcile(romanCore, hanCore);
  const { mandarinScore, japaneseScore, mandarinReading, japaneseReading } =
    reconResult;

  // Step 3: Phonotactic analysis of the romanization core
  const phonoResult = phonotacticClassify(romanCore);

  const signals: ClassificationResult["signals"] = {
    mandarinScore,
    japaneseScore,
    mandarinReading,
    japaneseReading,
    pinyinCoverage: phonoResult.pinyinCoverage,
    romajiCoverage: phonoResult.romajiCoverage,
    pinyinFeatures: phonoResult.pinyinFeatures,
    romajiFeatures: phonoResult.romajiFeatures,
    romanCore,
    hanCore,
  };

  // Step 4: Decision logic
  const margin = Math.abs(mandarinScore - japaneseScore);
  const winnerIsReconciled = margin >= RECONCILIATION_WIN_MARGIN;
  const bestScore = Math.max(mandarinScore, japaneseScore);

  // Case A: Clear reconciliation winner
  if (winnerIsReconciled && bestScore >= RECONCILIATION_MIN_SCORE) {
    const label = mandarinScore > japaneseScore ? "zh" : "ja";
    const confidence = Math.min(1, bestScore * 0.7 + margin * 0.3);
    reasons.push(
      `Reconciliation: ${label === "zh" ? "Mandarin" : "Japanese"} reading matches ` +
        `(score=${bestScore.toFixed(2)}, margin=${margin.toFixed(2)})`,
    );

    // Boost if phonotactics agrees
    if (phonoResult.label === label) {
      reasons.push("Phonotactics confirms reconciliation result");
      return {
        label,
        confidence: Math.min(1, confidence + 0.1),
        reasons,
        signals,
      };
    }

    return { label, confidence, reasons, signals };
  }

  // Case B: Reconciliation is close/weak — use phonotactics as tie-breaker
  if (bestScore >= RECONCILIATION_MIN_SCORE && !winnerIsReconciled) {
    reasons.push(
      `Reconciliation inconclusive (zh=${mandarinScore.toFixed(2)}, ja=${japaneseScore.toFixed(2)}, margin=${margin.toFixed(2)})`,
    );

    if (phonoResult.label !== "unknown" && phonoResult.confidence > 0.5) {
      reasons.push(
        `Phonotactic tie-breaker: ${phonoResult.label} (confidence=${phonoResult.confidence.toFixed(2)})`,
      );
      const confidence = Math.min(
        1,
        phonoResult.confidence * 0.8 + bestScore * 0.2,
      );
      return { label: phonoResult.label, confidence, reasons, signals };
    }
  }

  // Case C: Both reconciliation scores are low — romanization may not match
  // the Han reading at all (e.g., "HACHI" for 米津玄師 where HACHI is from a stage name)
  if (bestScore < RECONCILIATION_MIN_SCORE) {
    reasons.push(
      `Low reconciliation scores (zh=${mandarinScore.toFixed(2)}, ja=${japaneseScore.toFixed(2)}); ` +
        "romanization may not derive from Han characters",
    );

    // Fall back purely to phonotactics
    if (phonoResult.label !== "unknown" && phonoResult.confidence > 0.5) {
      reasons.push(
        `Phonotactic fallback: ${phonoResult.label} (confidence=${phonoResult.confidence.toFixed(2)})`,
      );
      return {
        label: phonoResult.label,
        confidence: phonoResult.confidence * 0.7,
        reasons,
        signals,
      };
    }
  }

  // Case D: Truly inconclusive
  reasons.push("Unable to determine language with sufficient confidence");
  return { label: "unknown", confidence: 0, reasons, signals };
}
