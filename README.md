# Eunwha (Euna) Park · Portfolio

## Live Site
- Production site: https://eunaverse.github.io/

## Purpose
This repository hosts Eunwha Park's portfolio for Backend, Data Infrastructure, and AI Product Engineering roles.

## Local Development
```bash
npm install
npm run test
```

The local test command starts Playwright with a temporary HTTP server at `http://127.0.0.1:4173`.

## Required PR Gate

```bash
npm run verify:pr
```

This command checks the E2E feature registry and runs every portfolio behavior test independently. `npm install` configures the same gate as a local pre-push hook. See `docs/testing/e2e-checklist.md` for the protected journeys and change rules.

## Content Architecture
- `index.html` — Main portfolio page
- `mcpcontentsearch-demo.html` — ContextZip walkthrough and architecture detail
- `tests/e2e/` — End-to-end tests (Playwright)

## Accessibility and UX
- Mobile/desktop responsive layout
- Reduced-motion handling
- Keyboard-accessible navigation
- External links open in a new tab with `rel="noopener noreferrer"`

## CI
GitHub Actions runs end-to-end tests on push and pull request.
