import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { ScreenshotComparator } from '../../src/core/comparator';

const TMP = path.join(__dirname, '.tmp-comparator');
const BASELINES = path.join(TMP, 'baselines');
const DIFFS = path.join(TMP, 'diffs');

function createPng(width: number, height: number, color: { r: number; g: number; b: number }): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = color.r;
      png.data[idx + 1] = color.g;
      png.data[idx + 2] = color.b;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe('ScreenshotComparator', () => {
  let comparator: ScreenshotComparator;

  beforeEach(() => {
    comparator = new ScreenshotComparator({
      baselineDir: BASELINES,
      diffDir: DIFFS,
    });
  });

  afterEach(() => {
    if (fs.existsSync(TMP)) {
      fs.rmSync(TMP, { recursive: true });
    }
  });

  it('should create new baseline when none exists', () => {
    const buffer = createPng(100, 100, { r: 255, g: 0, b: 0 });
    const result = comparator.compare('new-page', buffer);

    expect(result.status).toBe('new');
    expect(result.mismatchPixels).toBe(0);
    expect(result.dimensions).toEqual({ width: 100, height: 100 });
    expect(fs.existsSync(result.baselinePath)).toBe(true);
  });

  it('should pass when screenshots are identical', () => {
    const buffer = createPng(100, 100, { r: 0, g: 128, b: 255 });

    // First run: create baseline
    comparator.compare('identical', buffer);
    // Second run: compare
    const result = comparator.compare('identical', buffer);

    expect(result.status).toBe('pass');
    expect(result.mismatchPixels).toBe(0);
    expect(result.mismatchPercentage).toBe(0);
    expect(result.diffPath).toBeUndefined();
  });

  it('should fail when screenshots differ', () => {
    const red = createPng(100, 100, { r: 255, g: 0, b: 0 });
    const blue = createPng(100, 100, { r: 0, g: 0, b: 255 });

    comparator.compare('changed', red);
    const result = comparator.compare('changed', blue);

    expect(result.status).toBe('fail');
    expect(result.mismatchPixels).toBeGreaterThan(0);
    expect(result.mismatchPercentage).toBeGreaterThan(0);
    expect(result.diffPath).toBeDefined();
    expect(fs.existsSync(result.diffPath!)).toBe(true);
  });

  it('should fail on dimension mismatch', () => {
    const small = createPng(50, 50, { r: 0, g: 0, b: 0 });
    const large = createPng(100, 100, { r: 0, g: 0, b: 0 });

    comparator.compare('resize', small);
    const result = comparator.compare('resize', large);

    expect(result.status).toBe('fail');
    expect(result.mismatchPercentage).toBe(100);
  });

  it('should update baseline from current', () => {
    const red = createPng(100, 100, { r: 255, g: 0, b: 0 });
    const blue = createPng(100, 100, { r: 0, g: 0, b: 255 });

    comparator.compare('update-test', red);
    comparator.compare('update-test', blue);
    comparator.updateBaseline('update-test');

    // Now compare should pass with blue
    const result = comparator.compare('update-test', blue);
    expect(result.status).toBe('pass');
  });
});
