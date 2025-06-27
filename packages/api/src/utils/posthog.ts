import { PostHog } from "posthog-node";

export const postHog: PostHog | undefined = process.env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: "https://us.i.posthog.com",
    })
  : undefined;
