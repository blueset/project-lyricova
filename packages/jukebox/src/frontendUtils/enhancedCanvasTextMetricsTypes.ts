export interface EnhancedCanvasTextClusterBounds {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export interface EnhancedCanvasTextClusterOptions {
  readonly align?: string;
  readonly baseline?: string;
  readonly x?: number;
  readonly y?: number;
}

export interface EnhancedCanvasTextClusterRequest extends EnhancedCanvasTextClusterOptions {
  readonly startUtf16?: number;
  readonly endUtf16?: number;
}

export interface EnhancedCanvasNativeTextCluster {
  readonly start?: number;
  readonly begin?: number;
  readonly end: number;
  readonly x?: number;
  readonly y?: number;
  readonly advance?: number;
  readonly bounds?: EnhancedCanvasTextClusterBounds;
  readonly align?: string;
  readonly baseline?: string;
}

export interface EnhancedCanvasTextMetricsLike {
  getTextClusters(
    start: number,
    end: number,
    options?: EnhancedCanvasTextClusterOptions,
  ): readonly unknown[];
}

export interface MeasuredTextMetricsLike {
  readonly getTextClusters?: unknown;
}

export interface EnhancedCanvasTextMeasureContext {
  measureText(text: string): MeasuredTextMetricsLike;
}

export interface LyricovaNativeTextCluster {
  readonly sourceStartUtf16: number;
  readonly sourceEndUtf16: number;
  readonly x?: number;
  readonly y?: number;
  readonly advance?: number;
  readonly bounds?: EnhancedCanvasTextClusterBounds;
  readonly align?: string;
  readonly baseline?: string;
  readonly nativeCluster: EnhancedCanvasNativeTextCluster;
}

export interface LyricovaNativeTextClustersAvailableResult {
  readonly kind: "available";
  readonly clusters: readonly LyricovaNativeTextCluster[];
}

export interface LyricovaNativeTextClustersUnavailableResult {
  readonly kind: "unavailable";
  readonly reason: "missing-get-text-clusters";
}

export type LyricovaNativeTextClustersResult =
  | LyricovaNativeTextClustersAvailableResult
  | LyricovaNativeTextClustersUnavailableResult;
