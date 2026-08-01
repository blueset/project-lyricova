import type {
  EnhancedCanvasNativeTextCluster,
  EnhancedCanvasTextClusterBounds,
  EnhancedCanvasTextClusterOptions,
  EnhancedCanvasTextClusterRequest,
  EnhancedCanvasTextMeasureContext,
  EnhancedCanvasTextMetricsLike,
  LyricovaNativeTextCluster,
  LyricovaNativeTextClustersResult,
  MeasuredTextMetricsLike,
} from "./enhancedCanvasTextMetricsTypes";

const BOUNDS_KEYS = [
  "x",
  "y",
  "width",
  "height",
  "top",
  "right",
  "bottom",
  "left",
] as const;

/**
 * Development-only adapter for the experimental Enhanced Canvas TextMetrics API.
 * Production rendering must continue to tolerate this API being unavailable.
 */
export function measureEnhancedCanvasTextClusters(
  context: EnhancedCanvasTextMeasureContext,
  text: string,
  request: EnhancedCanvasTextClusterRequest = {},
): LyricovaNativeTextClustersResult {
  const startUtf16 = request.startUtf16 ?? 0;
  const endUtf16 = request.endUtf16 ?? text.length;
  assertIndexRange(startUtf16, endUtf16, text.length);

  const metrics = context.measureText(text);
  if (!hasGetTextClusters(metrics)) {
    return {
      kind: "unavailable",
      reason: "missing-get-text-clusters",
    };
  }

  const options = buildTextClusterOptions(request);
  const rawClusters = callGetTextClusters(
    metrics,
    startUtf16,
    endUtf16,
    options,
  );
  if (!Array.isArray(rawClusters)) {
    throw new TypeError(
      "Enhanced Canvas TextMetrics getTextClusters() must return an array.",
    );
  }

  return {
    kind: "available",
    clusters: rawClusters.map((cluster, index) =>
      normalizeCluster(cluster, index, startUtf16, endUtf16, text.length),
    ),
  };
}

interface ValidatedNativeCluster {
  readonly rawCluster: EnhancedCanvasNativeTextCluster;
  readonly start: number;
  readonly end: number;
  readonly x?: number;
  readonly y?: number;
  readonly advance?: number;
  readonly bounds?: EnhancedCanvasTextClusterBounds;
  readonly align?: string;
  readonly baseline?: string;
}

function hasGetTextClusters(
  metrics: MeasuredTextMetricsLike,
): metrics is MeasuredTextMetricsLike & EnhancedCanvasTextMetricsLike {
  return typeof metrics.getTextClusters === "function";
}

