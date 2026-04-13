import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { ComparisonResult, VrtConfig, DEFAULT_CONFIG } from './types';

export class ScreenshotComparator {
  private config: VrtConfig;

  constructor(config: Partial<VrtConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDir(this.config.baselineDir);
    this.ensureDir(this.config.diffDir);
  }

  compare(name: string, currentBuffer: Buffer): ComparisonResult {
    const baselinePath = this.getBaselinePath(name);
    const currentPath = path.join(this.config.diffDir, `${name}-current.png`);
    const diffPath = path.join(this.config.diffDir, `${name}-diff.png`);

    // Save current screenshot
    fs.writeFileSync(currentPath, currentBuffer);

    // New baseline — no comparison needed
    if (!fs.existsSync(baselinePath)) {
      fs.copyFileSync(currentPath, baselinePath);
      const img = PNG.sync.read(currentBuffer);
      return {
        name,
        status: 'new',
        mismatchPixels: 0,
        mismatchPercentage: 0,
        threshold: this.config.threshold,
        baselinePath,
        currentPath,
        dimensions: { width: img.width, height: img.height },
      };
    }

    // Load images
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(currentBuffer);

    // Dimension mismatch — auto-fail
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return {
        name,
        status: 'fail',
        mismatchPixels: 0,
        mismatchPercentage: 100,
        threshold: this.config.threshold,
        baselinePath,
        currentPath,
        dimensions: { width: current.width, height: current.height },
      };
    }

    // Pixel comparison
    const { width, height } = baseline;
    const diff = new PNG({ width, height });

    const mismatchPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, {
      threshold: this.config.threshold,
      includeAA: !this.config.antialiasing,
      diffColor: [this.config.diffColor.r, this.config.diffColor.g, this.config.diffColor.b],
    });

    const totalPixels = width * height;
    const mismatchPercentage = (mismatchPixels / totalPixels) * 100;

    // Write diff image only if there are mismatches
    if (mismatchPixels > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      name,
      status: mismatchPixels === 0 ? 'pass' : 'fail',
      mismatchPixels,
      mismatchPercentage: Math.round(mismatchPercentage * 100) / 100,
      threshold: this.config.threshold,
      baselinePath,
      currentPath,
      diffPath: mismatchPixels > 0 ? diffPath : undefined,
      dimensions: { width, height },
    };
  }

  updateBaseline(name: string): void {
    const currentPath = path.join(this.config.diffDir, `${name}-current.png`);
    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, this.getBaselinePath(name));
    }
  }

  getBaselinePath(name: string): string {
    return path.join(this.config.baselineDir, `${name}.png`);
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
