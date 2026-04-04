#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { ScreenshotComparator } from './core/comparator';
import { VrtConfig, ComparisonResult } from './core/types';
import { printReport } from './reporters/console.reporter';
import { generateHtmlReport } from './reporters/html.reporter';

const program = new Command();

program
  .name('vrt')
  .description('Visual regression testing CLI')
  .version('1.0.0');

program
  .command('compare')
  .description('Compare screenshots against baselines')
  .argument('<dir>', 'Directory containing current screenshots (PNG files)')
  .option('-b, --baselines <dir>', 'Baselines directory', 'baselines')
  .option('-d, --diffs <dir>', 'Diffs output directory', 'diffs')
  .option('-t, --threshold <number>', 'Pixel matching threshold (0-1)', '0.1')
  .option('--html <path>', 'Generate HTML report')
  .action((dir: string, options) => {
    const config: Partial<VrtConfig> = {
      baselineDir: options.baselines,
      diffDir: options.diffs,
      threshold: parseFloat(options.threshold),
    };

    const comparator = new ScreenshotComparator(config);
    const results: ComparisonResult[] = [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      const name = path.basename(file, '.png');
      const buffer = fs.readFileSync(path.join(dir, file));
      results.push(comparator.compare(name, buffer));
    }

    const report = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed: results.filter((r) => r.status === 'pass').length,
      failed: results.filter((r) => r.status === 'fail').length,
      newBaselines: results.filter((r) => r.status === 'new').length,
      results,
    };

    printReport(report);

    if (options.html) {
      generateHtmlReport(report, options.html);
      console.log(`HTML report: ${options.html}`);
    }

    if (report.failed > 0) {
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Accept current screenshots as new baselines')
  .argument('<dir>', 'Directory containing current screenshots')
  .option('-b, --baselines <dir>', 'Baselines directory', 'baselines')
  .action((dir: string, options) => {
    const baselineDir = options.baselines;
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      fs.copyFileSync(path.join(dir, file), path.join(baselineDir, file));
      console.log(`Updated baseline: ${file}`);
    }

    console.log(`\n${files.length} baselines updated.`);
  });

program.parse();
