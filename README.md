# venguard-itw — Playwright E2E Interview Test

## Submission Notes

### Assumptions

- GitHub UI is in English — locators are based on English aria-labels.
- The issue page goes through `/_graphql` for all write operations. That's why `waitForResponse` targets it rather than a REST endpoint.
- A `storageState` file is required for the browser session. No automated login flow was implemented. To generate one, run the following command, log in to GitHub in the browser that opens, then close it:
  ```bash
  npx playwright codegen --save-storage=storage-state.json https://github.com/login
  ```
  Then set `GITHUB_STORAGE_STATE=./storage-state.json` in your `.env`.

### Tradeoffs

- **`/_graphql` as response filter**: it's tied to GitHub's internals, but there's no REST signal to hook into for UI actions on the issue page.
- **No `_closeIssue` in test 3**: the issue is already closed by the test itself — adding a cleanup call there would be noise.

### Stability

The suite was run 10 consecutive times against a clean repo to verify absence of flakiness. All runs passed.

### Process

This exercise was completed using **Claude Code** as a pair-programming assistant, following a structured workflow:

1. **CLAUDE.md as a single source of truth** — The candidate brief (rules, constraints, expected patterns) was reformulated into a `CLAUDE.md` file at the root of the project. This gave the assistant full context at every step without having to repeat instructions.

2. **Incremental implementation with step-by-step review** — Each deliverable (helpers, then specs) was implemented incrementally. After each step I reviewed the output, corrected anything over-engineered, misunderstood, or unnecessarily complex, and validated alignment with the brief before moving on.

3. **Dedicated Playwright code review skill** — Once the implementation was complete, a custom code review skill focused on Playwright best practices was run against the suite. I analysed the findings and applied the relevant fixes.

4. **Final compliance check against the candidate brief** — A last pass was done specifically to verify that every rule defined in the brief (architecture, async patterns, locator priority, API-only assertions, helper encapsulation, cleanup) was respected before submission.

### What I would improve with another hour

- **`globalSetup` for `storageState`**: a script that logs in via the UI and saves the session automatically, so there's no manual step before running the suite.
- **Temporal assertions via `dayjs`**: `plugins/index.js` (provided in the base project) configures `dayjs` with `utc`, `timezone`, `isBetween`, and other plugins — but was never used. Given more time, I would have added assertions on the date fields returned by the API (`created_at`, `updated_at`, `closed_at`) — for example verifying that `closed_at` is after `created_at`, or that `updated_at` actually changed after an edit.

---

## Getting started

> **You are looking at the exercise repo. Here is what you need to do before writing a single line of test code.**

1. **Fork or clone this repository** into your own GitHub account.
2. **Create a temporary GitHub repository** that you own — this is the target your tests will run against.
3. **Create a fine-grained personal access token** scoped only to that repository with Issues read/write permissions.
4. **Copy `.env.example` to `.env`** and fill in your own values.
5. Run `npm install && npm run install:browsers`.
6. Run `npm run github:preflight` — it must pass before you write any test.

Never commit your `.env` file or any token. The `.gitignore` already excludes it.

> **The solution will be reviewed by cloning your fork and running it with a different `.env` pointing to a separate GitHub repository. If it only works with your specific credentials or your specific repo, it will fail review. Everything that varies must come from environment variables.**

---

## Context

