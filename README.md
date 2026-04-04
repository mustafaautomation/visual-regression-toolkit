# Visual Regression Toolkit

[![CI](https://github.com/mustafaautomation/visual-regression-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/mustafaautomation/visual-regression-toolkit/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

Pixel-level visual regression testing toolkit. Compare screenshots against baselines, generate diff images, and produce HTML reports. Works with Playwright, Puppeteer, or any tool that produces PNG screenshots.

---

## How It Works

```
Current Screenshot ──┐
                     ├── pixelmatch ──▶ Diff Image + Pass/Fail
Baseline Image ──────┘
```

1. **First run** — screenshots become baselines automatically
2. **Subsequent runs** — each screenshot is compared pixel-by-pixel against its baseline
3. **Failures** — diff images highlight changed pixels in magenta
4. **Update** — accept current screenshots as new baselines when changes are intentional

---

## Quick Start

```bash
npm install visual-regression-toolkit

# As a library
import { VrtRunner } from 'visual-regression-toolkit';

const runner = new VrtRunner({ threshold: 0.1 });
const result = runner.check('homepage', screenshotBuffer);
// result.status: 'pass' | 'fail' | 'new'

# As a CLI
npx vrt compare ./screenshots --html report.html
npx vrt update ./screenshots
```

---

## Library API

### VrtRunner

```typescript
import { VrtRunner } from 'visual-regression-toolkit';

const runner = new VrtRunner({
  baselineDir: 'baselines',      // Where baseline PNGs are stored
  diffDir: 'diffs',              // Where diff images are written
  threshold: 0.1,                // pixelmatch threshold (0 = exact, 1 = lenient)
  antialiasing: true,            // Ignore antialiasing differences
});

// Check single screenshot
const result = runner.check('login-page', buffer);

// Check multiple
const results = runner.checkAll([
  { name: 'home', buffer: homeBuffer },
  { name: 'dashboard', buffer: dashBuffer },
]);

// Get full report
const report = runner.getReport();

// Accept failed screenshots as new baselines
runner.updateAllFailed();
```

### ScreenshotComparator (low-level)

```typescript
import { ScreenshotComparator } from 'visual-regression-toolkit';

const comparator = new ScreenshotComparator({ threshold: 0.05 });
const result = comparator.compare('header', screenshotBuffer);
```

### Reporters

```typescript
import { printReport, generateHtmlReport } from 'visual-regression-toolkit';

printReport(report);                              // Console output
generateHtmlReport(report, 'report.html');         // HTML with inline images
```

---

## Playwright Integration

```typescript
import { test } from '@playwright/test';
import { VrtRunner } from 'visual-regression-toolkit';

const runner = new VrtRunner();

test('homepage visual check', async ({ page }) => {
  await page.goto('https://example.com');
  const buffer = await page.screenshot({ fullPage: true });
  const result = runner.check('homepage', buffer);
  expect(result.status).not.toBe('fail');
});
```

---

## CLI

| Command | Description |
|---|---|
| `vrt compare <dir>` | Compare PNGs in dir against baselines |
| `vrt compare <dir> --html report.html` | Generate HTML report |
| `vrt compare <dir> -t 0.05` | Custom threshold |
| `vrt update <dir>` | Accept screenshots as new baselines |

---

## ComparisonResult

```typescript
{
  name: string;                  // Screenshot name
  status: 'pass' | 'fail' | 'new';
  mismatchPixels: number;        // Number of different pixels
  mismatchPercentage: number;    // Percentage of different pixels
  threshold: number;             // Threshold used for comparison
  baselinePath: string;          // Path to baseline image
  currentPath: string;           // Path to current screenshot
  diffPath?: string;             // Path to diff image (only on failure)
  dimensions: { width, height };
}
```

---

## Project Structure

```
visual-regression-toolkit/
├── src/
│   ├── core/
│   │   ├── types.ts             # Config, result, report types
│   │   ├── comparator.ts        # Pixel comparison engine
│   │   └── runner.ts            # High-level test runner
│   ├── reporters/
│   │   ├── console.reporter.ts  # Terminal output
│   │   └── html.reporter.ts     # HTML report with inline images
│   ├── cli.ts                   # CLI entry point
│   └── index.ts                 # Public API exports
├── tests/
│   └── unit/
│       ├── comparator.test.ts   # 5 tests
│       ├── runner.test.ts       # 5 tests
│       └── reporters.test.ts    # 1 test
├── baselines/                   # Git-tracked baseline images
└── diffs/                       # Generated diffs (gitignored)
```

---

## License

MIT

---

Built by [Quvantic](https://quvantic.com)
