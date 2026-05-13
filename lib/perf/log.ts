import "server-only";

function isPerfLogsEnabled(): boolean {
  return process.env.ENABLE_PERF_LOGS === "1";
}

export function perfLog(scope: string, message: string): void {
  if (!isPerfLogsEnabled()) {
    return;
  }

  console.log(`[perf][${scope}] ${message}`);
}

export async function perfTime<T>(
  scope: string,
  step: string,
  run: () => T | PromiseLike<T>,
): Promise<T> {
  const startedAt = performance.now();
  const result = await run();
  const elapsedMs = (performance.now() - startedAt).toFixed(1);
  perfLog(scope, `${step}=${elapsedMs}ms`);
  return result;
}
