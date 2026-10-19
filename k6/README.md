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