[GitHub](https://github.com) is a real production platform with a stable web UI and a documented REST API.
For this exercise, the product under test is the GitHub Issues flow on a repository the candidate creates and controls.

| | URL |
|---|---|
| **UI** | https://github.com |
| **API base** | https://api.github.com |
| **API reference** | https://docs.github.com/en/rest/issues/issues |

---

## The exercise

Write an E2E test suite for an **issue lifecycle flow** on GitHub.

Candidate-facing brief: [docs/candidate-brief.md](docs/candidate-brief.md)

Local setup validation:

- `npm run github:discover`
- `npm run github:preflight`

A helper skeleton is provided in:

- `helpers/github/helpers.js`

The spec files are **not provided**. The candidate must create them.

---

## Deliverables

### 1. `helpers/github/helpers.js`

A domain helper file with at minimum.

**All functions here must use the GitHub REST API via the `request` fixture. None of them should touch the browser or the UI.**

| Function | API call |
|---|---|
| `_getIssueCreated(request, data)` | `POST /repos/{owner}/{repo}/issues` — creates an issue, returns the created object |
| `_getIssueData(request, issueNumber)` | `GET /repos/{owner}/{repo}/issues/{issue_number}` — fetches one issue |
| `_updateIssue(request, issueNumber, data)` | `PATCH /repos/{owner}/{repo}/issues/{issue_number}` — updates title, body, or state |
| `_getIssueComments(request, issueNumber)` | `GET /repos/{owner}/{repo}/issues/{issue_number}/comments` — fetches all comments |
| `_addIssueComment(request, issueNumber, body)` | `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` — adds a comment |
| `_closeIssue(request, issueNumber)` | `PATCH /repos/{owner}/{repo}/issues/{issue_number}` with `state: closed` — cleanup |

### 2. `tests/github/issues_.spec.js`

Three tests:

- `after creating an issue via UI, it should be visible in the UI`
- `after creating an issue via API, edit it and assert via API`
- `after creating an issue via API, close it and assert via API`

### 3. `tests/github/issues_comments_.spec.js`

Apply the same pattern to comments. The spec file contains a comment that guides you.

### 4. Configuration for the exercise

The candidate should configure these environment variables locally:

| Variable | Description |
|---|---|
| `GITHUB_OWNER` | Candidate-owned repository owner |
| `GITHUB_REPO` | Candidate-owned repository name |
| `GITHUB_TOKEN` | Candidate-owned token with issues read/write access on that repo |

Preferred UI-auth option:

| Variable | Description |
|---|---|
| `GITHUB_STORAGE_STATE` | Path to a Playwright storage state file for the candidate's authenticated GitHub session |

Strongly recommended for consistency:

1. Use an English-language GitHub session.
2. Use a temporary dedicated repository with Issues enabled.
3. Run `npm run github:preflight` locally before starting the full implementation.

---

## Architecture — non-negotiable rules

This project follows a **flat, zero-overhead architecture**. Every convention below is enforced during review.

### Structure

```js
// ✅ Correct
const { test, expect } = require('../../fixtures/fixtures.js')
const hlpPW   = require('../../helpers/pw/helpers.js')
const hlpXxx  = require('../../helpers/xxx/helpers.js')

test('after visiting [...] and doing X, Y should be Z', async ({ request, page, ids }) => {
  // 1. Create state via API
  // 2. Reuse your authenticated browser session
  // 3. Navigate
  // 4. UI interaction — always paired with waitForResponse
  // 5. Assert via API
})
```

```js
// ❌ Wrong — never use these
describe('...', () => {})
beforeEach(async () => {})
class GitHubPage {}          // no Page Object Model
```

### Waiting — always pair network-triggering actions with `waitForResponse`

```js
// ✅ Correct — atomic, race-free
await Promise.all([
  page.waitForResponse(r => r.url().includes('/issues') && r.status() === 200),
  page.getByRole('button', { name: 'Save' }).click()
])

// ❌ Wrong — race condition
await page.getByRole('button', { name: 'Save' }).click()
await page.waitForResponse('/issues')

// ❌ Never
await page.waitForTimeout(2000)
```

### Locators — semantic priority order

| Priority | Method | Use when |
|---|---|---|
| 1 | `getByRole(role, { name })` | Buttons, links, inputs, headings, dialogs |
| 2 | `getByLabel('...')` | Form fields with a `<label>` |
| 3 | `getByPlaceholder('...')` | Inputs with a placeholder but no label |
| 4 | `getByText('...')` | Non-interactive display elements |
| 5 | `getByTestId('...')` | Elements with `data-testid` |
| last | `locator('[class*="..."]')` | **Never** — classes change |

```js
// ✅
page.scanDOM()
page.getByRole('button', { name: '...' })
page.getByPlaceholder('...')
page.getByRole('link', { name: 'Issues' })

// ❌
page.locator('.js-issue-row')
page.locator('button:has-text("Save")')
page.locator('>> nth=0')     // use .first() instead
```

### Assertions — always via API, never via UI

```js
// ✅ Stable — API contract
const issue = await hlpGitHub._getIssueData(request, issueNumber)
expect(issue.title).toBe('My New Issue')
expect(issue.state).toBe('closed')

// ❌ Fragile — UI text changes
await expect(page.getByText('My New Issue')).toBeVisible()
```

### Helpers — never duplicate API logic

```js
// ✅ Reuse
const issue = await hlpGitHub._getIssueCreated(request, data)

// ❌ Never inline API calls in test files
const res = await request.post('https://api.github.com/repos/OWNER/REPO/issues')
```

---

## Available utilities

### `helpers/pw/helpers.js`

```js
const hlpPW = require('../../helpers/pw/helpers.js')

const letters = await hlpPW.getRandomLetters(10)   // e.g. 'xkqmwfrbjz' — use for unique test data
const num     = await hlpPW.getRandomNumber(1, 100) // e.g. 42
```

### `plugins/index.js`

Pre-configured [dayjs](https://day.js.org/) instance with utc, timezone, customParseFormat, duration, isBetween.

```js
const dayjs = require('../../plugins/index.js')
dayjs.utc('2025-01-01').format('DD/MM/YYYY')  // '01/01/2025'
```

### `fixtures/fixtures.js`

Extended `test` with two additional fixtures:

**`page.scanDOM()`** — call it anywhere in a test, run, copy the printed locators, remove the call.

```js
await page.goto('/')
await page.scanDOM()   // prints all links, buttons, inputs, testIds to stdout
```

**`ids`** — annotates resource IDs for debugging on failure.

```js
test('...', async ({ request, page, ids }) => {
  const issue = await hlpGitHub._getIssueCreated(request, data)
  ids.set({ issue_number: issue.number })   // shows up in test report on failure
})
```

---

## Running tests

```bash
npm install
npm run install:browsers
npm run run                         # all tests
export GITHUB_OWNER='your-github-login-or-org'
export GITHUB_REPO='your-temporary-exercise-repo'
export GITHUB_TOKEN='your-local-scoped-token'
export GITHUB_STORAGE_STATE='path/to/your/storage-state.json'  # optional
npm run github:discover
npm run github:preflight
npx playwright test tests/github/issues_.spec.js   # single file
npx playwright test --headed        # with browser visible
```

---

## Evaluation criteria

| Criterion | What we look for |
|---|---|
| Architecture | Flat `test()`, no `describe`, no POM, inline setup |
| Async | `Promise.all([waitForResponse, action])` — no `waitForTimeout` |
| Locators | Semantic (`getByRole`, `getByLabel`, `getByPlaceholder`) |
| Assertions | API-based (`_getIssueData`, `_getIssueComments`) — not `toBeVisible()` |
| Helpers | Domain logic in `helpers/github/helpers.js`, not inline |
| Auth | Sensible handling of the candidate's own GitHub token and browser session |
| Cleanup | Issues closed via API at end of each test |

