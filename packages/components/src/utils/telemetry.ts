declare const process: { env: Record<string, string | undefined> };

const TRUTHY = ["1", "true", "yes", "on"];
const FALSY = ["0", "false", "no", "off"];

/**
 * Analytics (PostHog, Clarity) events are only sent from production builds so
 * that local development and other non-production environments never pollute
 * the analytics backends.
 *
 * Set `NEXT_PUBLIC_TELEMETRY_ENABLED=1` to force telemetry on (e.g. to verify
 * an integration locally), or `NEXT_PUBLIC_TELEMETRY_ENABLED=0` to force it off
 * in production.
 */
export function isTelemetryEnabled(): boolean {
  const override = process.env.NEXT_PUBLIC_TELEMETRY_ENABLED?.toLowerCase();
  if (override) {
    if (TRUTHY.includes(override)) return true;
    if (FALSY.includes(override)) return false;
  }
  return process.env.NODE_ENV === "production";
}
