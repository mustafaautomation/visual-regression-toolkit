import { ScreenshotComparator } from './comparator';
import { ComparisonResult, VrtConfig, VrtReport } from './types';

export interface ScreenshotSpec {
  name: string;
  buffer: Buffer;
}

export class VrtRunner {
  private comparator: ScreenshotComparator;
  private results: ComparisonResult[] = [];

  constructor(config?: Partial<VrtConfig>) {
    this.comparator = new ScreenshotComparator(config);
  }

  check(name: string, buffer: Buffer): ComparisonResult {
    const result = this.comparator.compare(name, buffer);
    this.results.push(result);
    return result;
  }

  checkAll(specs: ScreenshotSpec[]): ComparisonResult[] {
    return specs.map((spec) => this.check(spec.name, spec.buffer));
  }

  updateBaseline(name: string): void {
    this.comparator.updateBaseline(name);
  }

  updateAllFailed(): void {
    for (const result of this.results.filter((r) => r.status === 'fail')) {
      this.comparator.updateBaseline(result.name);
    }
  }

  getReport(): VrtReport {
    return {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed: this.results.filter((r) => r.status === 'pass').length,
      failed: this.results.filter((r) => r.status === 'fail').length,
      newBaselines: this.results.filter((r) => r.status === 'new').length,
      results: this.results,
    };
  }

  getResults(): ComparisonResult[] {
    return [...this.results];
  }

  clear(): void {
    this.results = [];
  }
}
