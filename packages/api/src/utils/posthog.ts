import { PostHog } from "posthog-node";

const TRUTHY = ["1", "true", "yes", "on"];
const FALSY = ["0", "false", "no", "off"];

/**
 * Analytics events are only sent from production so that local development and
 * other non-production environments never pollute the analytics backend.
 *
 * Set `TELEMETRY_ENABLED=1` (or `NEXT_PUBLIC_TELEMETRY_ENABLED=1`) to force
 * telemetry on, or `0` to force it off regardless of the environment.
 */
export function isTelemetryEnabled(): boolean {
  const override = (
    process.env.TELEMETRY_ENABLED ?? process.env.NEXT_PUBLIC_TELEMETRY_ENABLED
  )?.toLowerCase();
  if (override) {
    if (TRUTHY.includes(override)) return true;
    if (FALSY.includes(override)) return false;
  }
  return process.env.NODE_ENV === "production";
}

export const telemetryEnabled = isTelemetryEnabled();

export const postHog: PostHog | undefined =
  telemetryEnabled && process.env.NEXT_PUBLIC_POSTHOG_KEY
    ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        host: "https://us.i.posthog.com",
      })
    : undefined;
