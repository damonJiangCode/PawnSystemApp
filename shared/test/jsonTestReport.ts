import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type JsonTestCase = {
  case: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
};

export const writeJsonTestReport = (
  fileName: string,
  cases: JsonTestCase[],
) => {
  const reportDir = path.resolve(process.cwd(), "test-results");
  mkdirSync(reportDir, { recursive: true });

  writeFileSync(
    path.join(reportDir, fileName),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        cases,
      },
      null,
      2,
    )}\n`,
  );
};
