# Container publishing (GitHub Actions)

`.github/workflows/publish-container.yml` builds the `runtime` image on every
push to `master` (and on manual dispatch), smoke-tests it, then pushes it to
`ghcr.io/<owner>/<repo>:nightly` plus an immutable `sha-<short>` tag. GHCR
storage and bandwidth are free for public packages.

The workflow needs no configuration to succeed, but the optional analytics and
error-tracking integrations are only wired up if you configure the following
under **Settings → Secrets and variables → Actions**. Note carefully which tab
each belongs to:

| Name                             | Tab         | Purpose                                                                                                     |
| -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `POSTHOG_API_KEY`                | **Secrets** | PostHog _personal_ API key. Enables sourcemap upload so production stack traces resolve.                    |
| `POSTHOG_ENV_ID`                 | Variables   | PostHog project id that sourcemaps are uploaded to.                                                         |
| `NEXT_PUBLIC_POSTHOG_KEY`        | Variables   | Client-side PostHog project key.                                                                            |
| `NEXT_PUBLIC_POSTHOG_HOST`       | Variables   | Optional; defaults to `/ingest`. Leave unset unless you also change the rewrites in both `next.config.mjs`. |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Variables   | Microsoft Clarity project id.                                                                               |

`POSTHOG_API_KEY` is the only real credential, and it is passed as a **BuildKit
secret**, never a build arg — build args are stored in the image config and can
be read back with `docker history` by anyone who can pull the (public) image.
Everything else is a `NEXT_PUBLIC_*`-style identifier that is shipped to the
browser anyway, which is why those are repository _variables_ rather than
secrets. Any of them left unset simply disables that integration; the build
still succeeds.

The workflow also passes `SOURCE_COMMIT=${{ github.sha }}`. PostHog normally
infers the release version from git, but `.git` is excluded from the Docker
build context, so without this the upload silently succeeds with no release
attached and stack traces stay unmapped.

To build locally with the same wiring:

```bash
POSTHOG_API_KEY=phx_... SOURCE_COMMIT=$(git rev-parse HEAD) \
  docker compose --profile build build lyricova-build
```
