import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { generateHtmlReport } from '../../src/reporters/html.reporter';
import { VrtReport, ComparisonResult } from '../../src/core/types';

const TMP = path.join(__dirname, '.tmp-html-reporter');

function createPngFile(filePath: string, width = 10, height = 10): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 255;
  }
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

afterEach(() => {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
});

function makeReport(results: ComparisonResult[]): VrtReport {
  return {
    timestamp: '2026-04-06T10:00:00Z',
    totalTests: results.length,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    newBaselines: results.filter((r) => r.status === 'new').length,
    results,
  };
}

describe('HTML Reporter', () => {
  it('should generate valid HTML file', () => {
    const baselinePath = path.join(TMP, 'baselines', 'page.png');
    const currentPath = path.join(TMP, 'diffs', 'page-current.png');
    createPngFile(baselinePath);
    createPngFile(currentPath);

    const report = makeReport([
      {
        name: 'homepage',
        status: 'pass',
        mismatchPixels: 0,
        mismatchPercentage: 0,
        threshold: 0.1,
        baselinePath,
        currentPath,
        dimensions: { width: 10, height: 10 },
      },
    ]);

    const outputPath = path.join(TMP, 'report.html');
    generateHtmlReport(report, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('Visual Regression Report');
    expect(html).toContain('homepage');
    expect(html).toContain('PASS');
    expect(html).toContain('10x10');
  });

  it('should include diff image for failed comparisons', () => {
    const baselinePath = path.join(TMP, 'baselines', 'fail.png');
    const currentPath = path.join(TMP, 'diffs', 'fail-current.png');
    const diffPath = path.join(TMP, 'diffs', 'fail-diff.png');
    createPngFile(baselinePath);
    createPngFile(currentPath);
    createPngFile(diffPath);

    const report = makeReport([
      {
        name: 'checkout-page',
        status: 'fail',
        mismatchPixels: 500,
        mismatchPercentage: 5.0,
        threshold: 0.1,
        baselinePath,
        currentPath,
        diffPath,
        dimensions: { width: 10, height: 10 },
      },
    ]);

    const outputPath = path.join(TMP, 'fail-report.html');
    generateHtmlReport(report, outputPath);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('FAIL');
    expect(html).toContain('5%');
    expect(html).toContain('500px');
    expect(html).toContain('Diff');
    expect(html).toContain('data:image/png;base64,');
  });

  it('should handle new baselines', () => {
    const baselinePath = path.join(TMP, 'baselines', 'new.png');
    const currentPath = path.join(TMP, 'diffs', 'new-current.png');
    createPngFile(baselinePath);
    createPngFile(currentPath);

    const report = makeReport([
      {
        name: 'new-feature',
        status: 'new',
        mismatchPixels: 0,
        mismatchPercentage: 0,
        threshold: 0.1,
        baselinePath,
        currentPath,
        dimensions: { width: 10, height: 10 },
      },
    ]);

    const outputPath = path.join(TMP, 'new-report.html');
    generateHtmlReport(report, outputPath);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).toContain('NEW');
    expect(html).toContain('new-feature');
  });

  it('should show correct summary counts', () => {
    const basePath = path.join(TMP, 'baselines', 'x.png');
    const curPath = path.join(TMP, 'diffs', 'x-current.png');
    createPngFile(basePath);
    createPngFile(curPath);

    const base = {
      threshold: 0.1,
      baselinePath: basePath,
      currentPath: curPath,
      dimensions: { width: 10, height: 10 },
    };
    const report = makeReport([
      { name: 'a', status: 'pass', mismatchPixels: 0, mismatchPercentage: 0, ...base },
      { name: 'b', status: 'pass', mismatchPixels: 0, mismatchPercentage: 0, ...base },
      { name: 'c', status: 'fail', mismatchPixels: 100, mismatchPercentage: 1, ...base },
      { name: 'd', status: 'new', mismatchPixels: 0, mismatchPercentage: 0, ...base },
    ]);

    const outputPath = path.join(TMP, 'summary-report.html');
    generateHtmlReport(report, outputPath);

    const html = fs.readFileSync(outputPath, 'utf-8');
    // Check stat counts exist in HTML
    expect(html).toContain('>4<'); // total
    expect(html).toContain('>2<'); // passed
    expect(html).toContain('>1<'); // failed and new
  });

  it('should escape HTML in names', () => {
    const basePath = path.join(TMP, 'baselines', 'x.png');
    const curPath = path.join(TMP, 'diffs', 'x-current.png');
    createPngFile(basePath);
    createPngFile(curPath);

    const report = makeReport([
      {
        name: '<script>alert("xss")</script>',
        status: 'pass',
        mismatchPixels: 0,
        mismatchPercentage: 0,
        threshold: 0.1,
        baselinePath: basePath,
        currentPath: curPath,
        dimensions: { width: 10, height: 10 },
      },
    ]);

    const outputPath = path.join(TMP, 'xss-report.html');
    generateHtmlReport(report, outputPath);

    const html = fs.readFileSync(outputPath, 'utf-8');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should create output directory if it does not exist', () => {
    const report = makeReport([]);
    const outputPath = path.join(TMP, 'nested', 'deep', 'report.html');

    generateHtmlReport(report, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
  });
});
