# Submission Notes

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
