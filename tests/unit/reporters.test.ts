import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VrtReport } from '../../src/core/types';
import { generateHtmlReport } from '../../src/reporters/html.reporter';

const TMP = path.join(__dirname, '.tmp-reporters');

function makeReport(): VrtReport {
  return {
    timestamp: '2025-06-01T12:00:00.000Z',
    totalTests: 3,
    passed: 2,
    failed: 1,
    newBaselines: 0,
    results: [
      {
        name: 'homepage',
        status: 'pass',
        mismatchPixels: 0,
        mismatchPercentage: 0,
        threshold: 0.1,
        baselinePath: '/fake/baselines/homepage.png',
        currentPath: '/fake/diffs/homepage-current.png',
        dimensions: { width: 1280, height: 720 },
      },
      {
        name: 'login',
        status: 'pass',
        mismatchPixels: 0,
        mismatchPercentage: 0,
        threshold: 0.1,
        baselinePath: '/fake/baselines/login.png',
        currentPath: '/fake/diffs/login-current.png',
        dimensions: { width: 1280, height: 720 },
      },
      {
        name: 'dashboard',
        status: 'fail',
        mismatchPixels: 1500,
        mismatchPercentage: 0.16,
        threshold: 0.1,
        baselinePath: '/fake/baselines/dashboard.png',
        currentPath: '/fake/diffs/dashboard-current.png',
        diffPath: '/fake/diffs/dashboard-diff.png',
        dimensions: { width: 1280, height: 720 },
      },
    ],
  };
}

describe('HTML Reporter', () => {
  afterEach(() => {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true });
  });

  it('should generate HTML report', () => {
    const outputPath = path.join(TMP, 'report.html');
    generateHtmlReport(makeReport(), outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf-8');
    expect(content).toContain('Visual Regression Report');
    expect(content).toContain('homepage');
    expect(content).toContain('dashboard');
    expect(content).toContain('FAIL');
  });
});
