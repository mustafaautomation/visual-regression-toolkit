export interface VrtConfig {
  baselineDir: string;
  diffDir: string;
  threshold: number;
  antialiasing: boolean;
  diffColor: { r: number; g: number; b: number };
}

export interface ComparisonResult {
  name: string;
  status: 'pass' | 'fail' | 'new';
  mismatchPixels: number;
  mismatchPercentage: number;
  threshold: number;
  baselinePath: string;
  currentPath: string;
  diffPath?: string;
  dimensions: { width: number; height: number };
}

export interface VrtReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  newBaselines: number;
  results: ComparisonResult[];
}

export const DEFAULT_CONFIG: VrtConfig = {
  baselineDir: 'baselines',
  diffDir: 'diffs',
  threshold: 0.1,
  antialiasing: true,
  diffColor: { r: 255, g: 0, b: 128 },
};
