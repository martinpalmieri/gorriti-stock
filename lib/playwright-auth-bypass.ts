import "server-only";

/**
 * Playwright may set PLAYWRIGHT_BYPASS_AUTH=1 during local dev.
 * It must never be honored in production, even if the variable is set.
 */
export function isPlaywrightAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.PLAYWRIGHT_BYPASS_AUTH === "1"
  );
}
