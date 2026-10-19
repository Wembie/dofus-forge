# k6 load tests

This folder contains a small Grafana k6 harness for Dofus Forge. The suite focuses on the real public pages and browser navigation patterns instead of synthetic endpoints.

## Run locally

```bash
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4173/dofus-forge \
  -v "$(pwd):/src" \
  -w /src \
  grafana/k6:latest run /src/k6/smoke.js
```

For the browser suite:

```bash
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL=http://host.docker.internal:4173/dofus-forge \
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

The `Performance smoke` workflow has two sequential validation stages:

1. On each PR to `dev` or `main`, it builds the app locally in CI and runs the smoke against Vite preview. This is the required first gate.
2. After the PR is merged to `dev` and Cloudflare Workers Builds reports that the Worker deployment succeeded, manually run the workflow once from the `dev` branch. Its `workflow_dispatch` run checks the deployed dev Worker.

The manual Cloudflare stage uses this command locally if needed:

```bash
docker run --rm \
  -e BASE_URL=https://dev-dofus-forge.juanes500.workers.dev \
  -v "$(pwd):/src" \
  -w /src \
  grafana/k6:latest run /src/k6/smoke.js
```

The dev smoke sends only seven concurrent page requests and must be run only after the Cloudflare deployment succeeds, so it checks the new Worker version rather than the previous deployment. Promote `dev` to `main` only after both stages pass. Do not run `normal-load.js` or `peak.js` against a deployed Worker without authorization and an agreed test window.
