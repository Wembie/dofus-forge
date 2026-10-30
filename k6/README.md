# k6 load tests

This folder contains a small Grafana k6 harness for Dofus Forge. The suite focuses on the real public pages and browser navigation patterns instead of synthetic endpoints.

## Run locally

```bash
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4173 \
  -v "$(pwd):/src" \
  -w /src \
  grafana/k6:latest run /src/k6/smoke.js
```

For the browser suite:

```bash
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4173 \
  -v "$(pwd):/src" \
  -w /src \
  grafana/k6:latest run --browser /src/k6/browser-smoke.js
```

## Profiles

- `smoke.js` — quick validation of the critical entry pages
- `normal-load.js` — steady-state user traffic
- `peak.js` — realistic expected peak traffic
- `browser-smoke.js` — browser-level landing-page verification

The scripts read `BASE_URL` from the environment and reuse the same route mix for each workload profile so the tests remain comparable across environments.

`smoke.js` sends exactly one request to each public route and fails if any route is missed, returns an unsuccessful response, or fails its response checks. It does not measure browser rendering; use `browser-smoke.js` for that.

The `Performance smoke` workflow has two validation stages:

1. On each PR to `dev` or `main`, it builds the app locally in CI and runs the smoke against Vite preview. This is the required first gate.
2. The Cloudflare preview smoke is temporarily disabled. When re-enabled, it runs on a PR from `dev` to `main` after the local smoke passes: GitHub waits for Cloudflare's `Workers Builds: dofus-forge` check on that PR's exact head SHA, finds the unique preview URL in Cloudflare's PR comment for that same SHA, and runs the smoke against that deployment. This avoids hitting a shared preview hostname that could point to a different commit. Production (`main`) builds do not trigger this remote smoke.

The Cloudflare preview smoke can also be run locally by setting `BASE_URL` to the unique deployment URL Cloudflare posts in the PR comment:

```bash
docker run --rm \
  -e BASE_URL=https://<deployment-id>-dofus-forge.juanes500.workers.dev \
  -v "$(pwd):/src" \
  -w /src \
  grafana/k6:latest run /src/k6/smoke.js
```

When enabled, the Cloudflare smoke sends only seven concurrent page requests and runs after the exact preview deployment succeeds. Do not run `normal-load.js` or `peak.js` against a deployed Worker without authorization and an agreed test window.
