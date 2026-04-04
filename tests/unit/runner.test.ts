import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { VrtRunner } from '../../src/core/runner';

const TMP = path.join(__dirname, '.tmp-runner');

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

describe('VrtRunner', () => {
  let runner: VrtRunner;

  beforeEach(() => {
    runner = new VrtRunner({
      baselineDir: path.join(TMP, 'baselines'),
      diffDir: path.join(TMP, 'diffs'),
    });
  });

  afterEach(() => {
    if (fs.existsSync(TMP)) {
      fs.rmSync(TMP, { recursive: true });
    }
  });

  it('should check a single screenshot', () => {
    const buffer = createPng(80, 60, { r: 100, g: 200, b: 50 });
    const result = runner.check('page-home', buffer);

    expect(result.status).toBe('new');
    expect(result.name).toBe('page-home');
  });

  it('should check multiple screenshots', () => {
    const red = createPng(50, 50, { r: 255, g: 0, b: 0 });
    const green = createPng(50, 50, { r: 0, g: 255, b: 0 });

    const results = runner.checkAll([
      { name: 'page-a', buffer: red },
      { name: 'page-b', buffer: green },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('new');
    expect(results[1].status).toBe('new');
  });

  it('should generate a report', () => {
    const buffer = createPng(50, 50, { r: 0, g: 0, b: 0 });
    runner.check('report-test', buffer);

    const report = runner.getReport();

    expect(report.totalTests).toBe(1);
    expect(report.newBaselines).toBe(1);
    expect(report.passed).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.timestamp).toBeDefined();
  });

  it('should clear results', () => {
    const buffer = createPng(50, 50, { r: 0, g: 0, b: 0 });
    runner.check('clear-test', buffer);
    runner.clear();

    expect(runner.getResults()).toHaveLength(0);
    expect(runner.getReport().totalTests).toBe(0);
  });

  it('should update all failed baselines', () => {
    const red = createPng(50, 50, { r: 255, g: 0, b: 0 });
    const blue = createPng(50, 50, { r: 0, g: 0, b: 255 });

    // Create baselines
    runner.check('fail-test', red);
    runner.clear();

    // Now compare with different color
    runner.check('fail-test', blue);
    expect(runner.getResults()[0].status).toBe('fail');

    // Update all failed
    runner.updateAllFailed();
    runner.clear();

    // Should now pass
    const result = runner.check('fail-test', blue);
    expect(result.status).toBe('pass');
  });
});
