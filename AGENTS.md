# Portfolio Engineering Harness

These rules apply to the entire repository.

## Required workflow

1. Identify every user-visible behavior affected by a change.
2. Add or update a Playwright test for each affected behavior.
3. Keep `tests/e2e/feature-contracts.json` synchronized with the discovered tests.
4. Run `npm run verify:pr` before pushing.
5. Create or update a pull request only after the command exits successfully.

## Non-negotiable gates

- Do not use `--no-verify` to bypass the pre-push hook.
- Do not add `test.skip`, weaken assertions, or remove a feature contract only to make the gate pass.
- Do not claim a link, metric, location, role, or project capability unless it is verified.
- Do not push directly to `main`; use a short-lived branch and a pull request.
- Record the exact validation command and result in the pull request body.
- For visual changes, inspect failure screenshots and confirm mobile, tablet, and desktop behavior.

## Required command

```bash
npm run verify:pr
```

The harness validates the feature contract registry, then runs every registered E2E test in its own Playwright process. Any failed or undocumented test blocks the push and the pull request.
