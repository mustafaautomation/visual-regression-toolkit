import { VrtReport } from '../core/types';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

export function printReport(report: VrtReport): void {
  console.log();
  console.log(`${BOLD}${CYAN}Visual Regression Report${RESET}`);
  console.log(`${DIM}${report.timestamp}${RESET}`);
  console.log();

  console.log(
    `  ${BOLD}Summary:${RESET}  ${GREEN}${report.passed} passed${RESET}  ${RED}${report.failed} failed${RESET}  ${YELLOW}${report.newBaselines} new${RESET}  ${DIM}(${report.totalTests} total)${RESET}`,
  );
  console.log();

  for (const result of report.results) {
    const icon =
      result.status === 'pass' ? `${GREEN}✓` : result.status === 'new' ? `${YELLOW}●` : `${RED}✗`;
    const detail =
      result.status === 'new'
        ? `${YELLOW}new baseline${RESET}`
        : result.status === 'pass'
          ? `${GREEN}match${RESET}`
          : `${RED}${result.mismatchPercentage}% diff (${result.mismatchPixels}px)${RESET}`;

    console.log(
      `  ${icon}${RESET} ${result.name}  ${DIM}${result.dimensions.width}x${result.dimensions.height}${RESET}  ${detail}`,
    );

    if (result.diffPath) {
      console.log(`    ${DIM}diff: ${result.diffPath}${RESET}`);
    }
  }

  console.log();
}
