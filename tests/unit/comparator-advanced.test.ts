import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { ScreenshotComparator } from '../../src/core/comparator';
import { DEFAULT_CONFIG } from '../../src/core/types';

const TMP = path.join(__dirname, '.tmp-comparator-adv');
const BASELINES = path.join(TMP, 'baselines');
const DIFFS = path.join(TMP, 'diffs');

function createPng(
  width: number,
  height: number,
  fillFn: (x: number, y: number) => { r: number; g: number; b: number },
): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const color = fillFn(x, y);
      png.data[idx] = color.r;
      png.data[idx + 1] = color.g;
      png.data[idx + 2] = color.b;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function solidPng(w: number, h: number, r: number, g: number, b: number): Buffer {
  return createPng(w, h, () => ({ r, g, b }));
}

describe('ScreenshotComparator — advanced', () => {
  let comparator: ScreenshotComparator;

  beforeEach(() => {
    comparator = new ScreenshotComparator({ baselineDir: BASELINES, diffDir: DIFFS });
  });

  afterEach(() => {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
  });

  it('should detect subtle single-pixel change', () => {
    const original = solidPng(50, 50, 128, 128, 128);

    // Change one pixel
    const modified = createPng(50, 50, (x, y) => {
      if (x === 25 && y === 25) return { r: 255, g: 0, b: 0 };
      return { r: 128, g: 128, b: 128 };
    });

    comparator.compare('subtle', original);
    const result = comparator.compare('subtle', modified);

    expect(result.status).toBe('fail');
    expect(result.mismatchPixels).toBeGreaterThanOrEqual(1);
    expect(result.mismatchPercentage).toBeLessThan(1);
  });

  it('should handle gradient images', () => {
    const gradient = createPng(100, 100, (x) => ({
      r: Math.floor((x / 100) * 255),
      g: 0,
      b: Math.floor(((100 - x) / 100) * 255),
    }));

    comparator.compare('gradient', gradient);
    const result = comparator.compare('gradient', gradient);

    expect(result.status).toBe('pass');
    expect(result.mismatchPixels).toBe(0);
  });

  it('should report correct dimensions', () => {
    const wide = solidPng(200, 50, 0, 0, 0);
    const result = comparator.compare('wide', wide);

    expect(result.dimensions.width).toBe(200);
    expect(result.dimensions.height).toBe(50);
  });

  it('should handle multiple comparisons in sequence', () => {
    const page1 = solidPng(100, 100, 255, 0, 0);
    const page2 = solidPng(100, 100, 0, 255, 0);
    const page3 = solidPng(100, 100, 0, 0, 255);

    // Create baselines
    comparator.compare('page-1', page1);
    comparator.compare('page-2', page2);
    comparator.compare('page-3', page3);

    // Compare same images — all should pass
    expect(comparator.compare('page-1', page1).status).toBe('pass');
    expect(comparator.compare('page-2', page2).status).toBe('pass');
    expect(comparator.compare('page-3', page3).status).toBe('pass');
  });

  it('should use custom threshold', () => {
    const strictComparator = new ScreenshotComparator({
      baselineDir: BASELINES,
      diffDir: DIFFS,
      threshold: 0.01, // Very strict
    });

    const img1 = solidPng(50, 50, 128, 128, 128);
    const img2 = createPng(50, 50, (x, y) => {
      // Very slight color variation
      if (x === 0 && y === 0) return { r: 130, g: 128, b: 128 };
      return { r: 128, g: 128, b: 128 };
    });

    strictComparator.compare('strict', img1);
    const result = strictComparator.compare('strict', img2);

    // With strict threshold, even tiny changes should be caught
    expect(result.threshold).toBe(0.01);
  });

  it('should preserve baseline path format', () => {
    const buffer = solidPng(10, 10, 0, 0, 0);
    const result = comparator.compare('my-test-page', buffer);

    expect(result.baselinePath).toContain('my-test-page.png');
    expect(comparator.getBaselinePath('my-test-page')).toContain('my-test-page.png');
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_CONFIG.threshold).toBe(0.1);
    expect(DEFAULT_CONFIG.antialiasing).toBe(true);
    expect(DEFAULT_CONFIG.diffColor).toEqual({ r: 255, g: 0, b: 128 });
    expect(DEFAULT_CONFIG.baselineDir).toBe('baselines');
    expect(DEFAULT_CONFIG.diffDir).toBe('diffs');
  });
});