function buildTextClusterOptions(
  request: EnhancedCanvasTextClusterRequest,
): EnhancedCanvasTextClusterOptions | undefined {
  const options: {
    align?: string;
    baseline?: string;
    x?: number;
    y?: number;
  } = {};

  if (request.align !== undefined) {
    if (typeof request.align !== "string") {
      throw new TypeError(
        "Enhanced Canvas TextMetrics align must be a string.",
      );
    }
    options.align = request.align;
  }
  if (request.baseline !== undefined) {
    if (typeof request.baseline !== "string") {
      throw new TypeError(
        "Enhanced Canvas TextMetrics baseline must be a string.",
      );
    }
    options.baseline = request.baseline;
  }
  if (request.x !== undefined) {
    options.x = assertFiniteNumber("Enhanced Canvas TextMetrics x", request.x);
  }
  if (request.y !== undefined) {
    options.y = assertFiniteNumber("Enhanced Canvas TextMetrics y", request.y);
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

function callGetTextClusters(
  metrics: EnhancedCanvasTextMetricsLike,
  startUtf16: number,
  endUtf16: number,
  options?: EnhancedCanvasTextClusterOptions,
): readonly unknown[] {
  try {
    return metrics.getTextClusters(startUtf16, endUtf16, options);
  } catch (error) {
    throw new Error("Enhanced Canvas TextMetrics getTextClusters() threw.", {
      cause: error,
    });
  }
}

function normalizeCluster(
  cluster: unknown,
  index: number,
  requestedStartUtf16: number,
  requestedEndUtf16: number,
  textLength: number,
): LyricovaNativeTextCluster {
  const nativeCluster = assertNativeCluster(
    cluster,
    index,
    requestedStartUtf16,
    requestedEndUtf16,
    textLength,
  );

  return {
    sourceStartUtf16: nativeCluster.start,
    sourceEndUtf16: nativeCluster.end,
    ...(nativeCluster.x === undefined ? {} : { x: nativeCluster.x }),
    ...(nativeCluster.y === undefined ? {} : { y: nativeCluster.y }),
    ...(nativeCluster.advance === undefined
      ? {}
      : { advance: nativeCluster.advance }),
    ...(nativeCluster.bounds === undefined
      ? {}
      : { bounds: nativeCluster.bounds }),
    ...(nativeCluster.align === undefined
      ? {}
      : { align: nativeCluster.align }),
    ...(nativeCluster.baseline === undefined
      ? {}
      : { baseline: nativeCluster.baseline }),
    nativeCluster: nativeCluster.rawCluster,
  };
}

function assertNativeCluster(
  cluster: unknown,
  index: number,
  requestedStartUtf16: number,
  requestedEndUtf16: number,
  textLength: number,
): ValidatedNativeCluster {
  if (typeof cluster !== "object" || cluster === null) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} must be an object.`,
    );
  }

  const candidate = cluster as Record<string, unknown>;
  const start = readClusterStart(candidate, index);
  const end = assertIntegerProperty(candidate, "end", index);

  if (start < requestedStartUtf16 || end > requestedEndUtf16) {
    throw new RangeError(
      `Enhanced Canvas TextMetrics cluster ${index} range ${start}..${end} falls outside the requested UTF-16 range ${requestedStartUtf16}..${requestedEndUtf16}.`,
    );
  }
  if (start < 0 || end > textLength) {
    throw new RangeError(
      `Enhanced Canvas TextMetrics cluster ${index} range ${start}..${end} falls outside the source text length ${textLength}.`,
    );
  }
  if (end <= start) {
    throw new RangeError(
      `Enhanced Canvas TextMetrics cluster ${index} must have end greater than start.`,
    );
  }

  const x = readOptionalFiniteNumber(candidate, "x", index);
  const y = readOptionalFiniteNumber(candidate, "y", index);
  if ((x === undefined) !== (y === undefined)) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} must expose both x and y together.`,
    );
  }

  const advance = readOptionalFiniteNumber(candidate, "advance", index);
  const bounds = readOptionalBounds(candidate, "bounds", index);
  const align = readOptionalString(candidate, "align", index);
  const baseline = readOptionalString(candidate, "baseline", index);

  if (x === undefined && advance === undefined && bounds === undefined) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} must expose x/y, advance, or bounds.`,
    );
  }

  return {
    rawCluster: cluster as EnhancedCanvasNativeTextCluster,
    start,
    end,
    ...(x === undefined ? {} : { x }),
    ...(y === undefined ? {} : { y }),
    ...(advance === undefined ? {} : { advance }),
    ...(bounds === undefined ? {} : { bounds }),
    ...(align === undefined ? {} : { align }),
    ...(baseline === undefined ? {} : { baseline }),
  };
}

function readClusterStart(
  candidate: Record<string, unknown>,
  index: number,
): number {
  const start = readOptionalIntegerProperty(candidate, "start", index);
  const begin = readOptionalIntegerProperty(candidate, "begin", index);

  if (start === undefined && begin === undefined) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} must expose start or begin.`,
    );
  }
  if (start !== undefined && begin !== undefined && start !== begin) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} start and begin must agree when both are present.`,
    );
  }

  return start ?? begin!;
}

function readOptionalBounds(
  candidate: Record<string, unknown>,
  property: string,
  index: number,
): EnhancedCanvasTextClusterBounds | undefined {
  const rawBounds = candidate[property];
  if (rawBounds === undefined) {
    return undefined;
  }
  if (typeof rawBounds !== "object" || rawBounds === null) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} ${property} must be an object.`,
    );
  }

  const boundsRecord = rawBounds as Record<string, unknown>;
  const bounds: {
    -readonly [Key in keyof EnhancedCanvasTextClusterBounds]?: number;
  } = {};
  let hasField = false;

  for (const key of BOUNDS_KEYS) {
    const value = boundsRecord[key];
    if (value === undefined) {
      continue;
    }
    bounds[key] = assertFiniteNumber(
      `Enhanced Canvas TextMetrics cluster ${index} ${property}.${key}`,
      value,
    );
    hasField = true;
  }

  if (!hasField) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} ${property} must expose at least one numeric bounds field.`,
    );
  }

  return bounds;
}

function readOptionalFiniteNumber(
  candidate: Record<string, unknown>,
  property: string,
  index: number,
): number | undefined {
  const value = candidate[property];
  if (value === undefined) {
    return undefined;
  }
  return assertFiniteNumber(
    `Enhanced Canvas TextMetrics cluster ${index} ${property}`,
    value,
  );
}

function readOptionalString(
  candidate: Record<string, unknown>,
  property: string,
  index: number,
): string | undefined {
  const value = candidate[property];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} ${property} must be a string.`,
    );
  }
  return value;
}

function assertIntegerProperty(
  candidate: Record<string, unknown>,
  property: string,
  index: number,
): number {
  const value = assertFiniteNumber(
    `Enhanced Canvas TextMetrics cluster ${index} ${property}`,
    candidate[property],
  );
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} ${property} must be an integer.`,
    );
  }
  return value;
}

function readOptionalIntegerProperty(
  candidate: Record<string, unknown>,
  property: string,
  index: number,
): number | undefined {
  const value = candidate[property];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} ${property} must be a finite number.`,
    );
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `Enhanced Canvas TextMetrics cluster ${index} ${property} must be an integer.`,
    );
  }
  return value;
}

function assertFiniteNumber(label: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function assertIndexRange(
  startUtf16: number,
  endUtf16: number,
  max: number,
): void {
  if (!Number.isInteger(startUtf16) || !Number.isInteger(endUtf16)) {
    throw new RangeError(
      "Enhanced Canvas TextMetrics UTF-16 range must use integer offsets.",
    );
  }
  if (startUtf16 < 0 || endUtf16 < 0 || startUtf16 > max || endUtf16 > max) {
    throw new RangeError(
      `Enhanced Canvas TextMetrics UTF-16 range must stay within 0..${max}.`,
    );
  }
  if (startUtf16 > endUtf16) {
    throw new RangeError(
      "Enhanced Canvas TextMetrics UTF-16 range start must not exceed end.",
    );
  }
}
