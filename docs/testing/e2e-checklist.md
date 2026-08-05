# Portfolio E2E Release Checklist

## Purpose

This checklist protects the portfolio's recruiter-facing content, navigation, evidence links, ContextZip walkthrough, responsive layout, and external-link safety. Route loading alone is not sufficient.

## Required command

```bash
npm run verify:pr
```

The command must pass before a branch is pushed or a pull request is opened. It validates `tests/e2e/feature-contracts.json` and runs each registered Playwright test in a separate process.

## Feature journeys

| Area | Required behavior |
| --- | --- |
| Home | Hero identity, recruiter-facing status, primary actions, and career timeline render correctly. |
| Navigation | Every internal navigation target remains visible below the fixed header after activation. |
| Experience | The concise backend narrative and its verified impact statements remain visible. |
| Education | UIUC and undergraduate timelines render without reintroducing removed status copy. |
| Skills | Skill groups remain defensible and excluded claims stay absent. |
| Projects | Exactly the intended project cards render with concise descriptions and evidence links. |
| ContextZip demo | The Demo action opens the dedicated page, whose title, heading, repository action, architecture story, and tool evidence render. |
| Contact | Contact actions remain outside the hero and are reachable. |
| External links | New-tab links include `noopener noreferrer`. |

## Responsive checkpoints

- Mobile: primary hero content stays in the first viewport and all critical controls remain usable.
- Tablet: cards, text, navigation, and actions remain within the viewport with no horizontal overflow.
- Desktop: content hierarchy, card grids, and fixed navigation remain stable.

For all three sizes, check clipping, overlap, awkward wrapping, hidden actions, broken scrolling, and horizontal overflow.

## Change rules

- A new user-visible behavior requires a new Playwright test and a matching feature contract.
- A removed behavior requires removing both its implementation and contract with an explanation in the PR.
- Copy changes must update relevant assertions without weakening factual checks.
- Link changes must assert the exact destination and safe new-tab attributes where applicable.
- Visual changes require reviewing Playwright failure screenshots at all affected viewport sizes.
- Skipped tests and bypassed hooks are release blockers.

## Pull request gate

Before opening or updating a PR:

1. Run `npm run verify:pr`.
2. Confirm every registered feature reports `PASS`.
3. Record the command and result in the PR body.
4. Attach or describe screenshot review when layout changed.
5. Wait for the GitHub Actions `E2E harness` check to pass before merge.

Branch protection should require a pull request and the `E2E harness` status check on `main` after this workflow is merged and its check name exists on GitHub.
